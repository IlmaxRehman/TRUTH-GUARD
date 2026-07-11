from pydantic import BaseModel


class Article(BaseModel):
    url: str
    title: str
    content: str
    word_count: int