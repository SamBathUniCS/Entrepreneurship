import pytest
from fastapi.testclient import TestClient

from tests.conftest import register_user, get_token, auth_headers


def _setup_pro_user(client, email="pro@example.com", username="prouser"):
    register_user(client, email, username)
    token = get_token(client, email)
    # Upgrade to pro
    client.post(
        "/api/v1/admin/users/me/tier?tier=pro",
        headers=auth_headers(token),
    )
    return token


def test_basic_user_cannot_create_event(client: TestClient):
    register_user(client, "basic@example.com", "basicuser")
    token = get_token(client, "basic@example.com")
    resp = client.post(
        "/api/v1/events/",
        json={"title": "My Event"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 403


def test_pro_user_can_create_event(client: TestClient):
    token = _setup_pro_user(client)
    resp = client.post(
        "/api/v1/events/",
        json={"title": "Pro Party", "description": "A great event", "visibility": "public"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Pro Party"
    assert data["status"] == "active"
    assert data["max_attendees"] == 50


def test_business_user_gets_500_attendee_limit(client: TestClient):
    register_user(client, "biz@example.com", "bizuser")
    token = get_token(client, "biz@example.com")
    client.post("/api/v1/admin/users/me/tier?tier=business", headers=auth_headers(token))
    resp = client.post(
        "/api/v1/events/",
        json={"title": "Big Conference"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 201
    assert resp.json()["max_attendees"] == 500


def test_join_event(client: TestClient):
    # Creator
    token_creator = _setup_pro_user(client, "creator@example.com", "creator")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "Join Test Event", "visibility": "public"},
        headers=auth_headers(token_creator),
    )
    event_id = create_resp.json()["id"]

    # Joiner
    register_user(client, "joiner@example.com", "joiner")
    token_joiner = get_token(client, "joiner@example.com")
    resp = client.post(f"/api/v1/events/{event_id}/join", headers=auth_headers(token_joiner))
    assert resp.status_code == 200
    data = resp.json()
    assert data["has_access"] is False  # basic user, hasn't uploaded
    assert data["upload_count"] == 0
    assert "Upload" in data["message"]


def test_join_event_twice_fails(client: TestClient):
    token_creator = _setup_pro_user(client, "c2@example.com", "creator2")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "No Double Join", "visibility": "public"},
        headers=auth_headers(token_creator),
    )
    event_id = create_resp.json()["id"]

    register_user(client, "j2@example.com", "joiner2")
    token_joiner = get_token(client, "j2@example.com")
    client.post(f"/api/v1/events/{event_id}/join", headers=auth_headers(token_joiner))
    resp = client.post(f"/api/v1/events/{event_id}/join", headers=auth_headers(token_joiner))
    assert resp.status_code == 409


def test_pro_joiner_gets_immediate_access(client: TestClient):
    token_creator = _setup_pro_user(client, "c3@example.com", "creator3")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "Pro Access Event", "visibility": "public"},
        headers=auth_headers(token_creator),
    )
    event_id = create_resp.json()["id"]

    # Another pro user joins
    register_user(client, "projoin@example.com", "projoin")
    token_pro = get_token(client, "projoin@example.com")
    client.post("/api/v1/admin/users/me/tier?tier=pro", headers=auth_headers(token_pro))
    resp = client.post(f"/api/v1/events/{event_id}/join", headers=auth_headers(token_pro))
    assert resp.status_code == 200
    assert resp.json()["has_access"] is True
    assert "Pro" in resp.json()["message"]


def test_get_event_not_member_private(client: TestClient):
    token_creator = _setup_pro_user(client, "c4@example.com", "creator4")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "Secret Event", "visibility": "private"},
        headers=auth_headers(token_creator),
    )
    event_id = create_resp.json()["id"]

    register_user(client, "outsider@example.com", "outsider")
    token_out = get_token(client, "outsider@example.com")
    resp = client.get(f"/api/v1/events/{event_id}", headers=auth_headers(token_out))
    assert resp.status_code == 403


def test_list_events_empty(client: TestClient):
    register_user(client, "empty@example.com", "emptyuser")
    token = get_token(client, "empty@example.com")
    resp = client.get("/api/v1/events/", headers=auth_headers(token))
    assert resp.status_code == 200
    assert resp.json() == []


def test_update_event(client: TestClient):
    token = _setup_pro_user(client, "u1@example.com", "updater1")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "Old Title"},
        headers=auth_headers(token),
    )
    event_id = create_resp.json()["id"]
    resp = client.patch(
        f"/api/v1/events/{event_id}",
        json={"title": "New Title", "status": "ended"},
        headers=auth_headers(token),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["title"] == "New Title"
    assert data["status"] == "ended"


def test_archive_event(client: TestClient):
    token = _setup_pro_user(client, "arc@example.com", "archiver")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "To Archive"},
        headers=auth_headers(token),
    )
    event_id = create_resp.json()["id"]
    resp = client.delete(f"/api/v1/events/{event_id}", headers=auth_headers(token))
    assert resp.status_code == 204


def test_event_leaderboard(client: TestClient):
    token_creator = _setup_pro_user(client, "lb@example.com", "lbcreator")
    create_resp = client.post(
        "/api/v1/events/",
        json={"title": "Leaderboard Event"},
        headers=auth_headers(token_creator),
    )
    event_id = create_resp.json()["id"]
    resp = client.get(f"/api/v1/events/{event_id}/members", headers=auth_headers(token_creator))
    assert resp.status_code == 200
    members = resp.json()
    assert len(members) == 1  # just the creator
    assert members[0]["username"] == "lbcreator"
