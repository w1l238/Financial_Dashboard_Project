from pydantic import BaseModel, field_validator
from typing import Optional


class UserRegister(BaseModel):
    """Schema for new user registration."""

    username: str
    password: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v.encode("utf-8")) > 72:
            raise ValueError("Password must be 72 characters or fewer.")
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters.")
        return v


class Token(BaseModel):
    """Schema for JWT token response."""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Schema for payload data stored in the JWT."""

    username: Optional[str] = None
