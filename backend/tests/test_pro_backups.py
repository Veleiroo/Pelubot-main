from __future__ import annotations

import sqlite3
import os
import time
from pathlib import Path
from typing import Tuple

from fastapi.testclient import TestClient
from sqlmodel import Session

from app.models import StylistDB
from app.utils.security import hash_password


def _seed_stylist(engine) -> StylistDB:
    stylist = StylistDB(
        id="backup-pro",
        name="Backup Admin",
        display_name="Backup Admin",
        email="backup@example.com",
        services=["corte_cabello"],
        password_hash=hash_password("1234"),
        is_active=True,
    )
    with Session(engine) as session:
        session.add(stylist)
        session.commit()
        session.refresh(stylist)
    return stylist


def _auth_headers(app_client: TestClient) -> dict:
    engine = app_client.app.state.test_engine
    _seed_stylist(engine)
    resp = app_client.post("/pros/login", json={"identifier": "backup-pro", "password": "1234"})
    assert resp.status_code == 200
    token = resp.json()["session_token"]
    assert token
    app_client.cookies.clear()
    return {"X-Pro-Session": token}


def _prepare_backup_env(monkeypatch, tmp_path: Path) -> Tuple[Path, Path]:
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True)
    db_path = tmp_path / "data" / "pelubot.db"
    db_path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(db_path))
    conn.execute("CREATE TABLE IF NOT EXISTS demo (id INTEGER PRIMARY KEY)")
    conn.commit()
    conn.close()
    monkeypatch.setenv("PELUBOT_BACKUPS_DIR", str(backup_dir))
    monkeypatch.setenv("DATABASE_URL", f"sqlite:///{db_path}")
    return backup_dir, db_path


def test_list_backups_returns_entries(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, _ = _prepare_backup_env(monkeypatch, tmp_path)
    first = backup_dir / "pelubot-20240101.db"
    second = backup_dir / "pelubot-20240102.db"
    first.write_bytes(b"a")
    second.write_bytes(b"b")
    os.utime(first, (first.stat().st_atime, first.stat().st_mtime - 10))

    headers = _auth_headers(app_client)
    resp = app_client.get("/pros/backups", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert "backups" in data
    filenames = [item["filename"] for item in data["backups"]]
    assert filenames == [second.name, first.name]


def test_delete_backup_removes_file(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, _ = _prepare_backup_env(monkeypatch, tmp_path)
    entry = backup_dir / "pelubot-20240202.db"
    entry.write_bytes(b"delete-me")

    headers = _auth_headers(app_client)
    resp = app_client.delete(f"/pros/backups/{entry.name}", headers=headers)
    assert resp.status_code == 200
    assert not entry.exists()


def test_restore_backup_overwrites_database(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, db_path = _prepare_backup_env(monkeypatch, tmp_path)
    entry = backup_dir / "pelubot-restore.db"
    payload = b"backup-data"
    entry.write_bytes(payload)
    db_path.write_bytes(b"old-data")

    headers = _auth_headers(app_client)
    resp = app_client.post(f"/pros/backups/{entry.name}/restore", headers=headers)
    assert resp.status_code == 200
    assert db_path.read_bytes() == payload


def test_download_backup_serves_file(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, _ = _prepare_backup_env(monkeypatch, tmp_path)
    entry = backup_dir / "pelubot-download.db"
    payload = b"binary-backup"
    entry.write_bytes(payload)

    headers = _auth_headers(app_client)
    resp = app_client.get(f"/pros/backups/{entry.name}/download", headers=headers)
    assert resp.status_code == 200
    assert resp.content == payload
    disposition = resp.headers.get("content-disposition", "")
    assert entry.name in disposition


def test_create_backup_endpoint_generates_file(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, _ = _prepare_backup_env(monkeypatch, tmp_path)
    headers = _auth_headers(app_client)
    resp = app_client.post("/pros/backups", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    filename = data["filename"]
    assert filename
    created_file = backup_dir / filename
    assert created_file.exists()


def test_retention_prunes_old_backups(app_client: TestClient, tmp_path, monkeypatch):
    backup_dir, _ = _prepare_backup_env(monkeypatch, tmp_path)
    monkeypatch.setenv("PELUBOT_BACKUP_RETAIN", "2")
    headers = _auth_headers(app_client)

    created = []
    for _ in range(3):
        resp = app_client.post("/pros/backups", headers=headers)
        assert resp.status_code == 200
        created.append(resp.json()["filename"])
        time.sleep(1)

    remaining = sorted([p.name for p in backup_dir.glob("*.db")])
    assert len(remaining) == 2
    assert created[-1] in remaining
    assert created[-2] in remaining
