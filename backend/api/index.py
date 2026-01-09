from main import app, seed_db
import database

# Endpoint для инициализации базы данных прямо здесь, чтобы точно сработал
@app.get("/api/init")
async def init_db():
    try:
        # Create tables
        async with database.engine.begin() as conn:
            await conn.run_sync(database.Base.metadata.create_all)
        
        # Seed
        async with database.async_session() as session:
            async with session.begin():
                await seed_db(session)
        
        return {"status": "success", "message": "Database initialized via api/index"}
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Vercel handler
app = app

