"""
conftest.py — Shared pytest fixtures for the Financial Dashboard test suite.
Created: 2026-03-23
Purpose: Provides a per-test isolated SQLite database and a TestClient that
overrides the production `get_db` dependency so tests never touch the real DB.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from main import app

TEST_DATABASE_URL = "sqlite:///./test_financial_dashboard.db"


@pytest.fixture(scope="function")
def db_engine():
    """
    Creates a fresh SQLite database engine for each test function.
    Tables are created before the test and dropped after to ensure isolation.
    """
    engine = create_engine(TEST_DATABASE_URL, connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture(scope="function")
def client(db_engine):
    """
    Provides a FastAPI TestClient wired to the isolated test database.
    The `get_db` dependency is overridden for the duration of each test.
    """
    TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        db = TestingSession()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture(scope="function")
def auth_client(client):
    """
    Registers a test user, logs in, and returns a (client, token, user_data) tuple.
    Use this for tests that require an authenticated user.
    """
    # Register a new user
    reg_resp = client.post(
        "/api/auth/register",
        json={"username": "testuser", "password": "testpassword123"},
    )
    assert reg_resp.status_code == 200
    user_data = reg_resp.json()

    # Login to get a token
    login_resp = client.post(
        "/api/auth/token", data={"username": "testuser", "password": "testpassword123"}
    )
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    return client, token, user_data
