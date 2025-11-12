// Content script to extract information from the current page

// Inject visual elements into the page when needed
let factCheckOverlay = null;
let overlayVisible = false;

// Listen for messages from popup or background
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getPageContent") {
    // Extract the most relevant content from the page
    const pageInfo = extractPageInfo();
    sendResponse({ 
      content: pageInfo.content,
      title: pageInfo.title,
      source: pageInfo.source,
      success: true 
    });
    return true;
  }
  
  if (message.action === "showFactCheckOverlay") {
    toggleFactCheckOverlay(message.result);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "hideFactCheckOverlay") {
    hideFactCheckOverlay();
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === "highlightClaims") {
    highlightClaimsInText(message.claims);
    sendResponse({ success: true });
    return true;
  }
  
  return true; // Keep the message channel open for async response
});

/**
 * Extracts all relevant information from the current page
 * @returns {Object} Page information including content, title, and source
 */
function extractPageInfo() {
  return {
    content: extractArticleContent(),
    title: extractArticleTitle(),
    source: extractArticleSource(),
  };
}

/**
 * Extracts the article title from the page
 * @returns {string} The article title
 */
function extractArticleTitle() {
  // Try different approaches to get the article title
  const titleSelectors = [
    // Schema.org article markup
    '[itemprop="headline"]',
    // Common heading patterns
    'h1.article-title',
    'h1.entry-title',
    'h1.post-title',
    'h1.story-title',
    'h1.title',
    // Generic h1
    'article h1',
    '.article h1',
    '.post h1',
    'h1'
  ];
  
  for (const selector of titleSelectors) {
    const titleElement = document.querySelector(selector);
    if (titleElement && titleElement.textContent.trim().length > 0) {
      return titleElement.textContent.trim();
    }
  }
  
  // Fallback to document title (often includes site name too)
  return document.title;
}

/**
 * Extracts the article source/publisher from the page
 * @returns {string} The source name or domain
 */
function extractArticleSource() {
  // Try to find explicit publisher info
  const publisherSelectors = [
    '[itemprop="publisher"] [itemprop="name"]',
    '.publisher',
    '.source',
    '.site-name',
    'meta[property="og:site_name"]'
  ];
  
  for (const selector of publisherSelectors) {
    const element = document.querySelector(selector);
    if (element) {
      // For meta tags
      if (element.tagName === 'META') {
        return element.getAttribute('content');
      }
      // For regular elements
      if (element.textContent.trim().length > 0) {
        return element.textContent.trim();
      }
    }
  }
  
  // Fallback to domain name
  try {
    const hostname = window.location.hostname;
    // Extract the main domain name (e.g., nytimes.com from www.nytimes.com)
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      const domain = parts[parts.length - 2];
      return domain.charAt(0).toUpperCase() + domain.slice(1);
    }
    return hostname;
  } catch (e) {
    return window.location.hostname;
  }
}

/**
 * Extracts the main article content from a news page
 * Uses several heuristics to find the most likely article content
 * @returns {string} The extracted article content
 */
function extractArticleContent() {
  // Try to find common article containers
  const articleSelectors = [
    'article',
    '[itemprop="articleBody"]',
    '.article-content',
    '.story-body',
    '.post-content',
    '.entry-content',
    '#article-body',
    '.news-article',
    '.article__content',
    '.story__content',
    '.news__content',
    // Add more common content containers
    '.article-body',
    '.story__text',
    '.main-content article',
    '.main-content .article',
    '.post-body',
    '.content-body',
    '.article > .content',
    '#content article'
  ];
  
  let articleElement = null;
  
  // Try each selector until we find content
  for (const selector of articleSelectors) {
    const elements = document.querySelectorAll(selector);
    if (elements.length > 0) {
      // Choose the longest content if multiple elements match
      articleElement = Array.from(elements).reduce((longest, current) => 
        current.textContent.length > longest.textContent.length ? current : longest,
        elements[0]
      );
      break;
    }
  }
  
  // If no article container found, or content is too short, look for paragraphs
  if (!articleElement || articleElement.textContent.trim().length < 200) {
    // Get all paragraph elements
    const paragraphs = document.querySelectorAll('p');
    
    if (paragraphs.length > 3) {
      // Group paragraphs by their parent container
      const parentContentMap = new Map();
      
      Array.from(paragraphs)
        .filter(p => {
          const text = p.textContent.trim();
          return (
            text.length > 40 && // Reasonably long paragraphs
            !/copyright|terms|privacy|contact|about|cookie|comment|footer|related|recommended|popular/.test(p.textContent.toLowerCase()) // Exclude boilerplate content
          );
        })
        .forEach(p => {
          const parent = p.parentElement;
          if (!parentContentMap.has(parent)) {
            parentContentMap.set(parent, []);
          }
          parentContentMap.get(parent).push(p);
        });
      
      // Find the parent with the most content paragraphs - likely the article body
      let bestParent = null;
      let maxParagraphs = 0;
      
      parentContentMap.forEach((paragraphs, parent) => {
        if (paragraphs.length > maxParagraphs) {
          maxParagraphs = paragraphs.length;
          bestParent = parent;
        }
      });
      
      if (bestParent && maxParagraphs >= 3) {
        const contentParagraphs = parentContentMap.get(bestParent);
        return contentParagraphs.map(p => p.textContent.trim()).join('\n\n');
      }
      
      // If we couldn't find a good parent container, use all filtered paragraphs
      const allContentParagraphs = Array.from(paragraphs)
        .filter(p => {
          const text = p.textContent.trim();
          return (
            text.length > 40 && 
            !/copyright|terms|privacy|contact|about/.test(p.textContent.toLowerCase())
          );
        });
      
      if (allContentParagraphs.length > 0) {
        return allContentParagraphs.map(p => p.textContent.trim()).join('\n\n');
      }
    }
  }
  
  // If we found an article element, clean it up before returning
  if (articleElement) {
    // Remove non-content elements that might be inside our article container
    const elementsToRemove = articleElement.querySelectorAll(
      '.advertisement, .ad, .social, .share, .related, .sidebar, .comments, nav, aside, .widget'
    );
    
    // Create a clone to avoid modifying the live DOM
    const cleanArticle = articleElement.cloneNode(true);
    
    // Remove unwanted elements from the clone
    elementsToRemove.forEach(el => {
      const matchingEl = cleanArticle.querySelector(`#${el.id}`) || 
                          cleanArticle.querySelector(`.${Array.from(el.classList).join('.')}`);
      if (matchingEl && matchingEl.parentNode) {
        matchingEl.parentNode.removeChild(matchingEl);
      }
    });
    
    return cleanArticle.textContent.trim();
  }
  
  // Return the found article content or fallback to body text
  return articleElement ? 
    articleElement.textContent.trim() : 
    document.body.innerText.substring(0, 15000).trim();
}

/**
 * Creates and shows an overlay with fact check information
 * @param {Object} analysisResult - The analysis result to display
 */
function toggleFactCheckOverlay(analysisResult) {
  // If the overlay already exists, toggle visibility
  if (factCheckOverlay) {
    overlayVisible = !overlayVisible;
    factCheckOverlay.style.display = overlayVisible ? 'block' : 'none';
    return;
  }
  
  // Create the overlay
  factCheckOverlay = document.createElement('div');
  factCheckOverlay.id = 'factcheck-overlay';
  factCheckOverlay.style.cssText = `
    position: fixed;
    top: 0;
    right: 0;
    width: 320px;
    max-height: 100vh;
    background: white;
    box-shadow: -2px 0 8px rgba(0, 0, 0, 0.2);
    z-index: 9999;
    overflow-y: auto;
    font-family: Arial, sans-serif;
    border-left: 4px solid #3b82f6;
    display: block;
    transition: transform 0.3s ease;
  `;
  
  // Get the credibility color based on classification
  let credibilityColor = '#4CAF50'; // Default green
  let credibilityText = 'Reliable';
  
  if (analysisResult.classification === 'potentially_misleading') {
    credibilityColor = '#FF9800';
    credibilityText = 'Potentially Misleading';
  } else if (analysisResult.classification === 'likely_false') {
    credibilityColor = '#F44336';
    credibilityText = 'Likely False';
  }
  
  // Create the content
  const content = document.createElement('div');
  content.innerHTML = `
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 style="margin: 0; font-size: 16px; color: #111;">FactCheck Analysis</h3>
        <button id="factcheck-close" style="background: none; border: none; cursor: pointer; font-size: 20px; color: #666;">&times;</button>
      </div>
    </div>
    
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <div style="display: flex; align-items: center; margin-bottom: 8px;">
        <span style="display: inline-block; width: 12px; height: 12px; border-radius: 50%; background-color: ${credibilityColor}; margin-right: 8px;"></span>
        <span style="font-weight: bold; color: ${credibilityColor};">${credibilityText}</span>
      </div>
      <div style="background: #f5f5f5; height: 8px; border-radius: 4px; overflow: hidden; margin: 8px 0;">
        <div style="height: 100%; width: ${analysisResult.confidence}%; background-color: ${credibilityColor};"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 12px; color: #666;">
        <span>Confidence: ${analysisResult.confidence}%</span>
        <span>Credibility: ${analysisResult.credibility_score}%</span>
      </div>
    </div>
    
    <div style="padding: 16px; border-bottom: 1px solid #eee;">
      <h4 style="margin: 0 0 8px; font-size: 14px; color: #333;">Key Findings</h4>
      <ul style="margin: 0; padding-left: 16px; font-size: 13px;">
        ${analysisResult.criteria.map(criterion => `
          <li style="margin-bottom: 4px; color: ${
            criterion.status === 'good' ? '#4CAF50' : 
            criterion.status === 'warning' ? '#FF9800' : '#F44336'
          }">
            <strong>${criterion.name}:</strong> ${criterion.description}
          </li>
        `).join('')}
      </ul>
    </div>
    
    ${analysisResult.factChecks && analysisResult.factChecks.length > 0 ? `
      <div style="padding: 16px;">
        <h4 style="margin: 0 0 8px; font-size: 14px; color: #333;">Fact Checks</h4>
        ${analysisResult.factChecks.map(fact => `
          <div style="margin-bottom: 12px; padding: 8px; background: #f9f9f9; border-left: 3px solid ${
            fact.verdict === 'verified' ? '#4CAF50' : 
            fact.verdict === 'misleading' ? '#FF9800' : '#F44336'
          }; font-size: 13px;">
            <p style="margin: 0 0 4px;"><strong>Claim:</strong> "${fact.claim}"</p>
            <p style="margin: 0; color: ${
              fact.verdict === 'verified' ? '#4CAF50' : 
              fact.verdict === 'misleading' ? '#FF9800' : '#F44336'
            };"><strong>${
              fact.verdict === 'verified' ? 'Verified' : 
              fact.verdict === 'misleading' ? 'Misleading' : 'False'
            }:</strong> ${fact.explanation}</p>
          </div>
        `).join('')}
      </div>
    ` : ''}
    
    <div style="padding: 16px; background: #f5f5f5; font-size: 11px; color: #666; text-align: center;">
      Analysis powered by FactCheck | Use these results as guidance, not definitive judgment.
      <div style="margin-top: 8px;">
        <button id="factcheck-highlight" style="background: #3b82f6; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">Highlight Claims</button>
        <button id="factcheck-settings" style="background: #f5f5f5; color: #666; border: 1px solid #ddd; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px; margin-left: 4px;">Settings</button>
      </div>
    </div>
  `;
  
  factCheckOverlay.appendChild(content);
  document.body.appendChild(factCheckOverlay);
  overlayVisible = true;
  
  // Add event listeners
  document.getElementById('factcheck-close').addEventListener('click', () => {
    hideFactCheckOverlay();
  });
  
  document.getElementById('factcheck-highlight').addEventListener('click', () => {
    if (analysisResult.factChecks && analysisResult.factChecks.length > 0) {
      highlightClaimsInText(analysisResult.factChecks.map(fact => fact.claim));
    }
  });
  
  document.getElementById('factcheck-settings').addEventListener('click', () => {
    // Open extension popup or settings page
    chrome.runtime.sendMessage({ action: "openSettings" });
  });
}

/**
 * Hides the fact check overlay
 */
function hideFactCheckOverlay() {
  if (factCheckOverlay) {
    factCheckOverlay.style.display = 'none';
    overlayVisible = false;
  }
}

/**
 * Highlights the specified claims in the article text
 * @param {string[]} claims - Array of claim texts to highlight
 */
function highlightClaimsInText(claims) {
  if (!claims || claims.length === 0) return;
  
  // Function to escape special regex characters
  const escapeRegExp = (string) => {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };
  
  // Remove any existing highlights first
  const existingHighlights = document.querySelectorAll('.factcheck-highlight');
  existingHighlights.forEach(el => {
    const parent = el.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(el.textContent), el);
      parent.normalize();
    }
  });
  
  // Create a style element for our highlights if it doesn't exist
  if (!document.getElementById('factcheck-highlight-styles')) {
    const style = document.createElement('style');
    style.id = 'factcheck-highlight-styles';
    style.textContent = `
      .factcheck-highlight {
        background-color: rgba(255, 204, 0, 0.3);
        padding: 0 2px;
        border-radius: 2px;
        transition: background-color 0.3s;
      }
      .factcheck-highlight:hover {
        background-color: rgba(255, 204, 0, 0.5);
      }
    `;
    document.head.appendChild(style);
  }
  
  // Walk through text nodes in the document body and highlight matches
  function walkTextNodes(node, func) {
    if (node.nodeType === Node.TEXT_NODE) {
      func(node);
    } else {
      // Skip nodes that are likely not part of the main content
      const nodeName = node.nodeName.toLowerCase();
      const classNames = (node.className || '').toLowerCase();
      
      if (['script', 'style', 'noscript', 'iframe', 'svg', 'nav', 'footer'].includes(nodeName) ||
          classNames.includes('comment') || 
          classNames.includes('footer') || 
          classNames.includes('sidebar')) {
        return;
      }
      
      for (let i = 0; i < node.childNodes.length; i++) {
        walkTextNodes(node.childNodes[i], func);
      }
    }
  }
  
  const articleContent = document.querySelectorAll('article, [itemprop="articleBody"], .article-content, .story-body, p');
  
  articleContent.forEach(container => {
    walkTextNodes(container, (textNode) => {
      let text = textNode.textContent;
      let parent = textNode.parentNode;
      
      // Skip certain elements
      if (parent.tagName === 'SCRIPT' || parent.tagName === 'STYLE' || parent.tagName === 'BUTTON' || 
          parent.tagName === 'A' || text.trim().length < 10) {
        return;
      }
      
      let anyMatch = false;
      let htmlResult = text;
      
      // Try to find each claim in the text
      claims.forEach(claim => {
        if (claim.length < 10) return; // Skip very short claims
        
        // Create a fuzzy pattern for the claim
        // This helps match even if there are minor differences in punctuation or whitespace
        const escapedClaim = escapeRegExp(claim.trim());
        const fuzzyPattern = new RegExp(escapedClaim.replace(/\s+/g, '\\s+'), 'gi');
        
        if (fuzzyPattern.test(text)) {
          anyMatch = true;
          // Replace with a span for highlighting, but be careful to preserve the original text
          htmlResult = htmlResult.replace(fuzzyPattern, match => 
            `<span class="factcheck-highlight" title="This claim has been fact-checked">${match}</span>`
          );
        }
      });
      
      // If we found any matches, replace the text node with our highlighted HTML
      if (anyMatch) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlResult;
        
        const fragment = document.createDocumentFragment();
        while (tempDiv.firstChild) {
          fragment.appendChild(tempDiv.firstChild);
        }
        
        parent.replaceChild(fragment, textNode);
      }
    });
  });
  
  // Scroll to the first highlight
  const firstHighlight = document.querySelector('.factcheck-highlight');
  if (firstHighlight) {
    firstHighlight.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}
