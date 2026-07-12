from app.models.article_summary import ArticleSummary
from app.models.verification_report import VerificationReport

from app.services.article_extractor import ArticleExtractor
from app.services.claim_extractor import ClaimExtractor
from app.services.evidence_retriever import EvidenceRetriever
from app.services.evidence_ranker import EvidenceRanker
from app.services.credibility_engine import CredibilityEngine
from app.services.explanation_generator import ExplanationGenerator

from app.core.logger import logger


class VerificationPipeline:

    def __init__(self):

        self.article_extractor = ArticleExtractor()

        self.claim_extractor = ClaimExtractor()

        self.evidence_retriever = EvidenceRetriever()

        self.evidence_ranker = EvidenceRanker()

        self.credibility_engine = CredibilityEngine()

        self.explanation_generator = ExplanationGenerator()

    def verify(self, url: str):

        logger.info("Verification pipeline started")

        logger.info(f"Extracting article from: {url}")

        article_data = self.article_extractor.extract(url)

        logger.info("Article extracted successfully")

        logger.info("Extracting claims")

        claims = self.claim_extractor.extract(
            article_data.content
        )

        logger.info(f"{len(claims)} claims extracted")

        scores = []

        for index, claim in enumerate(claims, start=1):

            logger.info(f"Processing claim {index}/{len(claims)}")

            evidence = self.evidence_retriever.search(
                claim.text
            )

            logger.info(f"Retrieved {len(evidence)} evidence sources")

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

            reason = self.explanation_generator.generate(
                claim,
                ranked,
                score
            )

            claim.evidence = ranked
            claim.credibility_score = score
            claim.verdict = verdict
            claim.confidence = confidence
            claim.reason = reason

            logger.info(
                f"Claim {index} scored {score:.2f} ({verdict})"
            )

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

        logger.info(
            f"Verification completed with overall score {overall_score:.2f}"
        )

        return VerificationReport(
            article=article,
            summary=summary,
            claims=claims,
        )