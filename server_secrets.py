"""Server secrets – always prefer environment variables on Render/GitHub Actions.
Never commit real keys. Set in Render Dashboard → Environment, and GitHub → Settings → Secrets.
"""
from __future__ import annotations
import os

def owner_token() -> str:
    """Token required to publish updates / admin actions."""
    t = (os.environ.get("SA_OWNER_TOKEN") or "").strip()
    if t:
        return t
    # Dev-only fallback; disabled when SA_REQUIRE_SECRETS=1 (set on Render)
    if os.environ.get("SA_REQUIRE_SECRETS", "").lower() in ("1", "true", "yes"):
        return ""
    return "sa-owner-2026"

def require_owner_token(provided: str) -> bool:
    expected = owner_token()
    if not expected:
        return False
    return (provided or "").strip() == expected

def is_production() -> bool:
    return os.environ.get("SA_REQUIRE_SECRETS", "").lower() in ("1", "true", "yes")
