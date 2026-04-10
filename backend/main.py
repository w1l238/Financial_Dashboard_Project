###
# Core API initialization: 
# - Sets up database & logging
# - Configures security/timing middleware & Rate Limiting
# - Mounts Auth, Weather, Stocks, Users, and Admin routers
###

# Imports
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from typing import Dict
import logging
import time

from app.routes import weather, stocks, users, auth, admin
from app.core.config import settings
from app.core.database import engine, Base

# DATABASE / LOGGING
# -------------------
# Sync database schema (create all tables defined in Base)
Base.metadata.create_all(bind=engine)

# Global logging config
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)

# Silence third-party logs (example: passlib version warnings)
logging.getLogger("passlib").setLevel(logging.ERROR)
# -----------------

# APP INIT
# ---------
# Initialize Rate Limiter using client IP address
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI app instance
app = FastAPI(
    title=settings.APP_NAME,
    description="A high-performance aggregation layer for weather and financial data.",
    version=settings.VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

# Attach limiter to app state
app.state.limiter = limiter

# Register global rate-limit error handler
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# MIDDLEWARE
# -----------

# Global interceptor for monitoring request duration and injecting security headers.
@app.middleware("http")
async def add_security_headers_and_timing(request: Request, call_next):
    start_time = time.time()
    try:
        response = await call_next(request)
    except Exception as exc:
        logger.error(f"Unhandled Exception: {exc}", exc_info=True)
        response = JSONResponse(
            status_code=500,
            content={"detail": "A critical system error occurred. Please try again later."},
        )

    # Calc total processing time and append to response headers
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Standardize security headers to prevent common web vulnerabilities (XSS, Sniffing, etc.)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    return response

# Cross-Origin Resource Sharing (CORS)
# -----
# Configure CORS
# Added last in main.py so it wraps all other middleware, making sure headers exist on all exit points.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# ROUTER REG
# -----------
# Mount functional sub-routers to main app instance
app.include_router(auth.router)
app.include_router(weather.router)
app.include_router(stocks.router)
app.include_router(users.router)
app.include_router(admin.router)


# BASE ENDPOINTS
# ---------------
# Root path:
# - Used for landing confirmation and version checking
@app.get("/")
async def root() -> Dict[str, str]:
    """
    Root API endpoint for connectivity verification.

    Returns:
        Dict[str, str]: Basic API welcome message and current version.
    """
    return {
        "message": f"Welcome to the {settings.APP_NAME}",
        "version": settings.VERSION,
        "status": "operational",
    }

# Health Check:
# - Used to get uptime for things like load balancers or uptime monitors
@app.get("/health")
async def health_check() -> Dict[str, str]:
    """
    Standard health check endpoint.

    Returns:
        Dict[str, str]: API health status.
    """
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    # Start the backend server for local development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
