from fastapi import FastAPI
from app.database.database import Base, engine
from app.api.health import router as health_router
from app.api.analyze import router as analyze_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="TruthGuard API",
    version="2.0.0",
    description="AI-powered News Verification Engine"
)

app.include_router(health_router)
app.include_router(analyze_router)

@app.get("/")
def root():
    return {
        "project": "TruthGuard",
        "version": "2.0",
        "message": "TruthGuard API is running."
    }