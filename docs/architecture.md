# TruthGuard 2.0 Architecture

## Overview

TruthGuard is an AI-powered browser extension designed to help users evaluate the credibility of online news articles.

Unlike traditional fake news detectors that rely only on sentiment analysis or predefined keyword rules, TruthGuard performs evidence-based credibility assessment by extracting article content, identifying factual claims, retrieving supporting evidence from trusted sources, and generating an explainable credibility report.

The objective is not to declare whether an article is "true" or "false", but to assist users in making informed decisions using transparent AI reasoning.

---

# Problem Statement

The internet contains a rapidly increasing amount of misinformation.

Most existing browser extensions rely on:

- Keyword matching
- Sentiment analysis
- Blacklisted websites
- Hardcoded credibility scores

These approaches fail when:

- A trustworthy source publishes an incorrect report.
- A new website publishes accurate information.
- AI-generated content appears highly convincing.
- Claims require contextual verification.

TruthGuard addresses these limitations using an explainable, evidence-driven workflow.

---

# Goals

- Browser-based credibility assistant
- Explainable AI responses
- Modular backend architecture
- Fast API response time
- Production-ready deployment
- Easily extensible AI pipeline

---

# High-Level Architecture

```
+---------------------------+
| Chrome Extension (React)  |
+-------------+-------------+
              |
              |
              ▼
+---------------------------+
| FastAPI Backend           |
+-------------+-------------+
              |
      +-------+-------+
      |               |
      ▼               ▼
Article Extractor   Claim Extractor
      |               |
      +-------+-------+
              |
              ▼
Evidence Retrieval Engine
              |
              ▼
Semantic Similarity Engine
              |
              ▼
Credibility Engine
              |
              ▼
Explainable AI Generator
              |
              ▼
JSON Response
```

---

# System Workflow

1. User opens a news article.

2. Chrome Extension extracts:

- URL
- Title
- Article Content

3. Backend receives article.

4. Article preprocessing begins.

5. Important factual claims are extracted.

6. Trusted evidence is retrieved.

7. Claims are compared against retrieved evidence.

8. Credibility score is generated.

9. Explanation is generated.

10. Browser extension displays the final report.

---

# AI Pipeline

## Step 1

Article Extraction

Input:

- URL

Output:

- Clean article text

---

## Step 2

Claim Extraction

Extract factual statements from the article.

---

## Step 3

Evidence Retrieval

Search trusted sources such as:

- Reuters
- BBC
- AP
- WHO
- Government portals
- NASA
- ISRO

---

## Step 4

Semantic Comparison

Compare extracted claims with retrieved evidence using transformer embeddings.

---

## Step 5

Credibility Engine

Inputs:

- Source Reputation
- Evidence Match
- Semantic Similarity
- Bias Indicators

Outputs:

- Credibility Score
- Confidence
- Supporting Evidence
- Contradicting Evidence

---

## Step 6

Explainability

Generate a human-readable explanation describing why the score was assigned.

---

# Tech Stack

## Frontend

- React
- TypeScript
- TailwindCSS
- Chrome Extension Manifest V3

## Backend

- FastAPI
- Python
- Pydantic
- Uvicorn

## AI

- Hugging Face Transformers
- Sentence Transformers
- spaCy
- BeautifulSoup
- Trafilatura

## DevOps

- Docker
- GitHub Actions
- Render / Railway Deployment

---

# Folder Structure (Target)

```
truthguard/

frontend/
    chrome-extension/

backend/
    app/
        api/
        services/
        models/
        utils/

docs/

tests/

Dockerfile

README.md
```

---

# Future Improvements

- Multi-language news verification
- Image misinformation detection
- Reverse image search
- Video claim verification
- User feedback loop
- Fact-check API integration
- Chrome Web Store release

---

# Development Roadmap

Phase 1

Repository cleanup

Phase 2

Backend migration to FastAPI

Phase 3

AI pipeline redesign

Phase 4

Chrome Extension modernization

Phase 5

Deployment

Phase 6

Chrome Web Store release

---

Author

Ilma Rehman

TruthGuard 2.0