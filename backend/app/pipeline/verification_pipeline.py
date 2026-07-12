from app.models.article_summary import ArticleSummary
from app.models.verification_report import VerificationReport

from app.services.article_extractor import ArticleExtractor
from app.services.claim_extractor import ClaimExtractor
from app.services.evidence_retriever import EvidenceRetriever
from app.services.evidence_ranker import EvidenceRanker
from app.services.credibility_engine import CredibilityEngine


class VerificationPipeline:

    def __init__(self):

        self.article_extractor = ArticleExtractor()

        self.claim_extractor = ClaimExtractor()

        self.evidence_retriever = EvidenceRetriever()

        self.evidence_ranker = EvidenceRanker()

        self.credibility_engine = CredibilityEngine()

    def verify(self, url: str):

        article_data = self.article_extractor.extract(url)

        claims = self.claim_extractor.extract(
            article_data.content
        )

        scores = []

        for claim in claims:

            evidence = self.evidence_retriever.search(
                claim.text
            )

            ranked = self.evidence_ranker.rank(
                claim.text,
                evidence
            )

            score = self.credibility_engine.calculate(
                ranked
            )

            verdict, confidence = (
                self.credibility_engine.verdict(score)
            )

            claim.evidence = ranked
            claim.credibility_score = score
            claim.verdict = verdict
            claim.confidence = confidence

            scores.append(score)

        overall_score = (
            sum(scores) / len(scores)
            if scores else 0
        )

        overall_verdict, overall_confidence = (
            self.credibility_engine.verdict(
                overall_score
            )
        )

        article = ArticleSummary(

            title=article_data.article.title,

            url=article_data.article.url,

            overall_score=round(overall_score, 2),

            overall_verdict=overall_verdict,

            confidence=overall_confidence,
        )

        summary = (
            f"This article contains {len(claims)} "
            f"important claims. "
            f"Overall credibility is "
            f"{overall_verdict.lower()}."
        )

        return VerificationReport(
            article=article,
            summary=summary,
            claims=claims,
        )