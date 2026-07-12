from pydantic import BaseModel, Field

from app.models.evidence import Evidence


class Claim(BaseModel):
    id: int
    text: str

    evidence: list[Evidence] = Field(default_factory=list)

    credibility_score: float | None = None

    verdict: str | None = None

    confidence: str | None = None