from pydantic import BaseModel


class AnalysisRequest(BaseModel):
    url: str


class AnalysisResponse(BaseModel):
    credibility_score: float
    confidence: float
    explanation: str