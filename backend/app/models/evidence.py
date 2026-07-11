from pydantic import BaseModel


class Evidence(BaseModel):
    source: str
    url: str
    snippet: str
    score: float