from fastapi import APIRouter, Query, HTTPException
from typing import Dict, Any
from app.services.weather_service import weather_service
from app.core.config import settings

router = APIRouter(prefix="/api/weather", tags=["Weather Information"])


@router.get("/")
async def get_weather(
    city: str = Query(
        ..., description="Name of the city to fetch weather for (e.g., 'London')"
    ),
    units: str = Query(
        None, description="Temperature measurement system ('metric', 'imperial')"
    ),
) -> Dict[str, Any]:
    """
    Retrieves real-time weather information for a given city.

    Args:
        city (str): The location for weather updates.
        units (str): The desired measurement units.

    Returns:
        Dict[str, Any]: Aggregated weather data from OpenWeatherMap.
    """
    try:
        data = await weather_service.get_current_weather(
            city=city, units=units or "metric"
        )
        return data
    except HTTPException as e:
        # Proper error handling as mandated in Phase 1.1
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/status")
async def weather_status() -> Dict[str, bool]:
    """
    Returns whether the OpenWeather API key is configured on the backend.
    Used by the frontend to disable weather features when the key is absent.
    """
    return {"api_key_configured": bool(settings.OPENWEATHER_API_KEY)}


@router.get("/forecast")
async def get_forecast(
    city: str = Query(..., description="Name of the city to fetch forecast for"),
    units: str = Query(
        None, description="Temperature measurement system ('metric', 'imperial')"
    ),
) -> Dict[str, Any]:
    """
    Retrieves 5-day weather forecast information for a given city.
    """
    try:
        return await weather_service.get_forecast(city=city, units=units or "metric")
    except HTTPException as e:
        raise e
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error: {str(e)}")


@router.get("/search")
async def search_cities(
    q: str = Query(..., min_length=2, description="Search query for city names"),
):
    """
    Searches for valid cities based on a text query.
    Used for autocomplete in the frontend.
    """
    return await weather_service.search_cities(q)
