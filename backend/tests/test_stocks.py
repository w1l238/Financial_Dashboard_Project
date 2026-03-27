"""
test_stocks.py — Integration tests for the stock market endpoints.
Created: 2026-03-23
Purpose: Validates stock price and history endpoints using mocked service
calls so tests run without hitting yfinance or external networks.
"""

from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient


# --- Fake response data ---

FAKE_STOCK_PRICE = {
    "symbol": "AAPL",
    "name": "Apple Inc.",
    "price": 195.50,
    "currency": "USD",
    "change": -1.20,
    "change_percent": -0.61,
    "market_cap": 3_000_000_000_000,
    "sector": "Technology",
}

FAKE_STOCK_HISTORY = {
    "symbol": "AAPL",
    "currency": "USD",
    "history": [
        {"date": "2024-01-01", "close": 190.00, "volume": 50_000_000},
        {"date": "2024-01-02", "close": 192.50, "volume": 48_000_000},
    ],
    "analysis": {"rsi": [50.0, 52.0], "sma_20": [189.0, 190.0]},
    "engine": "C++",
}


def test_get_stock_price_valid_symbol(client: TestClient):
    """A valid ticker symbol should return 200 with price data."""
    with patch(
        "app.routes.stocks.stock_service.get_stock_price",
        new_callable=AsyncMock,
        return_value=FAKE_STOCK_PRICE,
    ):
        response = client.get("/api/stocks/", params={"symbol": "AAPL"})
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert data["price"] == 195.50
    assert "currency" in data


def test_get_stock_price_invalid_symbol(client: TestClient):
    """An invalid ticker should return 404 Not Found."""
    with patch(
        "app.routes.stocks.stock_service.get_stock_price",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=404, detail="Ticker not found"),
    ):
        response = client.get("/api/stocks/", params={"symbol": "XYZINVALID123"})
    assert response.status_code == 404


def test_get_stock_price_with_currency_conversion(client: TestClient):
    """Currency conversion param should be forwarded and reflected in the response."""
    converted = {**FAKE_STOCK_PRICE, "price": 179.50, "currency": "EUR"}
    with patch(
        "app.routes.stocks.stock_service.get_stock_price",
        new_callable=AsyncMock,
        return_value=converted,
    ):
        response = client.get(
            "/api/stocks/", params={"symbol": "AAPL", "currency": "EUR"}
        )
    assert response.status_code == 200
    assert response.json()["currency"] == "EUR"


def test_get_stock_history_valid(client: TestClient):
    """Valid symbol and period should return history data with expected keys."""
    with patch(
        "app.routes.stocks.stock_service.get_stock_history",
        new_callable=AsyncMock,
        return_value=FAKE_STOCK_HISTORY,
    ):
        response = client.get(
            "/api/stocks/history", params={"symbol": "AAPL", "period": "1mo"}
        )
    assert response.status_code == 200
    data = response.json()
    assert data["symbol"] == "AAPL"
    assert "history" in data
    assert isinstance(data["history"], list)
    assert len(data["history"]) > 0


def test_get_stock_history_invalid_symbol(client: TestClient):
    """An invalid symbol in history endpoint should return 404."""
    with patch(
        "app.routes.stocks.stock_service.get_stock_history",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=404, detail="No history data"),
    ):
        response = client.get(
            "/api/stocks/history", params={"symbol": "XYZINVALID", "period": "1mo"}
        )
    assert response.status_code == 404


def test_get_stock_price_no_auth_required(client: TestClient):
    """The stock price endpoint should be publicly accessible without authentication."""
    with patch(
        "app.routes.stocks.stock_service.get_stock_price",
        new_callable=AsyncMock,
        return_value=FAKE_STOCK_PRICE,
    ):
        # No Authorization header — should still succeed
        response = client.get("/api/stocks/", params={"symbol": "AAPL"})
    assert response.status_code == 200


def test_get_stock_price_missing_symbol(client: TestClient):
    """Calling the endpoint without the required 'symbol' query param should return 422."""
    response = client.get("/api/stocks/")
    assert response.status_code == 422
