from fastapi import APIRouter, HTTPException

from app.models.analysis_result import AnalysisResult
from app.schemas.analysis import AnalysisRequest

from app.services.article_extractor import ArticleExtractor
from app.services.claim_extractor import ClaimExtractor

router = APIRouter()


@router.post("/analyze", response_model=AnalysisResult)
def analyze(request: AnalysisRequest):

    try:

        article_data = ArticleExtractor.extract(request.url)

        extractor = ClaimExtractor()

        claims = extractor.extract(article_data.content)

        return AnalysisResult(
            article=article_data.article,
            claims=claims
        )

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )