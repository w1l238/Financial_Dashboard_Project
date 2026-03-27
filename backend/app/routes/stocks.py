from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any, Optional
from app.services.stock_service import stock_service

router = APIRouter(prefix="/api/stocks", tags=["Stock Market Information"])


@router.get("/")
async def get_stock_price(
    symbol: str = Query(
        ..., description="Stock symbol (e.g., 'AAPL', 'MSFT', 'GOOGL')"
    ),
    currency: Optional[str] = Query(None, description="Target currency for conversion"),
) -> Dict[str, Any]:
    """
    Fetches real-time stock price and metadata for a given symbol.
    """
    try:
        data = await stock_service.get_stock_price(
            ticker=symbol, target_currency=currency
        )
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/history")
async def get_stock_history(
    symbol: str = Query(..., description="Stock symbol"),
    period: str = Query(
        "1mo", description="Historical period: 1d, 5d, 1mo, 1y, 5y, max"
    ),
    interval: str = Query(
        "1d", description="Data point interval: 1m, 1h, 1d, 1wk, 1mo"
    ),
    currency: Optional[str] = Query(None, description="Target currency for conversion"),
) -> Dict[str, Any]:
    """
    Retrieves historical price series for financial visualization.
    """
    try:
        data = await stock_service.get_stock_history(
            ticker=symbol, period=period, interval=interval, target_currency=currency
        )
        return data
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


@router.get("/search")
async def search_stocks(q: str = Query(..., min_length=1)):
    """
    Searches for valid ticker symbols using yfinance ticker suggestions.
    """
    import requests

    try:
        # Yahoo Finance Autocomplete API
        url = f"https://query2.finance.yahoo.com/v1/finance/search?q={q}&quotesCount=5"
        headers = {"User-Agent": "Mozilla/5.0"}
        res = requests.get(url, headers=headers)
        res.raise_for_status()
        data = res.json()

        return [
            {
                "symbol": quote.get("symbol"),
                "name": quote.get("shortname") or quote.get("longname"),
            }
            for quote in data.get("quotes", [])
            if quote.get("quoteType") in ["EQUITY", "ETF", "CRYPTOCURRENCY"]
        ]
    except Exception:
        return []
