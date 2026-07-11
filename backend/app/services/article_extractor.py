import trafilatura

from app.models.article import Article


class ExtractedArticle:

    def __init__(self, article: Article, content: str):
        self.article = article
        self.content = content


class ArticleExtractor:

    @staticmethod
    def extract(url: str):

        downloaded = trafilatura.fetch_url(url)

        if downloaded is None:
            raise Exception("Failed to download webpage.")

        content = trafilatura.extract(downloaded)

        if content is None:
            raise Exception("Failed to extract article.")

        article = Article(
            url=url,
            title="",
            word_count=len(content.split())
        )

        return ExtractedArticle(
            article=article,
            content=content
        )