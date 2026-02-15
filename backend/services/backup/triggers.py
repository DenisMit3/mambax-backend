"""
Backup Triggers
===============
Singleton backup_service и trigger_backup для вызова из API/tasks.
"""

import uuid
import logging
from datetime import datetime
from typing import Optional, Dict, Any

from sqlalchemy.ext.asyncio import AsyncSession

from backend.services.backup.models import BackupType, BackupStatus
from backend.services.backup.service import DatabaseBackupService

logger = logging.getLogger(__name__)

# Singleton instance
backup_service = DatabaseBackupService()


async def trigger_backup(
    db: AsyncSession,
    backup_type: str = "full",
    admin_id: Optional[uuid.UUID] = None
) -> Dict[str, Any]:
    """
    Trigger a database backup and record status in DB.
    """
    from backend.models.system import BackupStatus as BackupStatusModel
    
    backup_record = BackupStatusModel(
        id=uuid.uuid4(),
        status=BackupStatus.IN_PROGRESS.value,
        backup_type=backup_type,
        started_at=datetime.utcnow(),
        triggered_by=admin_id
    )
    db.add(backup_record)
    await db.commit()
    
    try:
        result = await backup_service.create_backup(
            backup_type=BackupType(backup_type),
            compress=True,
            upload_to_s3=True
        )
        
        backup_record.status = BackupStatus.COMPLETED.value if result.success else BackupStatus.FAILED.value
        backup_record.completed_at = datetime.utcnow()
        backup_record.file_path = result.file_path
        backup_record.file_size = result.file_size
        backup_record.checksum = result.checksum
        backup_record.error_message = result.error
        
        await db.commit()
        
        return {
            "success": result.success,
            "backup_id": str(backup_record.id),
            "file_path": result.file_path,
            "file_size": result.file_size,
            "checksum": result.checksum,
            "duration_seconds": result.duration_seconds,
            "error": result.error
        }
        
    except Exception as e:
        backup_record.status = BackupStatus.FAILED.value
        backup_record.error_message = str(e)
        await db.commit()
        
        return {
            "success": False,
            "backup_id": str(backup_record.id),
            "error": str(e)
        }
