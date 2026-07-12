from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database.database import get_db
from app.schemas.analysis import AnalysisRequest
from app.services.verification.verification_service import VerificationService

router = APIRouter()


@router.post("/verify")
def verify(
    request: AnalysisRequest,
    db: Session = Depends(get_db)
):

    try:

        service = VerificationService(db)

        return service.verify(request.url)

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )