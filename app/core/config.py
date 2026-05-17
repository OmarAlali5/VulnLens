from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = (
        "postgresql://postgres:securepassword123@localhost:5432/security_scanner"
    )
    celery_broker_url: str = "redis://localhost:6379/0"
    api_key: str | None = None
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8000",
    ]
    block_private_targets: bool = True


@lru_cache
def get_settings() -> Settings:
    return Settings()
