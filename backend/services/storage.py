# Storage Service — Neon PostgreSQL blob storage
# Stores processed images as bytea in photo_blobs table
# Returns URLs like /api/photos/{blob_id} for serving

import uuid
import logging
import asyncio
from typing import Optional

from fastapi import UploadFile, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def _process_image_sync(content: bytes) -> tuple[bytes, str]:
    """
    Синхронная обработка изображения через Pillow.
    Валидация, удаление EXIF, конвертация в WebP.
    Returns (processed_bytes, content_type).
    """
    from PIL import Image, ImageOps
    import io

    try:
        image = Image.open(io.BytesIO(content))
        image.load()  # Force full decode to catch corrupt files
    except Exception as e:
        logger.warning(f"Invalid image rejected: {e}")
        raise ValueError("Invalid or corrupt image file")

    # Strip EXIF, fix orientation
    image = ImageOps.exif_transpose(image)

    # Handle transparency
    if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
        clean = image.convert("RGBA")
    else:
        clean = image.convert("RGB")

    # Resize if too large (max 2048px on longest side)
    max_dim = 2048
    if max(clean.size) > max_dim:
        clean.thumbnail((max_dim, max_dim), Image.LANCZOS)

    # Save as WebP
    buf = io.BytesIO()
    clean.save(buf, format="WEBP", quality=85, optimize=True)
    buf.seek(0)

    return buf.getvalue(), "image/webp"


async def _process_image(content: bytes) -> tuple[bytes, str]:
    """
    Async-обёртка: запускает тяжёлую обработку Pillow в отдельном потоке,
    чтобы не блокировать event loop.
    """
    try:
        return await asyncio.to_thread(_process_image_sync, content)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class StorageService:
    """
    Production storage service using Neon PostgreSQL.
    Images are stored as bytea in photo_blobs table.
    """

    async def save_photo(
        self,
        file: UploadFile,
        db: AsyncSession,
        category: str = "uploads",
    ) -> str:
        """
        Process and save photo to PostgreSQL.
        Returns URL path: /api/photos/{blob_id}
        """
        from backend.models.user import PhotoBlob

        # 1. Validate content type
        if file.content_type not in ALLOWED_IMAGE_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type '{file.content_type}'. Allowed: {', '.join(ALLOWED_IMAGE_TYPES)}"
            )

        # 2. Read and validate size
        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File too large. Max {MAX_FILE_SIZE // (1024*1024)}MB allowed."
            )

        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        # 3. Process image (validate, strip EXIF, optimize, convert to WebP)
        processed_data, content_type = await _process_image(content)

        # 4. Save to PostgreSQL
        blob = PhotoBlob(
            data=processed_data,
            content_type=content_type,
            size_bytes=len(processed_data),
            original_filename=file.filename,
        )
        db.add(blob)
        await db.flush()  # Get the ID without committing

        url = f"/api/photos/{blob.id}"
        logger.info(f"Photo saved to DB: {url} ({len(processed_data)} bytes, {category})")
        return url

    async def delete_photo(self, photo_url: str, db: AsyncSession) -> bool:
        """
        Delete photo blob from PostgreSQL by URL.
        """
        from backend.models.user import PhotoBlob
        from sqlalchemy import select

        if not photo_url or not photo_url.startswith("/api/photos/"):
            # Legacy URL or external — skip silently
            logger.debug(f"Skipping delete for non-blob URL: {photo_url}")
            return False

        try:
            blob_id = uuid.UUID(photo_url.split("/api/photos/")[1])
        except (ValueError, IndexError):
            logger.warning(f"Invalid photo URL for delete: {photo_url}")
            return False

        result = await db.execute(select(PhotoBlob).where(PhotoBlob.id == blob_id))
        blob = result.scalar_one_or_none()
        if blob:
            await db.delete(blob)
            logger.info(f"Photo blob deleted: {blob_id}")
            return True

        logger.warning(f"Photo blob not found for delete: {blob_id}")
        return False

    async def get_photo(self, photo_id: uuid.UUID, db: AsyncSession) -> Optional[tuple[bytes, str]]:
        """
        Retrieve photo data and content_type from PostgreSQL.
        Returns (data, content_type) or None.
        """
        from backend.models.user import PhotoBlob
        from sqlalchemy import select

        result = await db.execute(select(PhotoBlob).where(PhotoBlob.id == photo_id))
        blob = result.scalar_one_or_none()
        if blob:
            return blob.data, blob.content_type
        return None

    # --- Convenience methods matching old API ---

    async def save_user_photo(self, file: UploadFile, db: AsyncSession) -> str:
        return await self.save_photo(file, db, category="uploads")

    async def save_verification_photo(self, file: UploadFile, db: AsyncSession) -> str:
        return await self.save_photo(file, db, category="verifications")

    async def save_gift_image(self, file: UploadFile, db: AsyncSession) -> str:
        return await self.save_photo(file, db, category="gifts")

    # Допустимые аудио-форматы для голосовых сообщений
    ALLOWED_AUDIO_TYPES = {"audio/ogg", "audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/x-wav"}

    async def save_voice_message(self, file: UploadFile, db: AsyncSession) -> tuple[str, int]:
        """
        Save voice message as blob (no image processing).
        Returns (url, duration). Duration detection is best-effort.
        """
        from backend.models.user import PhotoBlob

        # Валидация content-type аудиофайла
        if file.content_type and file.content_type not in self.ALLOWED_AUDIO_TYPES:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid audio format '{file.content_type}'. Allowed: {', '.join(self.ALLOWED_AUDIO_TYPES)}"
            )

        content = await file.read()
        if len(content) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File too large")
        if len(content) == 0:
            raise HTTPException(status_code=400, detail="Empty file")

        blob = PhotoBlob(
            data=content,
            content_type=file.content_type or "audio/ogg",
            size_bytes=len(content),
            original_filename=file.filename,
        )
        db.add(blob)
        await db.flush()

        url = f"/api/photos/{blob.id}"
        logger.info(f"Voice saved to DB: {url} ({len(content)} bytes)")
        return url, 0  # Duration detection not implemented yet

    def delete_file(self, file_url: str):
        """
        Legacy sync delete — no-op for DB storage.
        Use delete_photo(url, db) for async DB deletion.
        """
        logger.debug(f"Legacy delete_file called for: {file_url} (no-op, use delete_photo)")

    def get_cdn_url(self, file_url: str) -> str:
        """Backward compat — just return the URL as-is for DB storage."""
        return file_url


storage_service = StorageService()
