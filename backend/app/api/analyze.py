from fastapi import APIRouter, HTTPException

from app.schemas.analysis import AnalysisRequest
from app.services.article_extractor import ArticleExtractor

router = APIRouter()


@router.post("/analyze")
def analyze(request: AnalysisRequest):

    try:

        article = ArticleExtractor.extract(request.url)

        return article

    except Exception as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )