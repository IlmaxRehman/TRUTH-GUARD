from tavily import TavilyClient

from app.config.settings import TAVILY_API_KEY


class EvidenceRetriever:

    def __init__(self):
        self.client = TavilyClient(api_key=TAVILY_API_KEY)

    def search(self, claim: str):

        response = self.client.search(
            query=claim,
            search_depth="advanced",
            max_results=5
        )

        return response.get("results", [])