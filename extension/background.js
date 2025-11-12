// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "ANALYZE_PAGE" && message.url) {
//     // Fetch the analysis data from the server
//     fetch("http://localhost:5000/api/analyze", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json"
//       },
//       body: JSON.stringify({ url: message.url })
//     })
//     .then(response => {
//       if (!response.ok) {
//         throw new Error(`Server returned status ${response.status}`);
//       }
//       return response.json();
//     })
//     .then(data => {
//       // Debug: Log the data for analysis
//       console.log("Analysis Data:", data);

//       // If any required fields are missing, set them to default values
//       const {
//         score = "N/A", 
//         classification = "N/A", 
//         confidence = "N/A", 
//         readability = "N/A", 
//         sentiment = "N/A", 
//         bias = "N/A", 
//         sensationalism = "N/A", 
//         keywords = [], 
//         entities = [], 
//         sources = [], 
//         criteria = []
//       } = data;

//       // Send the result to the content script to display in the popup
//       chrome.tabs.sendMessage(sender.tab.id, {
//         type: "SHOW_ANALYSIS_RESULT",
//         data: {
//           score,
//           classification,
//           confidence,
//           readability,
//           sentiment,
//           bias,
//           sensationalism,
//           keywords,
//           entities,
//           sources,
//           criteria
//         }
//       });
//     })
//     .catch(err => {
//       console.error("❌ Analysis error:", err);
      
//       // Send error information to the content script for display
//       chrome.tabs.sendMessage(sender.tab.id, {
//         type: "SHOW_ANALYSIS_RESULT",
//         data: {
//           classification: "error",
//           summary: "Analysis failed. Please try again."
//         }
//       });
//     });
//   }
// });
// background.js

chrome.runtime.onInstalled.addListener(() => {
    console.log("TRUTH-GUARD - Fake News Detection Extension Installed.");
  });
  
  // You can add other background logic here (if necessary)
  
