from pydantic import BaseModel


class ArticleSummary(BaseModel):
    title: str
    url: str

    overall_score: float

    overall_verdict: str

    confidence: str