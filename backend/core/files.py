# File Storage - Утилиты для сохранения загруженных файлов

import os
import shutil
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile

# Директория для загрузок
UPLOAD_DIR = Path("static/uploads")


def save_upload_file(upload_file: UploadFile, destination: Path = UPLOAD_DIR) -> str:
    """
    Сохраняет загруженный файл в локальное хранилище.
    
    Args:
        upload_file: Файл из формы UploadFile
        destination: Путь к директории сохранения
        
    Returns:
        str: URL сохранённого файла (относительно корня сайта)
    """
    # Создаём директорию, если нет
    os.makedirs(destination, exist_ok=True)
    
    # Генерируем уникальное имя
    # Получаем расширение оригинального файла
    filename = upload_file.filename
    ext = os.path.splitext(filename)[1] if filename else ".jpg"
    
    # Новое имя: uuid + расширение
    new_filename = f"{uuid4()}{ext}"
    file_path = destination / new_filename
    
    # Сохраняем файл
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(upload_file.file, buffer)
        
    # Возвращаем URL
    # В Windows разделитель путей \, меняем на / для URL
    relative_path = f"/static/uploads/{new_filename}"
    return relative_path
