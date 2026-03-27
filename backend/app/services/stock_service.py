import yfinance as yf
from typing import Dict, Any, Optional
from fastapi import HTTPException
import asyncio
from concurrent.futures import ThreadPoolExecutor
import threading
import os
import sys
from cachetools import TTLCache

# Ensure the C++ engine directory is in the path for importing the compiled module
engine_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "engine")
if engine_path not in sys.path:
    sys.path.append(engine_path)

try:
    import indicators

    HAS_CPP_ENGINE = True
except ImportError:
    print(
        "Warning: C++ indicators module not found. Technical analysis will be disabled."
    )
    HAS_CPP_ENGINE = False


class StockService:
    """
    Service class responsible for retrieving stock market data and
    calculating technical indicators using a high-performance C++ engine.
    """

    # yfinance valid periods: 1d, 5d, 1mo, 3mo, 6mo, 1y, 2y, 5y, 10y, ytd, max
    VALID_PERIODS = {
        "5d": "5d",
        "1mo": "1mo",
        "3mo": "3mo",
        "6mo": "6mo",
        "1y": "1y",
        "5y": "5y",
        "max": "max",
    }

    def __init__(self):
        """
        Initializes the StockService with a ThreadPoolExecutor and TTL caches.
        TTLCache is not thread-safe, so a lock is used to protect concurrent access
        from the ThreadPoolExecutor workers.
        """
        self.executor = ThreadPoolExecutor(max_workers=10)
        # Cache real-time prices for 30 seconds to avoid hammering yfinance
        self._price_cache: TTLCache = TTLCache(maxsize=200, ttl=30)
        # Cache historical data for 5 minutes — changes infrequently
        self._history_cache: TTLCache = TTLCache(maxsize=100, ttl=300)
        self._cache_lock = threading.Lock()

    async def get_stock_price(
        self, ticker: str, target_currency: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Fetches current real-time stock price and metadata, with optional currency conversion.
        Results are cached for 30 seconds per (ticker, currency) pair.
        """
        cache_key = (ticker.upper(), (target_currency or "").upper())
        with self._cache_lock:
            if cache_key in self._price_cache:
                return self._price_cache[cache_key]

        loop = asyncio.get_event_loop()
        try:
            data = await loop.run_in_executor(
                self.executor, self._fetch_ticker_info, ticker
            )

            if target_currency and target_currency.upper() != data["currency"].upper():
                rate = await self.get_exchange_rate(data["currency"], target_currency)
                data["price"] = round(data["price"] * rate, 2)
                if data.get("change"):
                    data["change"] = round(data["change"] * rate, 2)
                data["currency"] = target_currency.upper()

            with self._cache_lock:
                self._price_cache[cache_key] = data
            return data
        except Exception as e:
            raise HTTPException(
                status_code=404, detail=f"Stock ticker '{ticker}' not found: {str(e)}"
            )

    async def get_exchange_rate(self, base: str, target: str) -> float:
        """
        Fetches the current exchange rate between two currencies using yfinance.
        """
        if base.upper() == target.upper():
            return 1.0

        loop = asyncio.get_event_loop()
        pair = f"{base}{target}=X"
        try:
            rate_data = await loop.run_in_executor(
                self.executor, lambda: yf.Ticker(pair).info
            )
            # yfinance FX info often puts the rate in 'previousClose' or 'regularMarketPrice'
            rate = rate_data.get("regularMarketPrice") or rate_data.get("previousClose")
            if not rate:
                # Fallback: try reverse pair
                pair_rev = f"{target}{base}=X"
                rate_data_rev = await loop.run_in_executor(
                    self.executor, lambda: yf.Ticker(pair_rev).info
                )
                rate_rev = rate_data_rev.get("regularMarketPrice") or rate_data_rev.get(
                    "previousClose"
                )
                if rate_rev:
                    return 1.0 / rate_rev
                raise ValueError(f"Could not fetch exchange rate for {pair}")
            return rate
        except Exception as e:
            print(f"Exchange rate error: {e}")
            return 1.0  # Fallback to 1.0 to avoid crashing

    def _fetch_ticker_info(self, ticker: str) -> Dict[str, Any]:
        stock = yf.Ticker(ticker)
        info = stock.info

        if not info or (
            "regularMarketPrice" not in info and "currentPrice" not in info
        ):
            raise ValueError(f"No price data available for {ticker}")

        return {
            "symbol": ticker.upper(),
            "name": info.get("longName", ticker),
            "price": info.get("currentPrice") or info.get("regularMarketPrice"),
            "currency": info.get("currency", "USD"),
            "change": info.get("regularMarketChange"),
            "change_percent": info.get("regularMarketChangePercent"),
            "market_cap": info.get("marketCap"),
            "sector": info.get("sector"),
        }

    async def get_stock_history(
        self,
        ticker: str,
        period: str = "1mo",
        interval: str = "1d",
        target_currency: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Retrieves historical stock performance and calculates technical indicators, with optional currency conversion.
        Results are cached for 5 minutes per (ticker, period, interval, currency) combination.
        """
        cache_key = (ticker.upper(), period, interval, (target_currency or "").upper())
        with self._cache_lock:
            if cache_key in self._history_cache:
                return self._history_cache[cache_key]

        loop = asyncio.get_event_loop()
        try:
            history = await loop.run_in_executor(
                self.executor, self._fetch_ticker_history, ticker, period, interval
            )

            if (
                target_currency
                and target_currency.upper() != history["currency"].upper()
            ):
                rate = await self.get_exchange_rate(
                    history["currency"], target_currency
                )

                # Convert historical prices
                for point in history["history"]:
                    point["close"] = round(point["close"] * rate, 2)

                # Convert price-based technical indicators.
                # RSI and MACD histogram are dimensionless ratios — no conversion.
                if "analysis" in history:
                    price_based_keys = [
                        "sma_20",
                        "ema_20",
                        "bb_upper",
                        "bb_middle",
                        "bb_lower",
                        "macd",
                        "macd_signal",
                    ]
                    for key in price_based_keys:
                        if key in history["analysis"]:
                            history["analysis"][key] = [
                                round(x * rate, 2) for x in history["analysis"][key]
                            ]

                history["currency"] = target_currency.upper()

            with self._cache_lock:
                self._history_cache[cache_key] = history
            return history
        except Exception as e:
            raise HTTPException(
                status_code=404,
                detail=f"Could not retrieve history for {ticker}: {str(e)}",
            )

    def _fetch_ticker_history(
        self, ticker: str, period: str, interval: str
    ) -> Dict[str, Any]:
        mapped_period = self.VALID_PERIODS.get(period, "1mo")
        stock = yf.Ticker(ticker)
        df = stock.history(period=mapped_period, interval=interval)

        if df.empty:
            raise ValueError(f"No history data found for {ticker}")

        # If we requested a custom period that we mapped from a larger one,
        # we can slice the data here if needed, but for now we'll just return the mapped period.
        # e.g. for 3d we get 5d, which is usually acceptable.

        close_prices = df["Close"].tolist()
        info = stock.info

        analysis = {}
        # MACD requires at least 26 data points (slow EMA period); RSI requires 14.
        # Use the higher threshold so all indicators are computed together.
        if HAS_CPP_ENGINE and len(close_prices) > 26:
            # --- Existing indicators ---
            analysis["rsi"] = indicators.calculate_rsi(close_prices, 14)
            analysis["sma_20"] = indicators.calculate_sma(close_prices, 20)

            # --- New indicators added in Phase 2 ---
            # EMA-20: same length as input, overlaid on the price chart
            analysis["ema_20"] = indicators.calculate_ema(close_prices, 20)

            # Bollinger Bands (period=20, 2σ): returns upper/middle/lower bands
            bb = indicators.calculate_bollinger_bands(close_prices, 20, 2.0)
            analysis["bb_upper"] = list(bb["upper"])
            analysis["bb_middle"] = list(bb["middle"])
            analysis["bb_lower"] = list(bb["lower"])

            # MACD (12/26/9): returns macd line, signal line, and histogram
            macd = indicators.calculate_macd(close_prices, 12, 26, 9)
            analysis["macd"] = list(macd["macd"])
            analysis["macd_signal"] = list(macd["signal"])
            analysis["macd_hist"] = list(macd["histogram"])

        return {
            "symbol": ticker.upper(),
            "currency": info.get("currency", "USD"),
            "history": [
                {
                    "date": str(date.date())
                    if interval in ["1d", "1wk", "1mo"]
                    else str(date),
                    "close": round(row["Close"], 2),
                    "volume": int(row["Volume"]),
                }
                for date, row in df.iterrows()
            ],
            "analysis": analysis,
            "engine": "C++" if HAS_CPP_ENGINE else "Python-Standard",
        }


# Global singleton instance of the service
stock_service = StockService()
