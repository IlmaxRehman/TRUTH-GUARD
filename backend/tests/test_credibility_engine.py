from app.services.credibility_engine import CredibilityEngine

engine = CredibilityEngine()


def test_empty_evidence():
    score = engine.calculate([])
    assert score == 0


def test_verdict_high():
    verdict, confidence = engine.verdict(90)

    assert verdict == "Highly Credible"
    assert confidence == "Very High"


def test_verdict_medium():
    verdict, confidence = engine.verdict(70)

    assert verdict == "Partially Supported"
    assert confidence == "Medium"


def test_verdict_low():
    verdict, confidence = engine.verdict(30)

    assert verdict == "Unsupported"
    assert confidence == "Very Low"