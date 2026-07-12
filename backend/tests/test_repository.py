from app.repositories.verification_repository import VerificationRepository
from app.database.models.verification import Verification

from tests.conftest import get_test_db


def test_save_verification():

    db = next(get_test_db())

    repo = VerificationRepository(db)

    verification = Verification(
        url="https://example.com",
        title="Example",
        overall_score=90,
        overall_verdict="Highly Credible",
        summary="Test Summary",
        report_json='{"ok": true}'
    )

    db.add(verification)
    db.commit()

    saved = repo.get_by_url("https://example.com")

    assert saved is not None
    assert saved.title == "Example"
    assert saved.overall_score == 90


def test_missing_verification():

    db = next(get_test_db())

    repo = VerificationRepository(db)

    result = repo.get_by_url("https://does-not-exist.com")

    assert result is None