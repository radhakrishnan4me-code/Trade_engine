from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@postgres:5432/trade_engine"
    DATABASE_URL_SYNC: str = "postgresql://postgres:postgres@postgres:5432/trade_engine"

    # Security
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    JWT_SECRET: str = "change-me-jwt-secret-key"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRE_MINUTES: int = 1440  # 24 hours

    # CORS
    CORS_ORIGINS: str = "*"

    # Default admin credentials (seeded on first run)
    DEFAULT_ADMIN_USERNAME: str = "admin"
    DEFAULT_ADMIN_PASSWORD: str = "admin123"

    class Config:
        env_file = ".env"
        case_sensitive = True


@lru_cache()
def get_settings() -> Settings:
    return Settings()
