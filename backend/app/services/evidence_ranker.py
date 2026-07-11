from sentence_transformers import SentenceTransformer
from sentence_transformers.util import cos_sim

from app.models.evidence import Evidence


class EvidenceRanker:

    def __init__(self):

        self.model = SentenceTransformer(
            "BAAI/bge-small-en-v1.5"
        )

    def rank(self, claim: str, evidence_list: list[Evidence]):

        if not evidence_list:
            return []

        claim_embedding = self.model.encode(
            claim,
            convert_to_tensor=True
        )

        for evidence in evidence_list:

            evidence_embedding = self.model.encode(
                evidence.snippet,
                convert_to_tensor=True
            )

            similarity = cos_sim(
                claim_embedding,
                evidence_embedding
            ).item()

            evidence.score = round(float(similarity), 3)

        evidence_list.sort(
            key=lambda x: x.score,
            reverse=True
        )

        return evidence_list[:3]