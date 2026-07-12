from urllib.parse import urlparse

from tavily import TavilyClient

from app.config.settings import TAVILY_API_KEY
from app.core.trusted_domains import TRUSTED_DOMAINS
from app.models.evidence import Evidence


class EvidenceRetriever:

    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)

    def get_domain_score(self, url: str):

        domain = urlparse(url).netloc.lower()

        domain = domain.replace("www.", "")

        for trusted_domain, score in TRUSTED_DOMAINS.items():

            if trusted_domain in domain:
                return score

        return 30

    def search(self, claim: str):

        print("\n==============================")
        print("Searching claim:")
        print(claim)
        print("==============================")

        response = self.client.search(
            query=claim,
            search_depth="advanced",
            max_results=10,
        )

        evidence = []

        for item in response.get("results", []):

            similarity = item.get("score", 0)

            trust = self.get_domain_score(
                item.get("url", "")
            ) / 100

            final_rank = similarity * 0.65 + trust * 0.35

            evidence.append(
                (
                    final_rank,
                    Evidence(
                        title=item.get("title", ""),
                        url=item.get("url", ""),
                        snippet=item.get("content", ""),
                        score=similarity,
                    )
                )
            )

        evidence.sort(
            key=lambda x: x[0],
            reverse=True
        )

        return [item[1] for item in evidence[:3]]