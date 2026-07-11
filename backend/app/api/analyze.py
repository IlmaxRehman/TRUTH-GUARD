from fastapi import APIRouter

router = APIRouter()

@router.post("/analyze")
def analyze():
    return {
        "message": "Analysis endpoint is working.",
        "status": "success"
    }