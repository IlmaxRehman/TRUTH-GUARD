from urllib.parse import urlparse

from app.core.trusted_sources import TRUSTED_DOMAINS
from app.models.evidence import Evidence


class CredibilityEngine:

    def get_source_score(self, url: str):

        domain = urlparse(url).netloc.lower()

        domain = domain.replace("www.", "")

        for trusted_domain, score in TRUSTED_DOMAINS.items():

            if trusted_domain in domain:
                return score

        return 0.60

    def calculate(self, evidence_list: list[Evidence]):

        if not evidence_list:
            return 0.0

        semantic = sum(e.score for e in evidence_list) / len(evidence_list)

        trust = sum(
            self.get_source_score(e.url)
            for e in evidence_list
        ) / len(evidence_list)

        final_score = (
            semantic * 0.65 +
            trust * 0.35
        ) * 100

        return round(final_score, 2)