from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class User(Base):
    """
    User model for storing individual profile and dashboard configuration.
    Currently focuses on UI preferences.
    """

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    hashed_password = Column(String)
    full_name = Column(String, nullable=True)
    role = Column(String, default="user")  # 'user' or 'admin'
    theme = Column(String, default="light")  # 'light' or 'dark'
    preferred_units = Column(String, default="metric")  # 'metric' or 'imperial'
    preferred_currency = Column(String, default="USD")
    weather_enabled = Column(Boolean, default=True)

    # Relationships for preferences
    tracked_stocks = relationship(
        "StockTicker", back_populates="user", cascade="all, delete-orphan"
    )
    weather_locations = relationship(
        "WeatherLocation", back_populates="user", cascade="all, delete-orphan"
    )


class StockTicker(Base):
    """
    Model for stock symbols a user chooses to track on their dashboard.
    """

    __tablename__ = "stock_tickers"

    id = Column(Integer, primary_key=True, index=True)
    symbol = Column(String, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="tracked_stocks")


class WeatherLocation(Base):
    """
    Model for locations (cities) a user chooses to track for weather updates.
    """

    __tablename__ = "weather_locations"

    id = Column(Integer, primary_key=True, index=True)
    city_name = Column(String, index=True)
    is_primary = Column(Boolean, default=False)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="weather_locations")
