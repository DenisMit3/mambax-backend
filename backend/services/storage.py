import os
import uuid
import shutil
from typing import List
from pathlib import Path
from fastapi import UploadFile, HTTPException
from backend.core.config import settings

class StorageService:
    def __init__(self):
        # Fix: Use absolute path relative to backend root to match FastAPI mount in main.py
        # backend/services/storage.py -> backend/services -> backend -> backend/static
        self.base_dir = Path(__file__).parent.parent / "static"
        self.base_dir.mkdir(exist_ok=True)
        self.max_file_size = 10 * 1024 * 1024  # 10 MB limit for photos
        self.allowed_image_types = ["image/jpeg", "image/png", "image/webp", "image/gif"]

    async def _save_file(self, file: UploadFile, subfolder: str) -> str:
        """
        Generic file saver with validation and sanitization.
        """
        try:
            from PIL import Image, ImageOps
            import io

            # 1. Read content
            content = await file.read()
            if len(content) > self.max_file_size:
                raise HTTPException(
                    status_code=413, 
                    detail=f"File too large. Max {self.max_file_size // (1024*1024)}MB allowed."
                )

            # 2. Strict Image Validation & Sanitization
            try:
                # Open image
                image = Image.open(io.BytesIO(content))
                
                # Force loading to verify data integrity
                image.load()
                
                # Auto-rotate based on EXIF before stripping it
                image = ImageOps.exif_transpose(image)
                
                # Convert to RGB (or RGBA) to normalize and strip metadata/embedded scripts
                if image.mode in ("RGBA", "LA") or (image.mode == "P" and "transparency" in image.info):
                    convert_mode = "RGBA"
                else:
                    convert_mode = "RGB"
                    
                clean_image = image.convert(convert_mode)
                
                # Optimize & Convert to WebP (Safe Format)
                output_buffer = io.BytesIO()
                clean_image.save(output_buffer, format="WEBP", quality=85, optimize=True)
                output_buffer.seek(0)
                
                # Generate safe filename
                filename = f"{uuid.uuid4()}.webp"
                
            except Exception as e:
                print(f"Security: Invalid image rejected: {e}")
                raise HTTPException(status_code=400, detail="Invalid image file or corrupt data")

            # 3. Save
            target_dir = self.base_dir / subfolder
            target_dir.mkdir(exist_ok=True, parents=True)
            
            file_path = target_dir / filename
            
            with open(file_path, "wb") as buffer:
                buffer.write(output_buffer.getbuffer())
            
            return f"/static/{subfolder}/{filename}"

        except HTTPException as he:
            raise he
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Storage error: {str(e)}")

    def delete_file(self, file_url: str):
        """
        Deletes a file from the local storage based on its public URL.
        """
        if not file_url:
            return

        # URL typically looks like /static/uploads/filename.ext or /static/gifts/filename.ext
        # We need to map it back to the local path
        if file_url.startswith("/static/"):
            relative_path = file_url[len("/static/"):]
            # SECURITY: Resolve and check if within base_dir to prevent path traversal
            try:
                # Use .name and .parent.name to ensure we stay within static/subfolder
                parts = Path(relative_path).parts
                if len(parts) < 2 or ".." in parts:
                    return

                file_path = (self.base_dir / Path(*parts)).resolve()
                
                if not str(file_path).startswith(str(self.base_dir.resolve())):
                    print(f"Path traversal attempt blocked: {file_url}")
                    return

                if file_path.exists() and file_path.is_file():
                    os.remove(file_path)
            except Exception as e:
                # Log error but don't fail the request (cleanup is best-effort)
                print(f"Failed to delete file {file_url}: {e}")

    async def save_gift_image(self, file: UploadFile) -> str:
        return await self._save_file(file, "gifts")

    async def save_user_photo(self, file: UploadFile) -> str:
        return await self._save_file(file, "uploads")
    
    async def save_verification_photo(self, file: UploadFile) -> str:
        # In prod this should be a private bucket
        return await self._save_file(file, "verifications")

storage_service = StorageService()
