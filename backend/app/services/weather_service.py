import httpx
import time
import threading
from typing import Dict, Any, List
from app.core.config import settings
from fastapi import HTTPException
import logging
from cachetools import TTLCache

# Configure logging for performance tracking
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class WeatherService:
    """
    Service class responsible for interacting with external weather APIs.
    Handles asynchronous data fetching, error processing, and performance monitoring.
    """

    def __init__(self):
        """
        Initializes the WeatherService with a persistent httpx AsyncClient and TTL caches.
        """
        self.client = httpx.AsyncClient(base_url=settings.OPENWEATHER_BASE_URL)
        # Cache current weather for 10 minutes — updates infrequently enough
        self._current_cache: TTLCache = TTLCache(maxsize=100, ttl=600)
        # Cache forecasts for 30 minutes — 5-day forecast changes slowly
        self._forecast_cache: TTLCache = TTLCache(maxsize=100, ttl=1800)
        self._cache_lock = threading.Lock()

    async def get_current_weather(
        self, city: str, units: str = "metric"
    ) -> Dict[str, Any]:
        """
        Fetches real-time weather data for a specified location with performance tracking.
        Results are cached for 10 minutes per (city, units) pair.
        """
        cache_key = (city.lower(), units)
        with self._cache_lock:
            if cache_key in self._current_cache:
                return self._current_cache[cache_key]

        start_time = time.perf_counter()

        if not settings.OPENWEATHER_API_KEY:
            raise HTTPException(
                status_code=503, detail="Weather service unavailable: OPENWEATHER_API_KEY is not configured."
            )

        params = {"q": city, "APPID": settings.OPENWEATHER_API_KEY, "units": units}

        try:
            # OpenWeatherMap uses /weather as the relative path from the base URL
            response = await self.client.get("/weather", params=params)
            latency = (time.perf_counter() - start_time) * 1000

            # Log the request for debugging (without the key)
            logger.info(f"Requesting weather for {city} via {response.url}")

            if response.status_code == 401:
                logger.error(
                    "Weather API Error: Unauthorized (401). Check if your API key is correct and active."
                )

            response.raise_for_status()
            data = response.json()

            # Validate Data Integrity
            self._validate_weather_data(data)

            data["latency_ms"] = round(latency, 2)

            with self._cache_lock:
                self._current_cache[cache_key] = data
            return data

        except httpx.HTTPStatusError as e:
            raise HTTPException(
                status_code=e.response.status_code,
                detail=f"Weather API error: {e.response.text}",
            )
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=503, detail=f"Weather service unavailable: {str(e)}"
            )

    async def get_forecast(self, city: str, units: str = "metric") -> Dict[str, Any]:
        """
        Fetches 5-day/3-hour forecast data for a specified location.
        Results are cached for 30 minutes per (city, units) pair.
        """
        cache_key = (city.lower(), units)
        with self._cache_lock:
            if cache_key in self._forecast_cache:
                return self._forecast_cache[cache_key]

        if not settings.OPENWEATHER_API_KEY:
            raise HTTPException(
                status_code=503, detail="Weather service unavailable: OPENWEATHER_API_KEY is not configured."
            )

        params = {"q": city, "APPID": settings.OPENWEATHER_API_KEY, "units": units}

        try:
            # Forecast endpoint is /forecast
            response = await self.client.get("/forecast", params=params)
            response.raise_for_status()
            data = response.json()

            with self._cache_lock:
                self._forecast_cache[cache_key] = data
            return data
        except Exception as e:
            logger.error(f"Forecast API Error: {str(e)}")
            return self._get_mock_forecast(city, units)

    async def search_cities(self, query: str) -> List[Dict[str, Any]]:
        """
        Searches for valid city names using the OpenWeatherMap Geocoding API.
        """
        if not settings.OPENWEATHER_API_KEY or len(query) < 2:
            return []

        params = {"q": query, "limit": 5, "APPID": settings.OPENWEATHER_API_KEY}

        try:
            # Geocoding API uses a different path/domain but our client base is OWM
            response = await self.client.get(
                "http://api.openweathermap.org/geo/1.0/direct", params=params
            )
            response.raise_for_status()
            locations = response.json()

            return [
                {
                    "name": loc.get("name"),
                    "full_name": f"{loc.get('name')}{', ' + loc.get('state') if loc.get('state') else ''}, {loc.get('country')}",
                }
                for loc in locations
            ]
        except Exception as e:
            logger.error(f"Geocoding API Error: {str(e)}")
            return []

    def _validate_weather_data(self, data: Dict[str, Any]) -> None:
        """
        Validates the structure and integrity of the API response.
        """
        required_fields = ["main", "weather", "name"]
        for field in required_fields:
            if field not in data:
                logger.error(f"Incomplete weather data: missing {field}")
                raise HTTPException(
                    status_code=502,
                    detail="Received incomplete data from weather provider",
                )

        if not isinstance(data["main"].get("temp"), (int, float)):
            logger.error("Data Integrity Error: Temperature is not a number")
            raise HTTPException(
                status_code=502, detail="Weather data integrity check failed"
            )

    def _get_mock_weather(self, city: str, units: str) -> Dict[str, Any]:
        """
        Provides mock weather data for development when API keys are unavailable.
        """
        temp = 22.5 if units == "metric" else 72.5
        return {
            "name": city,
            "main": {"temp": temp, "humidity": 65, "pressure": 1012},
            "weather": [
                {
                    "main": "Pending API",
                    "description": "fill your api key",
                    "icon": "01d",
                }
            ],
            "units": units,
            "is_mock": True,
        }

    def _get_mock_forecast(self, city: str, units: str) -> Dict[str, Any]:
        """
        Provides dummy forecast data for the extended forecast view.
        """
        import datetime

        temp_base = 22.5 if units == "metric" else 72.5
        list_data = []
        for i in range(5):
            date = datetime.datetime.now() + datetime.timedelta(days=i)
            list_data.append(
                {
                    "dt_txt": date.strftime("%Y-%m-%d 12:00:00"),
                    "main": {"temp": temp_base + i, "humidity": 60},
                    "weather": [{"main": "Clear", "icon": "01d"}],
                }
            )
        return {"city": {"name": city}, "list": list_data, "is_mock": True}


# Global singleton instance of the service
weather_service = WeatherService()
