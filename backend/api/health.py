# Health Check endpoint - Проверка состояния сервера

from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """
    Эндпоинт для проверки работоспособности сервера.
    Возвращает {"status": "ok"} если сервер работает.
    """
    return {"status": "ok"}
