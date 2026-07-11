import json

from app.models.claim import Claim
from app.services.llm.groq_service import GroqService


class ClaimExtractor:

    def __init__(self):

        self.llm = GroqService()

    def extract(self, article: str):

        prompt = f"""
Extract the 5 most important factual claims from the article.

Return ONLY valid JSON.

Example:

[
    {{
        "id":1,
        "text":"AI was founded in 1956."
    }},
    {{
        "id":2,
        "text":"Transformers became popular after 2017."
    }}
]

Article:

{article[:6000]}
"""

        response = self.llm.chat(prompt)

        try:

            data = json.loads(response)

            return [
                Claim(**item)
                for item in data
            ]

        except Exception:

            return []