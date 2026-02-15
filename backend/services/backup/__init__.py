"""
Database Backup Service
=======================
Enterprise-grade backup system.

Пакет реэкспортирует все публичные символы для обратной совместимости:
    from backend.services.backup import backup_service, BackupType  # работает
"""

# Models
from backend.services.backup.models import (
    BackupType,
    BackupStatus,
    BackupResult,
)

# Service
from backend.services.backup.service import (
    DatabaseBackupService,
)

# Triggers & singleton
from backend.services.backup.triggers import (
    backup_service,
    trigger_backup,
)

__all__ = [
    # models
    "BackupType", "BackupStatus", "BackupResult",
    # service
    "DatabaseBackupService",
    # triggers
    "backup_service", "trigger_backup",
]
