from fastapi import APIRouter, HTTPException

from app.pipeline.verification_pipeline import VerificationPipeline
from app.schemas.analysis import AnalysisRequest

router = APIRouter()


@router.post("/verify")
def verify(request: AnalysisRequest):

    try:

        pipeline = VerificationPipeline()

        return pipeline.verify(request.url)

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )