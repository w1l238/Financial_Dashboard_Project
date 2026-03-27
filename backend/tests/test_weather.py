"""
test_weather.py — Integration tests for the weather endpoints.
Created: 2026-03-23
Purpose: Validates current weather, forecast, and city search endpoints using
mocked service calls so tests run without hitting the OpenWeatherMap API.
"""

from unittest.mock import AsyncMock, patch
from fastapi import HTTPException
from fastapi.testclient import TestClient


# --- Fake response data ---

FAKE_WEATHER = {
    "name": "London",
    "main": {"temp": 15.5, "humidity": 72, "pressure": 1015},
    "weather": [{"main": "Clouds", "description": "overcast clouds", "icon": "04d"}],
    "wind": {"speed": 5.2},
    "latency_ms": 120.5,
}

FAKE_FORECAST = {
    "city": {"name": "London"},
    "list": [
        {
            "dt_txt": "2024-03-20 12:00:00",
            "main": {"temp": 14.0, "humidity": 70, "pressure": 1013},
            "weather": [{"main": "Clear", "description": "clear sky"}],
            "wind": {"speed": 4.1},
        }
    ],
}

FAKE_CITIES = [
    {"name": "Tokyo", "full_name": "Tokyo, Tokyo, JP"},
    {"name": "Toronto", "full_name": "Toronto, Ontario, CA"},
]


def test_get_current_weather_valid_city(client: TestClient):
    """A valid city query should return 200 with weather data."""
    with patch(
        "app.routes.weather.weather_service.get_current_weather",
        new_callable=AsyncMock,
        return_value=FAKE_WEATHER,
    ):
        response = client.get("/api/weather/", params={"city": "London"})
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "London"
    assert "main" in data
    assert "temp" in data["main"]


def test_get_current_weather_missing_api_key(client: TestClient):
    """When the API key is not configured, the endpoint should return 401."""
    with patch(
        "app.routes.weather.weather_service.get_current_weather",
        new_callable=AsyncMock,
        side_effect=HTTPException(
            status_code=401, detail="OpenWeather API key is missing."
        ),
    ):
        response = client.get("/api/weather/", params={"city": "London"})
    assert response.status_code == 401


def test_get_current_weather_unknown_city(client: TestClient):
    """An unknown city name should propagate the 404 from the weather service."""
    with patch(
        "app.routes.weather.weather_service.get_current_weather",
        new_callable=AsyncMock,
        side_effect=HTTPException(status_code=404, detail="City not found"),
    ):
        response = client.get("/api/weather/", params={"city": "Atlantis"})
    assert response.status_code == 404


def test_get_forecast_valid_city(client: TestClient):
    """Forecast endpoint for a valid city should return 200 with a list of forecasts."""
    with patch(
        "app.routes.weather.weather_service.get_forecast",
        new_callable=AsyncMock,
        return_value=FAKE_FORECAST,
    ):
        response = client.get("/api/weather/forecast", params={"city": "London"})
    assert response.status_code == 200
    data = response.json()
    assert "list" in data
    assert isinstance(data["list"], list)


def test_get_current_weather_defaults_to_metric(client: TestClient):
    """When no units param is provided, the service should be called with 'metric'."""
    with patch(
        "app.routes.weather.weather_service.get_current_weather",
        new_callable=AsyncMock,
        return_value=FAKE_WEATHER,
    ) as mock_service:
        client.get("/api/weather/", params={"city": "London"})
    mock_service.assert_called_once_with(city="London", units="metric")


def test_search_cities_returns_suggestions(client: TestClient):
    """City search with a valid query should return a list of suggestions."""
    with patch(
        "app.routes.weather.weather_service.search_cities",
        new_callable=AsyncMock,
        return_value=FAKE_CITIES,
    ):
        response = client.get("/api/weather/search", params={"q": "To"})
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 2
    assert data[0]["name"] == "Tokyo"


def test_search_cities_query_too_short(client: TestClient):
    """City search with a single character should return 422 (min_length=2)."""
    response = client.get("/api/weather/search", params={"q": "L"})
    assert response.status_code == 422
