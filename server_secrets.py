"""Server secrets – use environment variables on Render. Never commit real keys."""
from __future__ import annotations
import os

def owner_token() -> str:
    t = (os.environ.get("SA_OWNER_TOKEN") or "").strip()
    if t:
        return t
    if os.environ.get("SA_REQUIRE_SECRETS", "").lower() in ("1", "true", "yes"):
        return ""
    return "sa-owner-2026"

def require_owner_token(provided: str) -> bool:
    expected = owner_token()
    if not expected:
        return False
    return (provided or "").strip() == expected
