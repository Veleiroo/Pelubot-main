#!/usr/bin/env python3
"""Utility to convert a Google service account JSON into env vars.

Usage:
    python backend/scripts/service_account_env.py path/to/key.json

It prints:
  - export command for GOOGLE_SERVICE_ACCOUNT_JSON_BASE64
  - snippet for .env files
"""

from __future__ import annotations

import argparse
import base64
from pathlib import Path
import sys

def main() -> None:
    parser = argparse.ArgumentParser(description="Generate env snippets for Google service account")
    parser.add_argument("json_path", help="Path to the service account JSON file")
    args = parser.parse_args()

    path = Path(args.json_path)
    if not path.exists():
        print(f"[error] File not found: {path}", file=sys.stderr)
        raise SystemExit(1)

    content = path.read_text(encoding="utf-8")
    encoded = base64.b64encode(content.encode("utf-8")).decode("utf-8")

    export_cmd = f"export GOOGLE_SERVICE_ACCOUNT_JSON_BASE64='{encoded}'"
    env_snippet = (
        "# Google service account\n"
        f"GOOGLE_SERVICE_ACCOUNT_JSON_BASE64={encoded}\n"
        "# Optional: impersonate calendar owner if needed\n"
        "# GOOGLE_IMPERSONATE_EMAIL=barber@example.com\n"
    )

    print("\n# Shell export\n")
    print(export_cmd)
    print("\n# .env snippet\n")
    print(env_snippet)
    print("\nCopy the snippet to your secrets management (.env, CI vars, etc.).")

if __name__ == "__main__":
    main()
