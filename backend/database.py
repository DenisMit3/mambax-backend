from backend.db import engine, async_session_maker, get_db, Base

# Алиасы для совместимости с основным приложением
async_session = async_session_maker
AsyncSessionLocal = async_session_maker
engine = engine
Base = Base
get_db = get_db

