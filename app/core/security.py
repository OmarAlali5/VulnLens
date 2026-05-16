import secrets

from fastapi import Header, HTTPException, status

from app.core.config import get_settings


def verify_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Optional API key check when API_KEY is set in the environment."""
    settings = get_settings()
    if settings.api_key is None:
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, settings.api_key):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing API key",
        )
