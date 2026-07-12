from sqlalchemy.orm import Session

from app.pipeline.verification_pipeline import VerificationPipeline
from app.repositories.verification_repository import VerificationRepository
from app.core.logger import logger

import json


class VerificationService:

    def __init__(self, db: Session):

        self.repository = VerificationRepository(db)
        self.pipeline = VerificationPipeline()

    def verify(self, url: str):

        logger.info(f"Verification requested: {url}")

        cached = self.repository.get_by_url(url)

        if cached:

            logger.info(f"Cache hit: {url}")

            return json.loads(cached.report_json)

        logger.info("Cache miss. Running verification pipeline.")

        report = self.pipeline.verify(url)

        self.repository.save(report)

        logger.info("Verification saved to database.")

        return report