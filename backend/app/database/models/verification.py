from sqlalchemy import Column, DateTime, Float, Integer, String, Text
from sqlalchemy.sql import func

from app.database.database import Base


class Verification(Base):

    __tablename__ = "verifications"

    id = Column(Integer, primary_key=True, index=True)

    url = Column(String, unique=True, index=True)

    title = Column(String)

    overall_score = Column(Float)

    overall_verdict = Column(String)

    summary = Column(Text)

    report_json = Column(Text)

    created_at = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )