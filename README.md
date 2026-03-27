# Financial & Weather Dashboard

A full-stack, personalized dashboard that aggregates real-time weather conditions and stock market data into a single, highly customizable interface.

## 📌 Project Overview
This application provides users with a unified view of their financial interests and local weather. Key features include:
- **Real-time Weather:** Tracking multiple locations via OpenWeatherMap (gracefully disabled when no API key is set).
- **Stock Market Tracking:** Live updates and historical data for user-specified tickers via yfinance (no API key required).
- **Customizable UI:** Modular widget-based layout with Light/Dark theme support.
- **High-Performance Analytics:** A C++ compute engine for technical indicators (RSI, Moving Averages, Bollinger Bands, MACD), with a pure-Python fallback if the extension is unavailable.

## 🏗️ Architecture
The system uses a **Backend-For-Frontend (BFF)** pattern:
- **Frontend:** Next.js 16 (React 19, TypeScript) with Tailwind CSS v4 and Recharts.
- **Backend:** FastAPI (Python 3.12) serving as an aggregator and cache layer.
- **Database:** SQLite via SQLAlchemy (single-file, zero config).
- **Compute Engine:** C++ modules bound to Python via `pybind11` for heavy calculations.

## 🛠️ Tech Stack
| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Next.js 16, React 19, TypeScript, Tailwind CSS v4, Recharts, Context API |
| **Backend** | Python 3.12, FastAPI, httpx, yfinance, SQLAlchemy, Uvicorn |
| **Database** | SQLite (via SQLAlchemy) |
| **Compute** | C++14, pybind11 |
| **APIs** | OpenWeatherMap (optional — weather features disabled gracefully without it) |

## 🚀 Getting Started

### Prerequisites
- Python 3.12+
- Node.js 20+
- A C++ compiler (GCC or Clang) — for the optional native analytics engine
- `make` — for convenience targets (optional but recommended)

### Quick Start (with Make)

```bash
# Install all dependencies and compile the C++ engine
make setup

# Run backend and frontend in separate terminals
make dev-backend   # http://localhost:8000
make dev-frontend  # http://localhost:3000
```

### Manual Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd Financial_Dashboard_Project
   ```

2. **Backend Setup:**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   pip install -r requirements.txt
   ```

3. **Frontend Setup:**
   ```bash
   cd ../frontend
   npm install
   ```

4. **Environment Variables:**
   Copy the example file and fill in your values:
   ```bash
   cp backend/.env.example backend/.env
   ```
   Edit `backend/.env`:
   ```env
   SECRET_KEY="change-me-to-a-random-secret"
   OPENWEATHER_API_KEY=your_key_here   # Optional — get a free key at openweathermap.org
   ALLOWED_ORIGINS=http://localhost:3000
   ENVIRONMENT="development" # Can be changed to 'production'
   ALLOW_REGISTRATION=True # Set to 'false' to disable user registration
   ```
   > **Note:** `OPENWEATHER_API_KEY` is optional. Weather features are gracefully disabled in the UI when the key is absent — all other features (stocks, analytics) work normally.

## 🏃 Running the Application

### With Make (recommended)
```bash
make dev-backend   # starts FastAPI with hot-reload on :8000
make dev-frontend  # starts Next.js dev server on :3000
```

### Manually

**Backend** (from `backend/` with venv activated):
```bash
uvicorn main:app --reload
```
API available at `http://localhost:8000` — interactive docs at `http://localhost:8000/docs`.

**Frontend** (from `frontend/`):
```bash
npm run dev
```
Dashboard accessible at `http://localhost:3000`.

## 🐳 Docker Deployment

> **⚠️ Work in Progress** — Docker deployment is not yet stable. Known issues are being investigated. Use the local development setup below for a reliable experience.

```bash
# Build and start all containers
make docker-up

# Or using Docker Compose directly
docker compose build && docker compose up -d
```

This launches:
- **Frontend**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`

The database is persisted in a named Docker volume (`db_data`), so data survives container restarts.

To stop:
```bash
make docker-down
# or
docker compose down
```

## 🛠️ Makefile Reference

| Target | Description |
| :--- | :--- |
| `make help` | Show all available targets |
| `make setup` | Install backend + frontend dependencies |
| `make dev-backend` | Run FastAPI with hot-reload |
| `make dev-frontend` | Run Next.js dev server |
| `make docker-build` | Build Docker images |
| `make docker-up` | Build and start all containers |
| `make docker-down` | Stop and remove containers |
| `make test` | Run backend tests with pytest |
| `make lint` | Run Ruff (Python) and ESLint (TypeScript) |

## 🛡️ Production Security
- **Global Error Handling**: Unhandled exceptions return JSON 500s with CORS headers intact.
- **Security Headers**: HSTS, CSP, XSS-Protection, and X-Frame-Options configured.
- **Rate Limiting**: Backend protection against brute-force and scraping via `slowapi`.
- **CORS**: Configurable allowed origins via `ALLOWED_ORIGINS` environment variable.
- **Registration Gate**: Set `ALLOW_REGISTRATION=False` in `.env` to disable new account creation.
- **Non-root containers**: Both backend and frontend Docker images run as unprivileged users.

## ⚙️ CI/CD Pipeline
GitHub Actions (`.github/workflows/main.yml`) runs on every push:
- **Linting**: Ruff (Python) and ESLint (TypeScript).
- **Type checking**: `tsc --noEmit`
- **Build verification**: Next.js production build.
- **Testing**: Backend unit tests with `pytest`.

For detailed deployment instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## 📜 License
This project is licensed under the MIT License.
