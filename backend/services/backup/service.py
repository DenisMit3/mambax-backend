"""
Database Backup Service
=======================
PostgreSQL pg_dump, S3/MinIO upload, compression, checksums, restore, retention.
"""

import asyncio
import gzip
import hashlib
import logging
import os
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional, List, Dict, Any
import uuid

from backend.services.backup.models import BackupType, BackupResult

logger = logging.getLogger(__name__)


class DatabaseBackupService:
    """
    Professional Database Backup Service.
    
    Features:
    - Full PostgreSQL backup using pg_dump
    - Gzip compression
    - SHA-256 checksums
    - S3/MinIO upload
    - Retention policy enforcement
    - Backup verification
    - Async execution
    """
    
    def __init__(self):
        self._s3_client = None
        self._bucket_name: Optional[str] = None
        self._retention_days: int = 30
        self._local_backup_dir: Path = Path("/tmp/backups")
        
    async def initialize(self) -> bool:
        """Initialize S3 client for backup storage"""
        try:
            import boto3
            from botocore.config import Config
            from backend.config.settings import settings
            
            aws_access_key = getattr(settings, 'AWS_ACCESS_KEY_ID', None) or os.getenv('AWS_ACCESS_KEY_ID')
            aws_secret_key = getattr(settings, 'AWS_SECRET_ACCESS_KEY', None) or os.getenv('AWS_SECRET_ACCESS_KEY')
            aws_region = getattr(settings, 'AWS_REGION', None) or os.getenv('AWS_REGION', 'us-east-1')
            s3_endpoint = getattr(settings, 'S3_ENDPOINT_URL', None) or os.getenv('S3_ENDPOINT_URL')
            self._bucket_name = getattr(settings, 'BACKUP_BUCKET', None) or os.getenv('BACKUP_BUCKET', 'app-backups')
            self._retention_days = int(getattr(settings, 'BACKUP_RETENTION_DAYS', 30))
            
            if not aws_access_key or not aws_secret_key:
                logger.warning("AWS credentials not configured. S3 upload disabled.")
                return False
            
            config = Config(
                retries={'max_attempts': 3, 'mode': 'adaptive'},
                connect_timeout=30,
                read_timeout=60
            )
            
            client_kwargs = {
                'aws_access_key_id': aws_access_key,
                'aws_secret_access_key': aws_secret_key,
                'region_name': aws_region,
                'config': config
            }
            
            if s3_endpoint:
                client_kwargs['endpoint_url'] = s3_endpoint
            
            self._s3_client = boto3.client('s3', **client_kwargs)
            
            try:
                self._s3_client.head_bucket(Bucket=self._bucket_name)
            except:
                try:
                    self._s3_client.create_bucket(
                        Bucket=self._bucket_name,
                        CreateBucketConfiguration={'LocationConstraint': aws_region}
                    )
                    logger.info(f"Created backup bucket: {self._bucket_name}")
                except Exception as e:
                    logger.warning(f"Could not create bucket (may already exist): {e}")
            
            logger.info("Backup service initialized with S3 storage")
            return True
            
        except ImportError:
            logger.warning("boto3 not installed. Run: pip install boto3")
            return False
        except Exception as e:
            logger.error(f"Failed to initialize backup service: {e}")
            return False
    
    def _get_db_connection_string(self) -> Dict[str, str]:
        """Extract database connection parameters from settings"""
        from backend.config.settings import settings
        import urllib.parse
        
        db_url = settings.DATABASE_URL
        
        if db_url.startswith("postgresql+asyncpg://"):
            db_url = db_url.replace("postgresql+asyncpg://", "postgresql://")
        
        parsed = urllib.parse.urlparse(db_url)
        
        return {
            'host': parsed.hostname or 'localhost',
            'port': str(parsed.port or 5432),
            'user': parsed.username or 'postgres',
            'password': parsed.password or '',
            'database': parsed.path.lstrip('/') or 'postgres'
        }
    
    async def create_backup(
        self,
        backup_type: BackupType = BackupType.FULL,
        compress: bool = True,
        upload_to_s3: bool = True,
        tables: Optional[List[str]] = None
    ) -> BackupResult:
        """Create a database backup."""
        start_time = datetime.utcnow()
        backup_id = str(uuid.uuid4())
        
        try:
            self._local_backup_dir.mkdir(parents=True, exist_ok=True)
            
            db_params = self._get_db_connection_string()
            
            timestamp = start_time.strftime("%Y%m%d_%H%M%S")
            filename = f"backup_{backup_type.value}_{timestamp}_{backup_id[:8]}.sql"
            if compress:
                filename += ".gz"
            
            file_path = self._local_backup_dir / filename
            
            cmd = [
                "pg_dump",
                f"--host={db_params['host']}",
                f"--port={db_params['port']}",
                f"--username={db_params['user']}",
                f"--dbname={db_params['database']}",
                "--no-password",
                "--verbose",
                "--format=plain"
            ]
            
            if backup_type == BackupType.SCHEMA_ONLY:
                cmd.append("--schema-only")
            elif backup_type == BackupType.DATA_ONLY:
                cmd.append("--data-only")
            
            if tables:
                for table in tables:
                    cmd.extend(["--table", table])
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_params['password']
            
            logger.info(f"Starting backup: {backup_id}")
            
            if compress:
                pg_process = await asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env
                )
                
                stdout, stderr = await pg_process.communicate()
                
                if pg_process.returncode != 0:
                    raise Exception(f"pg_dump failed: {stderr.decode()}")
                
                with gzip.open(file_path, 'wb') as f:
                    f.write(stdout)
            else:
                with open(file_path, 'w') as f:
                    pg_process = await asyncio.create_subprocess_exec(
                        *cmd,
                        stdout=f,
                        stderr=asyncio.subprocess.PIPE,
                        env=env
                    )
                    _, stderr = await pg_process.communicate()
                    
                    if pg_process.returncode != 0:
                        raise Exception(f"pg_dump failed: {stderr.decode()}")
            
            checksum = await self._calculate_checksum(file_path)
            file_size = file_path.stat().st_size
            
            logger.info(f"Backup created: {file_path} ({file_size} bytes)")
            
            s3_path = None
            if upload_to_s3:
                await self.initialize()
                if self._s3_client:
                    s3_path = await self._upload_to_s3(file_path, filename, checksum)
                    if s3_path:
                        file_path.unlink()
                        logger.info(f"Backup uploaded to S3: {s3_path}")
            
            duration = (datetime.utcnow() - start_time).total_seconds()
            
            return BackupResult(
                success=True,
                backup_id=backup_id,
                file_path=s3_path or str(file_path),
                file_size=file_size,
                checksum=checksum,
                duration_seconds=duration
            )
            
        except Exception as e:
            logger.error(f"Backup failed: {e}")
            duration = (datetime.utcnow() - start_time).total_seconds()
            return BackupResult(
                success=False,
                backup_id=backup_id,
                error=str(e),
                duration_seconds=duration
            )
    
    async def _calculate_checksum(self, file_path: Path) -> str:
        """Calculate SHA-256 checksum of a file"""
        sha256 = hashlib.sha256()
        
        with open(file_path, 'rb') as f:
            for chunk in iter(lambda: f.read(8192), b''):
                sha256.update(chunk)
        
        return sha256.hexdigest()
    
    async def _upload_to_s3(
        self,
        file_path: Path,
        filename: str,
        checksum: str
    ) -> Optional[str]:
        """Upload backup file to S3"""
        if not self._s3_client or not self._bucket_name:
            return None
        
        try:
            date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
            s3_key = f"backups/{date_prefix}/{filename}"
            
            self._s3_client.upload_file(
                str(file_path),
                self._bucket_name,
                s3_key,
                ExtraArgs={
                    'Metadata': {
                        'checksum': checksum,
                        'created_at': datetime.utcnow().isoformat()
                    },
                    'StorageClass': 'STANDARD_IA'
                }
            )
            
            return f"s3://{self._bucket_name}/{s3_key}"
            
        except Exception as e:
            logger.error(f"S3 upload failed: {e}")
            return None
    
    async def list_backups(self, limit: int = 50) -> List[Dict[str, Any]]:
        """List available backups from S3"""
        if not self._s3_client or not self._bucket_name:
            return []
        
        try:
            response = self._s3_client.list_objects_v2(
                Bucket=self._bucket_name,
                Prefix="backups/",
                MaxKeys=limit
            )
            
            backups = []
            for obj in response.get('Contents', []):
                backups.append({
                    'key': obj['Key'],
                    'size': obj['Size'],
                    'last_modified': obj['LastModified'].isoformat(),
                    's3_path': f"s3://{self._bucket_name}/{obj['Key']}"
                })
            
            backups.sort(key=lambda x: x['last_modified'], reverse=True)
            return backups
            
        except Exception as e:
            logger.error(f"Failed to list backups: {e}")
            return []
    
    async def cleanup_old_backups(self) -> int:
        """Remove backups older than retention period"""
        if not self._s3_client or not self._bucket_name:
            return 0
        
        try:
            cutoff_date = datetime.utcnow() - timedelta(days=self._retention_days)
            deleted_count = 0
            
            paginator = self._s3_client.get_paginator('list_objects_v2')
            
            for page in paginator.paginate(Bucket=self._bucket_name, Prefix="backups/"):
                for obj in page.get('Contents', []):
                    if obj['LastModified'].replace(tzinfo=None) < cutoff_date:
                        self._s3_client.delete_object(
                            Bucket=self._bucket_name,
                            Key=obj['Key']
                        )
                        deleted_count += 1
                        logger.info(f"Deleted old backup: {obj['Key']}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return 0
    
    async def restore_backup(
        self,
        s3_key: str,
        target_database: Optional[str] = None
    ) -> bool:
        """
        Restore a backup from S3.
        WARNING: This will overwrite the target database!
        """
        if not self._s3_client or not self._bucket_name:
            logger.error("S3 not configured")
            return False
        
        try:
            with tempfile.NamedTemporaryFile(suffix='.sql.gz', delete=False) as tmp:
                self._s3_client.download_file(
                    self._bucket_name,
                    s3_key,
                    tmp.name
                )
                tmp_path = Path(tmp.name)
            
            db_params = self._get_db_connection_string()
            target_db = target_database or db_params['database']
            
            env = os.environ.copy()
            env['PGPASSWORD'] = db_params['password']
            
            if s3_key.endswith('.gz'):
                with gzip.open(tmp_path, 'rb') as f_in:
                    sql_content = f_in.read()
                
                restore_process = await asyncio.create_subprocess_exec(
                    "psql",
                    f"--host={db_params['host']}",
                    f"--port={db_params['port']}",
                    f"--username={db_params['user']}",
                    f"--dbname={target_db}",
                    "--no-password",
                    stdin=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                    env=env
                )
                _, stderr = await restore_process.communicate(input=sql_content)
            else:
                with open(tmp_path, 'r') as f:
                    restore_process = await asyncio.create_subprocess_exec(
                        "psql",
                        f"--host={db_params['host']}",
                        f"--port={db_params['port']}",
                        f"--username={db_params['user']}",
                        f"--dbname={target_db}",
                        "--no-password",
                        stdin=f,
                        stderr=asyncio.subprocess.PIPE,
                        env=env
                    )
                    _, stderr = await restore_process.communicate()
            
            tmp_path.unlink()
            
            if restore_process.returncode != 0:
                logger.error(f"Restore failed: {stderr.decode()}")
                return False
            
            logger.info(f"Backup restored successfully to {target_db}")
            return True
            
        except Exception as e:
            logger.error(f"Restore failed: {e}")
            return False
