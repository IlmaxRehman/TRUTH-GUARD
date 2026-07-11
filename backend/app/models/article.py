from pydantic import BaseModel


class Article(BaseModel):
    url: str
    title: str
    
    word_count: int