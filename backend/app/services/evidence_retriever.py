from tavily import TavilyClient

from app.config.settings import TAVILY_API_KEY
from app.models.evidence import Evidence


class EvidenceRetriever:

    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)

    def search(self, claim: str):

        print("\n==============================")
        print("Searching claim:")
        print(claim)
        print("==============================")

        response = self.client.search(
            query=claim,
            search_depth="advanced",
            max_results=5,
        )

        print(response)

        evidence = []

        for item in response.get("results", []):

            evidence.append(
                Evidence(
                    title=item.get("title", ""),
                    url=item.get("url", ""),
                    snippet=item.get("content", ""),
                    score=0.0,
                )
            )

        return evidence