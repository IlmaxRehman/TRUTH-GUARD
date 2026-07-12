from pydantic import BaseModel

from app.models.article_summary import ArticleSummary
from app.models.claim import Claim


class VerificationReport(BaseModel):

    article: ArticleSummary

    summary: str

    claims: list[Claim]