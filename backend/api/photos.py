# Photo serving endpoint — serves images from Neon PostgreSQL blob storage

import uuid
import logging

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from backend.db.session import get_db
from backend.services.storage import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/photos", tags=["photos"])


@router.get("/{photo_id}")
async def serve_photo(
    photo_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    """
    Serve a photo from PostgreSQL blob storage.
    Returns binary image data with proper Content-Type and caching headers.
    """
    result = await storage_service.get_photo(photo_id, db)
    if result is None:
        raise HTTPException(status_code=404, detail="Photo not found")

    data, content_type = result

    return Response(
        content=data,
        media_type=content_type,
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",  # 1 year — blobs are immutable
            "Content-Length": str(len(data)),
        },
    )
