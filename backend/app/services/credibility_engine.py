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
            return 0

        semantic = sum(e.score for e in evidence_list) / len(evidence_list)

        trust = sum(
            self.get_source_score(e.url)
            for e in evidence_list
        ) / len(evidence_list)

        final = (
            semantic * 0.65 +
            trust * 0.35
        ) * 100

        return round(final, 2)

    def verdict(self, score: float):

        if score >= 90:
            return "Highly Credible", "Very High"

        if score >= 75:
            return "Likely Credible", "High"

        if score >= 60:
            return "Partially Supported", "Medium"

        if score >= 40:
            return "Weak Evidence", "Low"

        return "Not Supported", "Very Low"