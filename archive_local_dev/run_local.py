import sys
import os
import uvicorn
import shutil

# Очистка старых pycache
try:
    shutil.rmtree("backend/__pycache__", ignore_errors=True)
except:
    pass

# Настройка окружения
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./mambax.db"
os.environ["SECRET_KEY"] = "dev-secret-key"

if __name__ == "__main__":
    # Добавляем папку backend в системный путь, чтобы импорты работали
    # Теперь 'import crud' внутри main.py будет работать
    backend_path = os.path.join(os.getcwd(), "backend")
    sys.path.append(backend_path)

    print("🚀 Starting MambaX in LOCAL MODE (SQLite)")
    print(f"📂 Backend path added: {backend_path}")
    print("👉 URL: http://0.0.0.0:8001")
    
    # ВАЖНО: Запускаем не "backend.main:app", а просто "main:app", 
    # так как мы добавили backend в path.
    # reload_dirs указывает на корень, чтобы видеть изменения везде.
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8001, 
        reload=True, 
        reload_dirs=[os.getcwd()]
    )
