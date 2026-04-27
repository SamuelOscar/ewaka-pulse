from pydantic_settings import BaseSettings
from functools import lru_cache
from typing import List


class Settings(BaseSettings):
    """
    All settings come from environment variables.
    If DATABASE_URL or SECRET_KEY are missing,
    the application refuses to start. Intentional.
    """

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Environment
    ENVIRONMENT: str = "development"

    # App info
    APP_NAME: str = "Ewaka-Pulse"
    APP_VERSION: str = "1.0.0"

    model_config = {"env_file": ".env", "case_sensitive": True}

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def docs_url(self) -> str | None:
        # Swagger disabled in production — attackers cannot browse endpoints
        return None if self.is_production else "/docs"

    @property
    def redoc_url(self) -> str | None:
        return None if self.is_production else "/redoc"

    @property
    def allowed_origins(self) -> List[str]:
        # CORS: never wildcard (*). Production locks to Vercel URL only.
        if self.is_production:
            return ["https://ewaka-pulse.vercel.app"]
        return [
            "http://localhost:5173",
            "http://localhost:3000",
        ]


@lru_cache()
def get_settings() -> Settings:
    return Settings()
