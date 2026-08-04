<div align="center">

# 🛡️ TruthGuard

**AI-powered fact-checking, one click away from any article you're reading.**

TruthGuard is a Chrome Extension + FastAPI backend that extracts the factual claims from a news article, searches the live web for supporting evidence, and returns a transparent, per-claim credibility verdict — not just a single "real or fake" label.

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-2.0-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Chrome Extension](https://img.shields.io/badge/Chrome-Manifest%20V3-4285F4?logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Groq](https://img.shields.io/badge/LLM-Llama%203.3%2070B%20(Groq)-F55036)](https://groq.com/)
[![License](https://img.shields.io/badge/License-MIT-lightgrey)](#license)

</div>

---

## What it does

Paste-and-forget fact checkers just tell you "this looks fake." TruthGuard shows its work.

Point it at any news article and it will:

1. **Extract the article** from the raw URL — no copy-pasting text.
2. **Pull out the 5 most load-bearing factual claims** using an LLM (Llama 3.3 70B via Groq), not naive sentence-splitting.
3. **Search live evidence** for each individual claim via the Tavily search API.
4. **Score every piece of evidence** on semantic relevance *and* source trustworthiness (a curated domain-trust table, e.g. `who.int` and `nature.com` rank above `medium.com`).
5. **Compute a weighted credibility score** per claim, and roll it up into an overall article verdict.
6. **Generate a plain-English explanation** for every verdict — so the output is auditable, not a black box.
7. **Caches results by URL** in a database, so re-checking the same article is instant.

All of that surfaces in a lightweight popup the moment you click the extension icon.

---

## Why it's more than a classifier

Most "fake news detector" student projects run one sentence through a pretrained classifier and print `True`/`False`. TruthGuard is a small **retrieval-augmented reasoning pipeline**:

- Claims aren't just extracted, they're **individually investigated** against fresh web evidence — the model isn't asked to know facts, it's asked to reason over evidence it's just been shown.
- Credibility isn't one score. It's a weighted blend of **semantic match (50%)**, **source trust (35%)**, and **source diversity (15%)** — so a single biased source can't dominate a verdict.
- Every verdict comes with a **written rationale and linked sources**, so a user (or a recruiter reading this) can verify the system isn't hallucinating.

---

## Architecture

```
┌─────────────────────────┐        POST /verify { url }        ┌──────────────────────────────┐
│   Chrome Extension       │ ─────────────────────────────────▶ │   FastAPI Backend             │
│   (Manifest V3 popup)    │                                     │                                │
│                          │ ◀───────────────────────────────── │  1. Article Extractor         │
│  • reads active tab URL  │      VerificationReport JSON        │  2. Claim Extractor (Groq LLM) │
│  • renders verdict,      │                                     │  3. Evidence Retriever (Tavily)│
│    score, evidence       │                                     │  4. Evidence Ranker            │
└─────────────────────────┘                                     │  5. Credibility Engine         │
                                                                  │  6. Explanation Generator      │
                                                                  │  7. SQL cache (by URL)         │
                                                                  └──────────────────────────────┘
```

**Pipeline stages** (`app/pipeline/verification_pipeline.py`):

| Stage | Responsibility |
|---|---|
| `ArticleExtractor` | Fetches and parses the article body from a raw URL |
| `ClaimExtractor` | Prompts Llama 3.3 70B to isolate the article's key factual claims as structured JSON |
| `EvidenceRetriever` | Runs a Tavily web search per claim, scores each result by relevance × domain trust |
| `EvidenceRanker` | Re-ranks retrieved evidence before scoring |
| `CredibilityEngine` | Computes the weighted 0–100 credibility score and maps it to a verdict |
| `ExplanationGenerator` | Produces a human-readable justification per claim |

---

## Tech stack

**Backend**
- FastAPI + SQLAlchemy (URL-level response caching)
- Groq API — `llama-3.3-70b-versatile` for claim extraction & explanation generation
- Tavily Search API — live web evidence retrieval
- Deployed on Render

**Extension**
- Manifest V3, vanilla JavaScript/HTML/CSS (no build step, no framework — deliberately lightweight)
- `activeTab` permission only — no page-content scripts, no broad host access, since the backend does its own article fetching

---

## API

```
POST /verify
Content-Type: application/json

{ "url": "https://example.com/some-news-article" }
```

**Response** — a `VerificationReport`:

```json
{
  "article": {
    "title": "...",
    "url": "...",
    "overall_score": 78.4,
    "overall_verdict": "Mostly True",
    "confidence": "High"
  },
  "summary": "...",
  "claims": [
    {
      "id": 1,
      "text": "...",
      "verdict": "True",
      "confidence": "High",
      "credibility_score": 88.2,
      "reason": "...",
      "evidence": [
        { "title": "...", "url": "...", "snippet": "...", "score": 0.91 }
      ]
    }
  ]
}
```

---



## Running it locally

**Backend**
```bash
cd backend
python -m venv venv && source venv/bin/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt

# create backend/.env with:
# TAVILY_API_KEY=your_key
# GROQ_API_KEY=your_key

uvicorn app.main:app --reload
```
Or with Docker:
```bash
docker compose up --build
```

**Extension**
1. Go to `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select the `extension/` folder
4. Open any news article, click the TruthGuard icon, click **Verify**

---

## Roadmap

- [ ] Highlight claims directly on the source page, not just in the popup
- [ ] Support for PDF/long-form report verification, not just news articles
- [ ] User feedback loop to flag incorrect verdicts
- [ ] Firefox/Edge build from the same extension codebase

---

## Team

Built collaboratively — backend (FastAPI, verification pipeline) and frontend (Chrome Extension) developed as a two-person project.

## License

MIT
