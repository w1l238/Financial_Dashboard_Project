.PHONY: help setup dev-backend dev-frontend docker-build docker-up docker-down test lint

# Default target
help:
	@echo "Financial Dashboard — available targets:"
	@echo "  setup          Install all dependencies for local development"
	@echo "  dev-backend    Run FastAPI backend with hot reload (port 8000)"
	@echo "  dev-frontend   Run Next.js frontend dev server (port 3000)"
	@echo "  docker-build   Build Docker images"
	@echo "  docker-up      Start all services with Docker Compose (detached)"
	@echo "  docker-down    Stop and remove Docker containers"
	@echo "  test           Run backend test suite"
	@echo "  lint           Run ruff (backend) and eslint (frontend)"

setup:
	cd backend && python -m venv venv && ./venv/bin/pip install -r requirements.txt
	cd frontend && npm ci

dev-backend:
	cd backend && ./venv/bin/uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev-frontend:
	cd frontend && npm run dev

docker-build:
	docker compose build

docker-up:
	docker compose up -d

docker-down:
	docker compose down

test:
	cd backend && ./venv/bin/pytest tests/ -v

lint:
	cd backend && ./venv/bin/ruff check .
	cd frontend && npm run lint
