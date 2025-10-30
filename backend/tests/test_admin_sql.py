"""Pruebas de los nuevos endpoints administrativos de SQL."""

import os

import pytest

API_KEY = "test-api-key"
os.environ.setdefault("API_KEY", API_KEY)


@pytest.fixture()
def admin_headers():
    return {"X-API-Key": API_KEY}


def test_admin_sql_requires_api_key(app_client):
    resp = app_client.post("/admin/sql", json={"statement": "SELECT 1"})
    assert resp.status_code == 401


def test_admin_sql_execute_and_tables(app_client, admin_headers):
    create = app_client.post(
        "/admin/sql",
        json={"statement": "CREATE TABLE IF NOT EXISTS admin_sql_test (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"},
        headers=admin_headers,
    )
    assert create.status_code == 200

    insert = app_client.post(
        "/admin/sql",
        json={"statement": "INSERT INTO admin_sql_test (name) VALUES (:name)", "params": {"name": "Tester"}},
        headers=admin_headers,
    )
    assert insert.status_code == 200
    insert_body = insert.json()
    assert insert_body["rowcount"] >= 1

    select = app_client.post(
        "/admin/sql",
        json={"statement": "SELECT name FROM admin_sql_test WHERE name = :name", "params": {"name": "Tester"}},
        headers=admin_headers,
    )
    assert select.status_code == 200
    select_body = select.json()
    assert select_body["rows"]
    assert select_body["rows"][0]["name"] == "Tester"

    tables = app_client.get("/admin/sql/tables", headers=admin_headers)
    assert tables.status_code == 200
    assert "admin_sql_test" in tables.json()["tables"]

    dump = app_client.get("/admin/sql/tables/admin_sql_test", headers=admin_headers)
    assert dump.status_code == 200
    dump_body = dump.json()
    assert dump_body["rowcount"] >= 1
    assert dump_body["rows"][0]["name"] == "Tester"

    drop = app_client.post(
        "/admin/sql",
        json={"statement": "DROP TABLE admin_sql_test"},
        headers=admin_headers,
    )
    assert drop.status_code == 200


def test_admin_sql_rejects_invalid_params(app_client, admin_headers):
    resp = app_client.post(
        "/admin/sql",
        json={"statement": "SELECT 1", "params": ["nope"]},
        headers=admin_headers,
    )
    assert resp.status_code == 422
