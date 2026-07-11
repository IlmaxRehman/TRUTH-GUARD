from pydantic import BaseModel


class Evidence(BaseModel):
    title: str
    url: str
    snippet: str
    score: float = 0.0