from pydantic import BaseModel

from app.models.article import Article
from app.models.claim import Claim


class AnalysisResult(BaseModel):

    article: Article

    claims: list[Claim]