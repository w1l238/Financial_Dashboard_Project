"""
test_users.py — Integration tests for the user preferences endpoints.
Created: 2026-03-23
Purpose: Validates CRUD operations on tickers, weather locations, and settings
for authenticated users. Uses the auth_client fixture from conftest.py.
"""

from fastapi.testclient import TestClient


def _auth_headers(token: str) -> dict:
    """Helper: returns the Authorization header dict for a given token."""
    return {"Authorization": f"Bearer {token}"}


# --- /api/users/me ---


def test_get_user_preferences_authenticated(auth_client):
    """Authenticated user should get their preferences including role and empty lists."""
    client, token, _ = auth_client
    response = client.get("/api/users/me", headers=_auth_headers(token))
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "testuser"
    assert "tracked_stocks" in data
    assert "weather_locations" in data


def test_get_user_preferences_unauthenticated(client: TestClient):
    """Accessing /me without a token should return 401 Unauthorized."""
    response = client.get("/api/users/me")
    assert response.status_code == 401


# --- Stock tickers ---


def test_add_stock_ticker(auth_client):
    """Adding a new ticker should return the updated user prefs including that ticker."""
    client, token, _ = auth_client
    response = client.post(
        "/api/users/me/stocks", json={"symbol": "TSLA"}, headers=_auth_headers(token)
    )
    assert response.status_code == 200
    symbols = [s["symbol"] for s in response.json()["tracked_stocks"]]
    assert "TSLA" in symbols


def test_add_stock_ticker_is_uppercased(auth_client):
    """Ticker symbols should be stored in uppercase regardless of input case."""
    client, token, _ = auth_client
    client.post(
        "/api/users/me/stocks", json={"symbol": "aapl"}, headers=_auth_headers(token)
    )
    response = client.get("/api/users/me", headers=_auth_headers(token))
    symbols = [s["symbol"] for s in response.json()["tracked_stocks"]]
    assert "AAPL" in symbols


def test_add_duplicate_stock_ticker_is_idempotent(auth_client):
    """Adding the same ticker twice should succeed and not create a duplicate entry."""
    client, token, _ = auth_client
    client.post(
        "/api/users/me/stocks", json={"symbol": "MSFT"}, headers=_auth_headers(token)
    )
    response = client.post(
        "/api/users/me/stocks", json={"symbol": "MSFT"}, headers=_auth_headers(token)
    )
    assert response.status_code == 200
    symbols = [s["symbol"] for s in response.json()["tracked_stocks"]]
    assert symbols.count("MSFT") == 1


def test_remove_stock_ticker(auth_client):
    """Removing a tracked ticker should return prefs without that ticker."""
    client, token, _ = auth_client
    # Add first
    client.post(
        "/api/users/me/stocks", json={"symbol": "NVDA"}, headers=_auth_headers(token)
    )
    # Then remove
    response = client.delete("/api/users/me/stocks/NVDA", headers=_auth_headers(token))
    assert response.status_code == 200
    symbols = [s["symbol"] for s in response.json()["tracked_stocks"]]
    assert "NVDA" not in symbols


# --- Weather locations ---


def test_add_weather_location(auth_client):
    """Adding a city should return updated prefs containing that city."""
    client, token, _ = auth_client
    response = client.post(
        "/api/users/me/weather",
        json={"city_name": "Paris, FR", "is_primary": False},
        headers=_auth_headers(token),
    )
    assert response.status_code == 200
    cities = [w["city_name"] for w in response.json()["weather_locations"]]
    assert "Paris, FR" in cities


def test_remove_weather_location(auth_client):
    """Removing a weather location by ID should return prefs without that location."""
    client, token, _ = auth_client
    # Add location first
    add_resp = client.post(
        "/api/users/me/weather",
        json={"city_name": "Berlin, DE", "is_primary": False},
        headers=_auth_headers(token),
    )
    assert add_resp.status_code == 200
    location_id = add_resp.json()["weather_locations"][0]["id"]

    # Remove by ID
    response = client.delete(
        f"/api/users/me/weather/{location_id}", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    cities = [w["city_name"] for w in response.json()["weather_locations"]]
    assert "Berlin, DE" not in cities


# --- Settings ---


def test_update_theme(auth_client):
    """Updating theme to 'dark' should persist and be reflected in /me."""
    client, token, _ = auth_client
    response = client.patch(
        "/api/users/me/theme?theme=dark", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["theme"] == "dark"


def test_update_units_to_imperial(auth_client):
    """Updating units to 'imperial' should persist."""
    client, token, _ = auth_client
    response = client.patch(
        "/api/users/me/units?units=imperial", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["preferred_units"] == "imperial"


def test_update_currency(auth_client):
    """Updating preferred currency should persist and be reflected in /me."""
    client, token, _ = auth_client
    response = client.patch(
        "/api/users/me/currency?currency=EUR", headers=_auth_headers(token)
    )
    assert response.status_code == 200
    assert response.json()["preferred_currency"] == "EUR"


def test_update_weather_enabled_toggle(auth_client):
    """Toggling weather off and on should persist correctly."""
    client, token, _ = auth_client
    # Disable weather
    off_resp = client.patch(
        "/api/users/me/weather-enabled?enabled=false", headers=_auth_headers(token)
    )
    assert off_resp.status_code == 200
    assert off_resp.json()["weather_enabled"] is False

    # Re-enable weather
    on_resp = client.patch(
        "/api/users/me/weather-enabled?enabled=true", headers=_auth_headers(token)
    )
    assert on_resp.status_code == 200
    assert on_resp.json()["weather_enabled"] is True
