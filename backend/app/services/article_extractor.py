import requests
import trafilatura

from app.models.article import Article


class ArticleExtractor:

    @staticmethod
    def extract(url: str) -> Article:

        headers = {
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 "
                "(KHTML, like Gecko) "
                "Chrome/137.0 Safari/537.36"
            )
        }

        response = requests.get(
            url,
            headers=headers,
            timeout=20
        )

        if response.status_code != 200:
            raise Exception(
                f"Website returned status code {response.status_code}"
            )

        downloaded = response.text

        content = trafilatura.extract(downloaded)

        if not content:
            raise Exception("Unable to extract article.")

        return Article(
            url=url,
            title="",
            content=content,
            word_count=len(content.split())
        )