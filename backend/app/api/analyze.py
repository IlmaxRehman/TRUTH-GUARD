from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.pipeline.verification_pipeline import VerificationPipeline
from app.repositories.verification_repository import VerificationRepository
from app.schemas.analysis import AnalysisRequest
import json

router = APIRouter()


@router.post("/verify")
def verify(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):

    try:

        repository = VerificationRepository(db)

        cached = repository.get_by_url(request.url)

        if cached:

            from app.core.logger import logger

            logger.info(
              f"Cache hit for URL: {request.url}"
            )

            return json.loads(cached.report_json)

        pipeline = VerificationPipeline()

        report = pipeline.verify(request.url)

        repository.save(report)

        return report

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )