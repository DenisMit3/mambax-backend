from backend.db.session import engine, async_session_maker, get_db
from backend.db.base import Base

# Wrapper to match the interface expected by main.py
async_session = async_session_maker
AsyncSessionLocal = async_session_maker

