document.getElementById("analyzeButton").addEventListener("click", async () => {
  const resultContainer = document.getElementById("results");
  resultContainer.innerHTML = "🔍 Analyzing page...";

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [{ result: pageInfo }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => ({
        url: document.location.href,
        title: document.title
      }),
    });

    const response = await fetch("http://localhost:5000/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: pageInfo.title,
        content: "", // content will be auto-fetched if missing
        source: new URL(pageInfo.url).hostname,
        url: pageInfo.url,
      }),
    });

    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    if (!contentType.includes("application/json")) {
      const errorText = await response.text();
      throw new Error(`Expected JSON but got: ${errorText.substring(0, 100)}...`);
    }

    const data = await response.json();

    resultContainer.innerHTML = `
      <h3>🛡️ Analysis Result</h3>
      <p><strong>Credibility:</strong> ${data.credibilityScore}% (${data.classification})</p>
      <p><strong>Confidence:</strong> ${data.confidence}%</p>
      <ul>
        ${data.criteria.map(c => `
          <li>
            <strong>${c.name}</strong>: ${c.rating}<br/>
            <em>${c.description}</em>
          </li>
        `).join("")}
      </ul>`;
  } catch (err) {
    resultContainer.innerHTML = `<p style="color:red">❌ Error: ${err.message}</p>`;
    console.error(err);
  }
});
