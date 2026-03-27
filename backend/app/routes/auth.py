from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.auth import get_password_hash, verify_password, create_access_token
from app.core.config import settings
from app.models.user_preferences import User, StockTicker, WeatherLocation
from app.schemas.auth import Token, UserRegister
from app.schemas.user_preferences import UserResponse

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse)
def register_user(user_in: UserRegister, db: Session = Depends(get_db)):
    """Registers a new user and sets up default dashboard preferences."""
    if not settings.ALLOW_REGISTRATION:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently disabled."
        )
    # Check if user already exists
    user = db.query(User).filter(User.username == user_in.username).first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Create new user with hashed password
    hashed_password = get_password_hash(user_in.password)
    
    # First user becomes admin automatically
    is_first_user = db.query(User).count() == 0
    role = "admin" if is_first_user else "user"
    
    new_user = User(username=user_in.username, hashed_password=hashed_password, role=role)
    db.add(new_user)
    db.flush()  # Assign new_user.id before using it in related objects

    # For new users, pre-populate with default stocks and a weather location
    if is_first_user or not db.query(StockTicker).filter_by(user_id=new_user.id).first():
        default_stocks = [
            StockTicker(user_id=new_user.id, symbol="AAPL"),
            StockTicker(user_id=new_user.id, symbol="GOOGL"),
            StockTicker(user_id=new_user.id, symbol="MSFT"),
        ]
        db.add_all(default_stocks)

    if is_first_user or not db.query(WeatherLocation).filter_by(user_id=new_user.id).first():
        default_weather = WeatherLocation(user_id=new_user.id, city_name="New York, NY, US")
        db.add(default_weather)

    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """Authenticates a user and issues a JWT access token."""
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Generate JWT token
    access_token = create_access_token(data={"sub": user.username, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}
