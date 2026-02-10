# =============================================
# MAMBAX SETTINGS
# =============================================
# ВАЖНО: Единственная разрешенная БД - Neon PostgreSQL
# Использование SQLite, локального PostgreSQL ЗАПРЕЩЕНО
# =============================================

from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field, field_validator
from typing import Optional
from pathlib import Path

# Get the path to the backend directory
BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    PROJECT_NAME: str = "MambaX"
    
    # Database - ONLY Neon PostgreSQL
    DATABASE_URL: str = Field(
        ...,
        description="Neon PostgreSQL URL. SQLite и локальный PostgreSQL ЗАПРЕЩЕНЫ!"
    )
    
    # Redis (optional for caching)
    REDIS_URL: Optional[str] = None
    
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
    FIREBASE_CREDENTIALS: Optional[str] = None
    
    # AWS (S3 Backups)
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    S3_ENDPOINT_URL: Optional[str] = None
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
    ADMIN_TELEGRAM_ID: Optional[str] = None
    SEED_ON_STARTUP: bool = Field(False)
    
    # Scheduler
    ENABLE_SCHEDULER: bool = True
    
    @field_validator('DATABASE_URL')
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """
        Валидация DATABASE_URL - разрешен ТОЛЬКО Neon PostgreSQL.
        SQLite и локальный PostgreSQL ЗАПРЕЩЕНЫ.
        """
        if not v:
            raise ValueError(
                "DATABASE_URL обязателен! Используйте Neon PostgreSQL: "
                "postgresql+asyncpg://...@...neon.tech/..."
            )
        
        v_lower = v.lower()
        
        # Запрет SQLite
        if "sqlite" in v_lower:
            raise ValueError(
                "SQLite ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
                "Получите бесплатную БД на https://neon.tech"
            )
        
        # Запрет локального PostgreSQL
        if "localhost" in v_lower or "127.0.0.1" in v_lower:
            raise ValueError(
                "Локальный PostgreSQL ЗАПРЕЩЕН! Используйте только Neon PostgreSQL. "
                "Получите бесплатную БД на https://neon.tech"
            )
        
        # Проверка что это Neon
        if "neon.tech" not in v_lower and "neon" not in v_lower:
            # Разрешаем другие облачные PostgreSQL (Supabase, Railway) но предупреждаем
            import warnings
            warnings.warn(
                f"DATABASE_URL не содержит 'neon.tech'. "
                f"Рекомендуется использовать Neon PostgreSQL."
            )
        
        return v
    
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
