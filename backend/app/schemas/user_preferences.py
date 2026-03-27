from pydantic import BaseModel, ConfigDict
from typing import List, Optional


# --- StockTicker Schemas ---
class StockTickerBase(BaseModel):
    symbol: str


class StockTickerCreate(StockTickerBase):
    pass


class StockTickerResponse(StockTickerBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


# --- WeatherLocation Schemas ---
class WeatherLocationBase(BaseModel):
    city_name: str
    is_primary: bool = False


class WeatherLocationCreate(WeatherLocationBase):
    pass


class WeatherLocationResponse(WeatherLocationBase):
    id: int
    user_id: int
    model_config = ConfigDict(from_attributes=True)


# --- User Schemas ---
class UserBase(BaseModel):
    username: str
    full_name: Optional[str] = None
    role: str = "user"
    theme: str = "light"
    preferred_units: str = "metric"
    preferred_currency: str = "USD"
    weather_enabled: bool = True


class UserCreate(UserBase):
    pass


class UserUpdateAdmin(BaseModel):
    """Schema for admin to update any user field, including password and role."""

    username: Optional[str] = None
    full_name: Optional[str] = None
    password: Optional[str] = None
    current_password: Optional[str] = None
    role: Optional[str] = None
    theme: Optional[str] = None
    preferred_units: Optional[str] = None
    preferred_currency: Optional[str] = None
    weather_enabled: Optional[bool] = None


class UserResponse(UserBase):
    id: int
    tracked_stocks: List[StockTickerResponse] = []
    weather_locations: List[WeatherLocationResponse] = []
    model_config = ConfigDict(from_attributes=True)
