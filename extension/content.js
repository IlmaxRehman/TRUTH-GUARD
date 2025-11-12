// content.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractContent") {
    const text = document.body.innerText;
    console.log("Extracted Content:", text);  // Log the extracted content for debugging
    sendResponse({ content: text });
  }
});
