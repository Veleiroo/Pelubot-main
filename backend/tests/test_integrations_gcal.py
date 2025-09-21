"""Pruebas unitarias de la integración con Google Calendar."""

from pathlib import Path
import json

import pytest


def test_load_user_creds_refresh_and_persist(tmp_path, monkeypatch):
    from app.integrations import google_calendar as gcal

    token_path = tmp_path / "token.json"
    token_path.write_text(json.dumps({"dummy": True}), encoding="utf-8")

    class DummyCreds:
        def __init__(self):
            self.expired = True
            self.refresh_token = "refresh-token"
            self._refreshed = False

        def refresh(self, request):
            self.expired = False
            self._refreshed = True

        def to_json(self):
            return json.dumps({"refreshed": True})

    monkeypatch.setattr(
        gcal.UserCreds,
        "from_authorized_user_info",
        lambda info, scopes: DummyCreds(),
    )
    monkeypatch.setattr(gcal, "SCOPES", ["test-scope"])
    monkeypatch.setattr(gcal, "Request", lambda: None)

    monkeypatch.setenv("GOOGLE_OAUTH_JSON", str(token_path))

    creds = gcal._load_user_creds()
    assert isinstance(creds, DummyCreds)
    assert creds._refreshed is True
    assert json.loads(token_path.read_text(encoding="utf-8")) == {"refreshed": True}
