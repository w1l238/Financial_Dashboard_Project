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

# Initialize database tables
Base.metadata.create_all(bind=engine)

# Logging configuration
logging.basicConfig(
    level=logging.INFO if settings.ENVIRONMENT == "production" else logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)
logger = logging.getLogger(__name__)
# passlib logs a harmless warning when bcrypt 4.x is installed because it can
# no longer read the version string.  Suppress it to keep logs clean.
logging.getLogger("passlib").setLevel(logging.ERROR)

# Initialize Rate Limiter
limiter = Limiter(key_func=get_remote_address)

# Initialize FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    description="A high-performance aggregation layer for weather and financial data.",
    version=settings.VERSION,
    docs_url="/docs" if settings.ENVIRONMENT != "production" else None,
    redoc_url="/redoc" if settings.ENVIRONMENT != "production" else None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)


# Custom Middleware for Security Headers, Execution Time, and Error Handling.
# IMPORTANT: app.add_middleware(CORSMiddleware) is called AFTER this decorator
# so that CORS becomes the outermost layer. In Starlette, the last middleware
# added is outermost, meaning CORS headers will be applied to all responses
# including 500s generated here.
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

    # Timing header
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)

    # Security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Strict-Transport-Security"] = (
        "max-age=31536000; includeSubDomains"
    )

    return response


# Configure CORS — added LAST so it is the outermost middleware layer.
# Starlette processes middleware LIFO: the last add_middleware call wraps all
# others, ensuring CORS headers are injected on every response, including
# error responses produced by the custom middleware above.
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Register API routes
app.include_router(auth.router)
app.include_router(weather.router)
app.include_router(stocks.router)
app.include_router(users.router)
app.include_router(admin.router)


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
