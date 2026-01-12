from pydantic_settings import BaseSettings
from pydantic import Field
from typing import Optional

class Settings(BaseSettings):
    # Database & Cache
    DATABASE_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    
    # Environment
    ENVIRONMENT: str = "development"
    ALLOWED_ORIGINS: str = ""
    LOCAL_NETWORK_ACCESS: bool = True
    
    # Telegram Bot
    TELEGRAM_BOT_TOKEN: Optional[str] = None
    
    # Vercel Blob Storage
    BLOB_READ_WRITE_TOKEN: Optional[str] = None
    
    # Cross-service URLs
    FRONTEND_URL: Optional[str] = None
    BACKEND_URL: Optional[str] = None
    WEBHOOK_URL: Optional[str] = None
    
    # Monitoring (Sentry)
    SENTRY_DSN: Optional[str] = None

    # Push Notifications (VAPID)
    VAPID_PRIVATE_KEY: Optional[str] = None
    VAPID_PUBLIC_KEY: Optional[str] = None
    VAPID_CLAIMS_EMAIL: Optional[str] = "mailto:admin@mambax.com"
    
    OPENAI_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    
    # Payments (Stripe)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Admin Configuration
    ADMIN_PHONE: str = "+79062148253"
    ADMIN_USERNAME: str = "RezidentMD"
    ADMIN_TELEGRAM_ID: Optional[str] = None # Numeric ID if known
    SEED_ON_STARTUP: bool = Field(False) # Set to False in production
    
    @property
    def is_production(self) -> bool:
        """Returns True when running in production environment"""
        return self.ENVIRONMENT.lower() == "production"

    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
