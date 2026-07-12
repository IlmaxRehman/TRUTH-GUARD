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

        if not downloaded:
            raise Exception("Unable to download webpage.")

        content = trafilatura.extract(downloaded)

        if not content:
            raise Exception("Unable to extract article.")

        metadata = trafilatura.extract_metadata(downloaded)

        title = ""
        if metadata and metadata.title:
            title = metadata.title

        article = Article(
            url=url,
            title=title,
            word_count=len(content.split())
        )

        return ExtractedArticle(
            article=article,
            content=content
        )