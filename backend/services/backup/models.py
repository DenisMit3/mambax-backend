"""
Backup Models
=============
Типы, статусы и результат бэкапа.
"""

from datetime import datetime
from typing import Optional
from enum import Enum


class BackupType(str, Enum):
    FULL = "full"
    INCREMENTAL = "incremental"
    SCHEMA_ONLY = "schema_only"
    DATA_ONLY = "data_only"


class BackupStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    UPLOADING = "uploading"
    VERIFIED = "verified"


class BackupResult:
    """Result of a backup operation"""
    def __init__(
        self,
        success: bool,
        backup_id: Optional[str] = None,
        file_path: Optional[str] = None,
        file_size: int = 0,
        checksum: Optional[str] = None,
        error: Optional[str] = None,
        duration_seconds: float = 0
    ):
        self.success = success
        self.backup_id = backup_id
        self.file_path = file_path
        self.file_size = file_size
        self.checksum = checksum
        self.error = error
        self.duration_seconds = duration_seconds
        self.timestamp = datetime.utcnow()
