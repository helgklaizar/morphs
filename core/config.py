from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    # App Settings
    APP_NAME: str = "Morphs Business OS"
    DEBUG: bool = False
    
    # Server Ports
    CORE_MIND_PORT: int = Field(default=8000, description="Port for the main FastAPI Core Mind server")
    SAAS_BACKEND_PORT: int = Field(default=3001, description="Default port for generated microservices")
    SAAS_FRONTEND_PORT: int = Field(default=3000, description="Default port for generated frontend React apps")
    VITE_DEV_PORT: int = Field(default=5173, description="Vite Dev Server port for Playwright tests")
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
