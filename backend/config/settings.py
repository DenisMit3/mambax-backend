from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
from typing import Optional
from pathlib import Path

# Get the path to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent

class Settings(BaseSettings):
    # Database & Cache
    DATABASE_URL: Optional[str] = None
    DOCKER_DATABASE_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    # PostgreSQL (for Docker)
    POSTGRES_USER: Optional[str] = None
    POSTGRES_PASSWORD: Optional[str] = None
    POSTGRES_DB: Optional[str] = None
    
    # Security
    SECRET_KEY: str = Field(..., min_length=32)
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
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
    
    # AI Keys
    OPENAI_API_KEY: Optional[str] = None
    HUGGINGFACE_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GROQ_API_KEY: Optional[str] = None
    
    # Payments (Stripe)
    STRIPE_SECRET_KEY: Optional[str] = None
    STRIPE_WEBHOOK_SECRET: Optional[str] = None

    # Firebase (Push Notifications)
    FIREBASE_CREDENTIALS: Optional[str] = None  # Path to JSON or JSON string
    
    # AWS (S3 Backups)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: Optional[str] = None  # For MinIO compatibility
    BACKUP_BUCKET: str = "app-backups"
    BACKUP_RETENTION_DAYS: int = 30
    
    # SMTP (Email)
    SMTP_SERVER: Optional[str] = None
    SMTP_PORT: int = 587
    SMTP_USERNAME: Optional[str] = None
    SMTP_PASSWORD: Optional[str] = None
    SMTP_FROM_EMAIL: str = "noreply@mambax.com"
    
    # Rate Limiting
    RATE_LIMIT_PER_MINUTE: int = 60

    # Admin Configuration
    ADMIN_PHONE: str = "+79062148253"
    ADMIN_USERNAME: str = "RezidentMD"
    ADMIN_TELEGRAM_ID: Optional[str] = None # Numeric ID if known
    SEED_ON_STARTUP: bool = Field(False) # Set to False in production
    
    # Scheduler
    ENABLE_SCHEDULER: bool = True
    
    @property
    def is_production(self) -> bool:
        """Returns True when running in production environment"""
        return self.ENVIRONMENT.lower() == "production"

    model_config = SettingsConfigDict(
        env_file=str(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
