from pydantic import BaseModel


class Claim(BaseModel):
    id: int
    text: str