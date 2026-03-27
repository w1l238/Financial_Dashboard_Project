"""
test_auth.py — Integration tests for the authentication endpoints.
Created: 2026-03-23
Covers: user registration, login, duplicate username, invalid credentials, and
the "first user becomes admin" business rule.
"""

from fastapi.testclient import TestClient


def test_register_new_user(client: TestClient):
    """A fresh user registration should return 200 with the username."""
    response = client.post(
        "/api/auth/register", json={"username": "alice", "password": "securepassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["username"] == "alice"
    # Password must NOT appear in any form in the response
    assert "password" not in data
    assert "hashed_password" not in data


def test_first_user_becomes_admin(client: TestClient):
    """The very first registered user in the DB should automatically get the admin role."""
    response = client.post(
        "/api/auth/register", json={"username": "firstuser", "password": "password123"}
    )
    assert response.status_code == 200
    assert response.json()["role"] == "admin"


def test_second_user_gets_user_role(client: TestClient):
    """Subsequent registered users should receive the default 'user' role."""
    client.post(
        "/api/auth/register", json={"username": "admin_user", "password": "pass1"}
    )
    response = client.post(
        "/api/auth/register", json={"username": "regular_user", "password": "pass2"}
    )
    assert response.status_code == 200
    assert response.json()["role"] == "user"


def test_register_duplicate_username(client: TestClient):
    """Registering a username that already exists should return 400 Bad Request."""
    client.post("/api/auth/register", json={"username": "bob", "password": "password1"})
    response = client.post(
        "/api/auth/register", json={"username": "bob", "password": "different_password"}
    )
    assert response.status_code == 400
    assert "already registered" in response.json()["detail"]


def test_login_valid_credentials(client: TestClient):
    """A valid login should return a JWT access token with token_type 'bearer'."""
    client.post(
        "/api/auth/register", json={"username": "charlie", "password": "mypassword"}
    )
    response = client.post(
        "/api/auth/token", data={"username": "charlie", "password": "mypassword"}
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert len(data["access_token"]) > 0


def test_login_invalid_password(client: TestClient):
    """A login with a wrong password should return 401 Unauthorized."""
    client.post(
        "/api/auth/register", json={"username": "dave", "password": "correctpassword"}
    )
    response = client.post(
        "/api/auth/token", data={"username": "dave", "password": "wrongpassword"}
    )
    assert response.status_code == 401


def test_login_nonexistent_user(client: TestClient):
    """A login for a user that was never registered should return 401 Unauthorized."""
    response = client.post(
        "/api/auth/token", data={"username": "ghost", "password": "anypassword"}
    )
    assert response.status_code == 401
