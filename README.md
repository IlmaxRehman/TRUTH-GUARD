# Truth Guard

**Truth Guard** is a collaborative Chrome Extension project designed to detect fake or misleading news in real time.  
It extracts factual claims from text and verifies them through NLP-based analysis using a Python backend.

---

## Overview

The system has two main components:
- **Chrome Extension (TypeScript)** – Captures webpage content and displays verification results.  
- **Backend (Python + FastAPI)** – Uses NLP models to extract and validate factual claims.

---

## Technologies Used

- TypeScript, JavaScript, HTML, CSS  
- Python (FastAPI)  
- Natural Language Processing (NLP)  
- Transformer-based model (BART-MNLI)  
- DuckDuckGo Search API  

---

## Features

- Real-time news credibility detection  
- Automated claim extraction and verification  
- Displays verdicts like *True*, *False*, or *Misleading*  
- Lightweight and privacy-conscious  

---

## My Contribution

I worked on the **Python backend** and implemented the **NLP-based fact extraction and verification logic**.

---

## Setup

```bash
git clone https://github.com/IlmaxRehman/TRUTH-GUARD.git
cd TRUTH-GUARD
npm install
npm run dev
For the backend:

cd server
uvicorn main:app --reload


To load the extension:

Open chrome://extensions/ in your browser

Enable Developer Mode

Click Load Unpacked

Select the extension/ folder

Author

Ilma Rehman
B.Tech – Computer Science and Engineering
Anand Engineering College, Agra
