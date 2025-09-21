"""Prueba del endpoint `/admin/db_integrity`."""

import os

API_KEY = "test-api-key"
os.environ["API_KEY"] = API_KEY

def test_db_integrity_endpoint(app_client):
    r = app_client.get("/admin/db_integrity", headers={"X-API-Key": API_KEY})
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body.get("ok"), bool)
    # En SQLite in-memory debería responder ok o unknown, pero validamos estructura básica
    assert "detail" in body
