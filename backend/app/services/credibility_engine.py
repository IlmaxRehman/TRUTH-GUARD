from urllib.parse import urlparse

from app.core.trusted_domains import TRUSTED_DOMAINS
from app.models.evidence import Evidence


class CredibilityEngine:

    def get_source_score(self, url: str):

        domain = urlparse(url).netloc.lower()

        domain = domain.replace("www.", "")

        for trusted_domain, score in TRUSTED_DOMAINS.items():

            if trusted_domain in domain:
                return score

        return 30

    def calculate(self, evidence_list: list[Evidence]):

        if not evidence_list:
            return 0

        semantic_score = (
            sum(e.score for e in evidence_list)
            / len(evidence_list)
        ) * 100

        trust_score = (
            sum(
                self.get_source_score(e.url)
                for e in evidence_list
            )
            / len(evidence_list)
        )

        unique_domains = {

            urlparse(e.url).netloc.replace("www.", "")

            for e in evidence_list

        }

        diversity_score = min(

            len(unique_domains) * 15,

            100

        )

        final_score = (

            semantic_score * 0.50 +

            trust_score * 0.35 +

            diversity_score * 0.15

        )

        return round(final_score, 2)

    def verdict(self, score: float):

        if score >= 90:
            return "Highly Credible", "Very High"

        elif score >= 75:
            return "Likely Credible", "High"

        elif score >= 60:
            return "Partially Supported", "Medium"

        elif score >= 40:
            return "Weak Evidence", "Low"

        else:
            return "Unsupported", "Very Low"