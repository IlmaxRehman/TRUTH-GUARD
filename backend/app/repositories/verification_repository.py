import json

from sqlalchemy.orm import Session

from app.database.models.verification import Verification


class VerificationRepository:

    def __init__(self, db: Session):
        self.db = db

    def get_by_url(self, url: str):

        return (
            self.db.query(Verification)
            .filter(Verification.url == url)
            .first()
        )

    def save(self, report):

        verification = Verification(

            url=report.article.url,

            title=report.article.title,

            overall_score=report.article.overall_score,

            overall_verdict=report.article.overall_verdict,

            summary=report.summary,

            report_json=report.model_dump_json()
        )

        self.db.add(verification)

        self.db.commit()

        self.db.refresh(verification)

        return verification