import pytest
from fastapi.testclient import TestClient

from tests.conftest import register_user, get_token, auth_headers


def test_register_success(client: TestClient):
    resp = client.post("/api/v1/auth/register", json={
        "email": "alice@example.com",
        "username": "alice",
        "password": "securepass",
    })
    assert resp.status_code == 201
    data = resp.json()
    assert data["email"] == "alice@example.com"
    assert data["username"] == "alice"
    assert data["tier"] == "basic"
    assert "hashed_password" not in data


def test_register_duplicate_email(client: TestClient):
    register_user(client, "bob@example.com", "bob")
    resp = client.post("/api/v1/auth/register", json={
        "email": "bob@example.com",
        "username": "bob2",
        "password": "securepass",
    })
    assert resp.status_code == 400
    assert "Email" in resp.json()["detail"]


def test_register_duplicate_username(client: TestClient):
    register_user(client, "charlie@example.com", "charlie")
    resp = client.post("/api/v1/auth/register", json={
        "email": "charlie2@example.com",
        "username": "charlie",
        "password": "securepass",
    })
    assert resp.status_code == 400
    assert "Username" in resp.json()["detail"]


def test_register_short_password(client: TestClient):
    resp = client.post("/api/v1/auth/register", json={
        "email": "d@example.com",
        "username": "dshort",
        "password": "abc",
    })
    assert resp.status_code == 422


def test_login_success(client: TestClient):
    register_user(client, "eve@example.com", "eve")
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "eve@example.com", "password": "password123"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    token_data = resp.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"


def test_login_wrong_password(client: TestClient):
    register_user(client, "frank@example.com", "frank")
    resp = client.post(
        "/api/v1/auth/login",
        data={"username": "frank@example.com", "password": "wrongpass"},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 401


def test_get_me(client: TestClient):
    register_user(client, "grace@example.com", "grace")
    token = get_token(client, "grace@example.com")
    resp = client.get("/api/v1/auth/me", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json()["username"] == "grace"


def test_get_me_unauthenticated(client: TestClient):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_json_login(client: TestClient):
    register_user(client, "henry@example.com", "henry")
    resp = client.post("/api/v1/auth/login/json", json={
        "email": "henry@example.com",
        "password": "password123",
    })
    assert resp.status_code == 200
    assert "access_token" in resp.json()
