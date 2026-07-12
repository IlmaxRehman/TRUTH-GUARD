import trafilatura
from newspaper import Article as NewspaperArticle

from app.models.article import Article


class ExtractedArticle:

    def __init__(self, article: Article, content: str):
        self.article = article
        self.content = content


class ArticleExtractor:

    @staticmethod
    def extract(url: str):

        # -----------------------------
        # Strategy 1 : Trafilatura
        # -----------------------------
        try:

            downloaded = trafilatura.fetch_url(url)

            if downloaded:

                content = trafilatura.extract(downloaded)

                metadata = trafilatura.extract_metadata(downloaded)

                if content:

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

        except Exception:
            pass

        # -----------------------------
        # Strategy 2 : Newspaper4k
        # -----------------------------
        try:

            article = NewspaperArticle(url)

            article.download()

            article.parse()

            if article.text:

                extracted = Article(
                    url=url,
                    title=article.title or "",
                    word_count=len(article.text.split())
                )

                return ExtractedArticle(
                    article=extracted,
                    content=article.text
                )

        except Exception:
            pass

        raise Exception(
            "Unable to extract article from this webpage."
        )