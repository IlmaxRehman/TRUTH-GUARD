from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
def health():
    return {
        "status": "healthy",
        "service": "TruthGuard API",
        "version": "2.0"
    }