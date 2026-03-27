# Deployment Guide - Financial Dashboard Project

This guide outlines the procedures for deploying the Financial Dashboard Project in a production environment.

## Architecture Overview
- **Frontend**: Next.js (TypeScript) application, served via a Node.js runner.
- **Backend**: FastAPI (Python) application, served via Uvicorn.
- **Database**: SQLite (local file) for simplified state management.
- **Analysis Engine**: C++ compiled module integrated into the Python backend.

## 1. Environment Configuration

### Backend (`backend/.env`)
Ensure the following variables are set in your production environment:
```env
OPENWEATHER_API_KEY=your_openweather_key
SECRET_KEY=generate_a_long_random_string
ALLOWED_ORIGINS=["https://your-frontend-domain.com"]
ENVIRONMENT=production
```

### Frontend (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=https://your-backend-api.com
```

## 2. Docker Deployment

> **⚠️ Work in Progress** — Docker deployment is not yet stable. Known issues are being investigated. Manual deployment (Section 3) is the recommended path in the meantime.

The project includes a `docker-compose.yml` for simplified orchestration.

### Build and Start
```bash
docker-compose up -d --build
```

### Individual Service Build
If you prefer building services separately:
```bash
# Backend
docker build -t fincast-backend ./backend

# Frontend
docker build -t fincast-frontend ./frontend --build-arg NEXT_PUBLIC_API_URL=https://your-api-domain.com
```

## 3. Manual Deployment (Linux/Ubuntu)

### Backend Requirements
- Python 3.12+
- Build tools for C++ engine: `build-essential`, `python3-dev`

### Steps
1. **Clone & Setup Backend**:
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```
2. **Start Backend with Gunicorn/Uvicorn**:
   ```bash
   gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:8000
   ```
3. **Setup Frontend**:
   ```bash
   cd frontend
   npm ci
   npm run build
   npm start
   ```

## 4. Security Hardening

- **CORS**: Ensure `ALLOWED_ORIGINS` in `backend/app/core/config.py` is restricted to your production frontend domain.
- **SSL**: Always use a reverse proxy (Nginx/Traefik/Caddy) to terminate SSL (HTTPS) before forwarding traffic to the services.
- **Rate Limiting**: The backend has basic rate limiting implemented via `slowapi`. Adjust thresholds in `main.py` if necessary.
- **Role-Based Access Control (RBAC)**: 
    - The system distinguishes between `user` and `admin` roles.
    - Administrators have exclusive access to `/api/admin/*` endpoints.
    - The first user registered in a fresh database is automatically assigned the `admin` role.
- **Headers**: Secure headers (HSTS, CSP, X-Frame-Options) are automatically added by the backend middleware.

## 5. CI/CD Integration

A GitHub Actions workflow is provided in `.github/workflows/main.yml`. It performs:
1. Backend linting and unit testing.
2. Frontend linting, type-checking, and production build verification.
3. Automated Docker image building on pushes to `main`.

## 6. Performance Optimization

- **Build Artifacts**: The Docker multi-stage build ensures a small footprint for the production runner.
- **C++ Engine**: Technical analysis (SMA, RSI) is performed in compiled C++ for maximum throughput.
- **Caching**: Future improvements could include Redis for caching API responses from OpenWeather and Yahoo Finance.
