import pytest
from fastapi.testclient import TestClient

from tests.conftest import register_user, get_token, auth_headers


def test_get_public_profile(client: TestClient):
    register_user(client, "public@example.com", "publicuser")
    token = get_token(client, "public@example.com")
    resp = client.get("/api/v1/users/publicuser")
    assert resp.status_code == 200
    data = resp.json()
    assert data["username"] == "publicuser"
    # Sensitive fields not exposed
    assert "email" not in data
    assert "hashed_password" not in data


def test_get_nonexistent_user(client: TestClient):
    resp = client.get("/api/v1/users/doesnotexist")
    assert resp.status_code == 404


def test_update_profile(client: TestClient):
    register_user(client, "update@example.com", "updateuser")
    token = get_token(client, "update@example.com")
    resp = client.patch(
        "/api/v1/users/me",
        json={"full_name": "Updated Name", "bio": "Hello world"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["full_name"] == "Updated Name"
    assert data["bio"] == "Hello world"


def test_update_privacy_settings(client: TestClient):
    register_user(client, "privacy@example.com", "privacyuser")
    token = get_token(client, "privacy@example.com")
    resp = client.patch(
        "/api/v1/users/me",
        json={"face_recognition_enabled": False, "recognition_scope": "friends_only"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["face_recognition_enabled"] is False
    assert data["recognition_scope"] == "friends_only"


def test_change_password(client: TestClient):
    register_user(client, "pw@example.com", "pwuser", password="oldpassword")
    token = get_token(client, "pw@example.com", password="oldpassword")
    resp = client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "oldpassword", "new_password": "newpassword123"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 204

    # Old token still valid (JWT not revoked in this impl), but login with new pw works
    new_token = get_token(client, "pw@example.com", password="newpassword123")
    assert new_token


def test_change_password_wrong_current(client: TestClient):
    register_user(client, "pw2@example.com", "pwuser2")
    token = get_token(client, "pw2@example.com")
    resp = client.post(
        "/api/v1/users/me/change-password",
        json={"current_password": "wrongpass", "new_password": "newpassword123"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 400


def test_send_friend_request(client: TestClient):
    register_user(client, "fr1@example.com", "fruser1")
    register_user(client, "fr2@example.com", "fruser2")
    token1 = get_token(client, "fr1@example.com")
    resp = client.post("/api/v1/users/me/friends/fruser2", headers=auth_headers(token1))
    assert resp.status_code == 201
    assert "friendship_id" in resp.json()


def test_send_friend_request_duplicate(client: TestClient):
    register_user(client, "dup1@example.com", "dupuser1")
    register_user(client, "dup2@example.com", "dupuser2")
    token1 = get_token(client, "dup1@example.com")
    client.post("/api/v1/users/me/friends/dupuser2", headers=auth_headers(token1))
    resp = client.post("/api/v1/users/me/friends/dupuser2", headers=auth_headers(token1))
    assert resp.status_code == 409


def test_accept_friend_request(client: TestClient):
    register_user(client, "acc1@example.com", "accuser1")
    register_user(client, "acc2@example.com", "accuser2")
    token1 = get_token(client, "acc1@example.com")
    token2 = get_token(client, "acc2@example.com")

    send_resp = client.post("/api/v1/users/me/friends/accuser2", headers=auth_headers(token1))
    friendship_id = send_resp.json()["friendship_id"]

    accept_resp = client.patch(
        f"/api/v1/users/me/friends/{friendship_id}/accept",
        headers=auth_headers(token2),
    )
    assert accept_resp.status_code == 200

    friends_resp = client.get("/api/v1/users/me/friends", headers=auth_headers(token2))
    assert friends_resp.status_code == 200
    usernames = [u["username"] for u in friends_resp.json()]
    assert "accuser1" in usernames


def test_tier_upgrade(client: TestClient):
    register_user(client, "tier@example.com", "tieruser")
    token = get_token(client, "tier@example.com")

    resp = client.post(
        "/api/v1/admin/users/me/tier?tier=pro",
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    assert resp.json()["tier"] == "pro"

    me_resp = client.get("/api/v1/users/me", headers=auth_headers(token))
    assert me_resp.json()["tier"] == "pro"
