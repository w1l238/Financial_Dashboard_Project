from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_current_user
from app.models.user_preferences import User, StockTicker, WeatherLocation
from app.schemas.user_preferences import (
    UserResponse,
    StockTickerCreate,
    WeatherLocationCreate,
)

router = APIRouter(prefix="/api/users", tags=["User Preferences"])


@router.get("/me", response_model=UserResponse)
async def get_user_preferences(current_user: User = Depends(get_current_user)):
    """
    Fetches the profile and dashboard preferences of the authenticated user.
    """
    return current_user


@router.post("/me/stocks", response_model=UserResponse)
async def add_stock_ticker(
    ticker: StockTickerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds a new stock symbol to the current user's tracking list.
    """
    # Check if already tracked by this user
    if any(s.symbol == ticker.symbol.upper() for s in current_user.tracked_stocks):
        return current_user

    new_ticker = StockTicker(symbol=ticker.symbol.upper(), user_id=current_user.id)
    db.add(new_ticker)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/stocks/{symbol}", response_model=UserResponse)
async def remove_stock_ticker(
    symbol: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Removes a stock symbol from the tracking list of the authenticated user.
    """
    ticker = (
        db.query(StockTicker)
        .filter(
            StockTicker.user_id == current_user.id, StockTicker.symbol == symbol.upper()
        )
        .first()
    )

    if ticker:
        db.delete(ticker)
        db.commit()
        db.refresh(current_user)
    return current_user


@router.post("/me/weather", response_model=UserResponse)
async def add_weather_location(
    location: WeatherLocationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Adds a new city to the current user's weather dashboard.
    """
    if any(
        w.city_name.lower() == location.city_name.lower()
        for w in current_user.weather_locations
    ):
        return current_user

    new_loc = WeatherLocation(
        city_name=location.city_name,
        is_primary=location.is_primary,
        user_id=current_user.id,
    )
    db.add(new_loc)
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/me/weather/{location_id}", response_model=UserResponse)
async def remove_weather_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Removes a weather location from the current user's dashboard by its ID.
    """
    location = (
        db.query(WeatherLocation)
        .filter(
            WeatherLocation.user_id == current_user.id,
            WeatherLocation.id == location_id,
        )
        .first()
    )

    if location:
        db.delete(location)
        db.commit()
        db.refresh(current_user)
    return current_user


@router.patch("/me/theme", response_model=UserResponse)
async def update_theme(
    theme: str = Query(..., enum=["light", "dark"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the UI theme preference of the authenticated user.
    """
    current_user.theme = theme
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/units", response_model=UserResponse)
async def update_units(
    units: str = Query(..., enum=["metric", "imperial"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the preferred measurement units of the authenticated user.
    """
    current_user.preferred_units = units
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/currency", response_model=UserResponse)
async def update_currency(
    currency: str = Query(..., enum=["USD", "EUR", "GBP", "JPY"]),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Updates the preferred stock currency for the authenticated user.
    """
    current_user.preferred_currency = currency
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/me/weather-enabled", response_model=UserResponse)
async def update_weather_enabled(
    enabled: bool = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Toggles the weather functionality on or off for the authenticated user.
    """
    current_user.weather_enabled = enabled
    db.commit()
    db.refresh(current_user)
    return current_user
