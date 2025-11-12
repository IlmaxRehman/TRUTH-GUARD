// Background script for FactCheck extension
let latestAnalysisResult = null;
let cachedAnalysisResults = {};
let userSettings = {
  enableAutoAnalysis: false,
  showNotifications: true,
  analysisThreshold: 70, // Threshold for alerts (0-100)
  theme: 'light'
};

// Initialize from storage if available
chrome.storage.local.get(['userSettings', 'cachedAnalysisResults'], (result) => {
  if (result.userSettings) {
    userSettings = result.userSettings;
  }
  if (result.cachedAnalysisResults) {
    cachedAnalysisResults = result.cachedAnalysisResults;
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Store analysis result
  if (message.action === "storeAnalysisResult") {
    latestAnalysisResult = message.result;
    
    // Cache result with the URL as key
    if (message.url) {
      cachedAnalysisResults[message.url] = {
        result: message.result,
        timestamp: Date.now()
      };
      
      // Save to storage
      chrome.storage.local.set({ cachedAnalysisResults });
      
      // Show notification if enabled and if fake news is detected
      if (userSettings.showNotifications && 
          (message.result.classification === 'potentially_misleading' || 
           message.result.classification === 'likely_false')) {
        chrome.notifications.create({
          type: 'basic',
          iconUrl: 'icon-128.svg',
          title: 'FactCheck Warning',
          message: `This article may contain misleading information (${message.result.credibility_score}% credibility score)`,
          priority: 2
        });
      }
    }
    
    sendResponse({ success: true });
    return true;
  }
  
  // Get latest analysis result
  if (message.action === "getLatestAnalysisResult") {
    sendResponse({ success: true, result: latestAnalysisResult });
    return true;
  }
  
  // Get cached analysis for URL
  if (message.action === "getAnalysisForUrl") {
    const cachedResult = cachedAnalysisResults[message.url];
    
    // Check if result exists and is not too old (24 hours)
    if (cachedResult && (Date.now() - cachedResult.timestamp < 24 * 60 * 60 * 1000)) {
      sendResponse({ success: true, result: cachedResult.result, fromCache: true });
    } else {
      sendResponse({ success: false, message: "No cached result found" });
    }
    return true;
  }
  
  // Get user settings
  if (message.action === "getUserSettings") {
    sendResponse({ success: true, settings: userSettings });
    return true;
  }
  
  // Update user settings
  if (message.action === "updateUserSettings") {
    userSettings = { ...userSettings, ...message.settings };
    chrome.storage.local.set({ userSettings });
    sendResponse({ success: true });
    return true;
  }
  
  // Proxy API requests to the backend when the extension is in use
  if (message.action === "proxyApiRequest") {
    fetch(message.url, {
      method: message.method || 'GET',
      headers: message.headers || { 'Content-Type': 'application/json' },
      body: message.body ? JSON.stringify(message.body) : undefined
    })
    .then(response => response.json())
    .then(data => {
      sendResponse({ success: true, data });
    })
    .catch(error => {
      sendResponse({ success: false, error: error.message });
    });
    
    return true; // Indicates we will send response asynchronously
  }
});

// Update badge when analysis is complete
function updateBadge(tabId, score) {
  if (!score) {
    chrome.action.setBadgeText({ tabId, text: "" });
    return;
  }
  
  let color = "#4CAF50"; // Green for high credibility
  
  if (score < 50) {
    color = "#F44336"; // Red for low credibility
  } else if (score < 70) {
    color = "#FF9800"; // Orange for medium credibility
  }
  
  chrome.action.setBadgeBackgroundColor({ tabId, color });
  chrome.action.setBadgeText({ tabId, text: score.toString() });
}

// Auto-analyze pages when they load (if enabled)
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if URL is in cached results first
    const cachedResult = cachedAnalysisResults[tab.url];
    if (cachedResult && (Date.now() - cachedResult.timestamp < 24 * 60 * 60 * 1000)) {
      updateBadge(tabId, cachedResult.result.credibility_score);
      return;
    }
    
    // Only auto-analyze news sites if enabled
    if (userSettings.enableAutoAnalysis) {
      // Check if the URL likely contains news
      const urlLower = tab.url.toLowerCase();
      const newsKeywords = ['news', 'article', 'politics', 'world', 'health', 'science', 'opinion'];
      const isNewsPage = newsKeywords.some(keyword => urlLower.includes(keyword));
      
      if (isNewsPage) {
        // Send message to content script to get page content
        chrome.tabs.sendMessage(tabId, { action: "getPageContent" }, (response) => {
          if (chrome.runtime.lastError || !response || !response.success) {
            return;
          }
          
          // Send to API for analysis
          fetch('http://localhost:5000/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              url: tab.url,
              title: tab.title,
              content: response.content,
              source: new URL(tab.url).hostname
            })
          })
          .then(response => response.json())
          .then(result => {
            // Update badge with credibility score
            updateBadge(tabId, result.credibility_score);
            
            // Store the result
            cachedAnalysisResults[tab.url] = {
              result,
              timestamp: Date.now()
            };
            
            chrome.storage.local.set({ cachedAnalysisResults });
            
            // Show notification if credibility is low and notifications are enabled
            if (userSettings.showNotifications && 
                result.credibility_score < userSettings.analysisThreshold) {
              chrome.notifications.create({
                type: 'basic',
                iconUrl: 'icon-128.svg',
                title: 'FactCheck Warning',
                message: `This article may contain misleading information (${result.credibility_score}% credibility score)`,
                priority: 2
              });
            }
          })
          .catch(error => {
            console.error("Analysis error:", error);
          });
        });
      }
    }
  }
});
