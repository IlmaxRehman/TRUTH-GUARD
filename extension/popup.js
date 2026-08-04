const BACKEND_URL = "https://truth-guard-acbi.onrender.com";
const REQUEST_TIMEOUT_MS = 60000; // Render free tier can cold-start slowly
const COLD_START_HINT_MS = 7000;

const els = {
  urlChip: document.getElementById("urlChip"),
  urlChipText: document.getElementById("urlChipText"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  statusArea: document.getElementById("statusArea"),
  statusText: document.getElementById("statusText"),
  errorArea: document.getElementById("errorArea"),
  errorText: document.getElementById("errorText"),
  retryBtn: document.getElementById("retryBtn"),
  results: document.getElementById("results"),
  overallStamp: document.getElementById("overallStamp"),
  overallStampText: document.getElementById("overallStampText"),
  articleTitle: document.getElementById("articleTitle"),
  scoreFill: document.getElementById("scoreFill"),
  scoreNum: document.getElementById("scoreNum"),
  confidenceText: document.getElementById("confidenceText"),
  summaryText: document.getElementById("summaryText"),
  claimsCount: document.getElementById("claimsCount"),
  claimsList: document.getElementById("claimsList"),
};

let currentUrl = null;

init();

async function init() {
  const tab = await getActiveTab();
  if (tab && isAnalyzable(tab.url)) {
    currentUrl = tab.url;
    els.urlChipText.textContent = tab.url;
    els.urlChip.classList.add("ready");
    els.analyzeBtn.disabled = false;
  } else {
    els.urlChipText.textContent = "This page can't be verified (not a web article)";
    els.analyzeBtn.disabled = true;
  }
}

els.analyzeBtn.addEventListener("click", runAnalysis);
els.retryBtn.addEventListener("click", runAnalysis);

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

function isAnalyzable(url) {
  return typeof url === "string" && /^https?:\/\//i.test(url);
}

async function runAnalysis() {
  if (!currentUrl) return;

  showStatus("Opening the case file\u2026");
  const hintTimer = setTimeout(() => {
    setStatusText("Still working \u2014 the server may be waking up from sleep. This can take up to a minute.");
  }, COLD_START_HINT_MS);

  const controller = new AbortController();
  const timeoutTimer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${BACKEND_URL}/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: currentUrl }),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const payload = isJson ? await response.json() : await response.text();

    if (!response.ok) {
      const detail = isJson && payload && payload.detail ? payload.detail : String(payload).slice(0, 200);
      throw new Error(detail || `Server responded with ${response.status}`);
    }

    renderReport(payload);
  } catch (err) {
    if (err.name === "AbortError") {
      showError("The server took too long to respond. It may still be waking up \u2014 give it a moment and try again.");
    } else {
      showError(err.message || "Something went wrong while verifying this page.");
    }
  } finally {
    clearTimeout(hintTimer);
    clearTimeout(timeoutTimer);
  }
}

function showStatus(text) {
  hideAll();
  els.statusText.textContent = text;
  els.statusArea.hidden = false;
  els.analyzeBtn.disabled = true;
}

function setStatusText(text) {
  if (!els.statusArea.hidden) els.statusText.textContent = text;
}

function showError(message) {
  hideAll();
  els.errorText.textContent = message;
  els.errorArea.hidden = false;
  els.analyzeBtn.disabled = false;
}

function hideAll() {
  els.statusArea.hidden = true;
  els.errorArea.hidden = true;
  els.results.hidden = true;
}

function renderReport(report) {
  hideAll();
  els.analyzeBtn.disabled = false;

  const article = report.article || {};
  const claims = Array.isArray(report.claims) ? report.claims : [];

  els.articleTitle.textContent = article.title || "Untitled article";

  const vClass = verdictClass(article.overall_verdict);
  els.overallStamp.className = `stamp ${vClass}`;
  els.overallStampText.textContent = shortenVerdict(article.overall_verdict);

  const scorePct = normalizeScore(article.overall_score);
  els.scoreFill.style.width = scorePct != null ? `${scorePct}%` : "0%";
  els.scoreNum.textContent = scorePct != null ? `${scorePct}%` : "N/A";

  els.confidenceText.innerHTML = `<span>${escapeHtml(article.confidence || "Unknown")}</span>`;

  els.summaryText.textContent = report.summary || "No field notes were generated for this article.";

  els.claimsCount.textContent = String(claims.length);
  els.claimsList.innerHTML = "";

  if (claims.length === 0) {
    els.claimsList.innerHTML = `<p class="no-evidence">No individual claims were extracted from this article.</p>`;
  } else {
    claims.forEach((claim, idx) => els.claimsList.appendChild(buildClaimCard(claim, idx)));
  }

  els.results.hidden = false;
}

function buildClaimCard(claim, idx) {
  const card = document.createElement("div");
  card.className = "claim-card";

  const vClass = verdictClass(claim.verdict);
  const evidence = Array.isArray(claim.evidence) ? claim.evidence : [];

  const head = document.createElement("div");
  head.className = "claim-head";
  head.innerHTML = `
    <span class="claim-index">${String(idx + 1).padStart(2, "0")}</span>
    <span class="claim-text">${escapeHtml(claim.text || "")}</span>
    <span class="claim-tag ${vClass}">${escapeHtml(shortenVerdict(claim.verdict))}</span>
    <svg class="claim-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  head.addEventListener("click", () => card.classList.toggle("open"));

  const body = document.createElement("div");
  body.className = "claim-body";

  let bodyHtml = "";
  if (claim.reason) {
    bodyHtml += `<p class="claim-reason">${escapeHtml(claim.reason)}</p>`;
  }
  if (evidence.length === 0) {
    bodyHtml += `<p class="no-evidence">No supporting evidence was found for this claim.</p>`;
  } else {
    bodyHtml += evidence
      .map(
        (ev) => `
        <div class="evidence-item">
          <a class="evidence-title" href="${escapeAttr(ev.url || "#")}" target="_blank" rel="noopener noreferrer">
            ${escapeHtml(ev.title || ev.url || "Source")}
          </a>
          <p class="evidence-snippet">${escapeHtml(ev.snippet || "")}</p>
        </div>`
      )
      .join("");
  }
  body.innerHTML = bodyHtml;

  card.appendChild(head);
  card.appendChild(body);
  return card;
}

function verdictClass(verdict) {
  const s = (verdict || "").toLowerCase();
  if (s.includes("false") || s.includes("fake") || s.includes("fabricat")) return "verdict-false";
  if (s.includes("true") || s.includes("verified") || s.includes("credible") || s.includes("accurate")) return "verdict-true";
  if (s.includes("mislead") || s.includes("mixed") || s.includes("partly") || s.includes("unverif")) return "verdict-mixed";
  return "";
}

function shortenVerdict(verdict) {
  if (!verdict) return "Pending";
  return verdict.length > 14 ? `${verdict.slice(0, 13)}\u2026` : verdict;
}

function normalizeScore(score) {
  if (score === null || score === undefined || Number.isNaN(Number(score))) return null;
  const num = Number(score);
  const pct = num <= 1 ? num * 100 : num;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttr(str) {
  return escapeHtml(str);
}
