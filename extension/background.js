// extension/background.js

const DEBUG = true; // set to false once everything is confirmed working

let requestQueue = [];
let batchTimer = null;
const BATCH_INTERVAL = 2500; // 2.5 seconds batch window

function processBatch() {
  if (requestQueue.length === 0) return;
  
  const currentBatch = [...requestQueue];
  requestQueue = []; // Clear queue immediately
  
  const payloadItems = currentBatch.map(req => req.payload);
  
  if (DEBUG) console.log(`[ScamCheck:bg] Dispatching batched request with ${payloadItems.length} items...`);
  
  fetch('http://127.0.0.1:8000/scan_batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items: payloadItems })
  })
    .then(res => {
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      return res.json();
    })
    .then(data => {
      const results = data.results || [];
      currentBatch.forEach((req, index) => {
        const result = results[index] || {};
        req.sendResponse({
          isScam: result.isScam || false,
          score: result.score || 0,
          level: result.level || 'LOW',
          message: result.message || '',
          reasons: result.reasons || [],
          flaggedTexts: result.flaggedTexts || []
        });
      });
    })
    .catch(err => {
      console.warn('[ScamCheck:bg] Batch Fetch Error:', err.message);
      currentBatch.forEach(req => {
        req.sendResponse({
          isScam: false,
          error: err.message,
          reasons: [],
          flaggedTexts: []
        });
      });
    });
}

// 1. Internal Message Listener (Extension UI/Content Scripts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeText') {
    requestQueue.push({
      payload: request.payload,
      sendResponse: sendResponse
    });
    
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        batchTimer = null;
        processBatch();
      }, BATCH_INTERVAL);
    }
    
    return true; // Keep message channel open for async response
  }
  
  if (request.action === 'trackStats') {
    chrome.storage.local.get(['stats'], (res) => {
      let stats = res.stats || { links: 0, messages: 0 };
      if (request.type === 'link') stats.links++;
      if (request.type === 'message') stats.messages++;
      chrome.storage.local.set({ stats });
    });
  }
});

// 2. External Message Listener (Web App)
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    if (request.message === "ping") {
      sendResponse({ status: "installed" });
    } else if (request.message === "activate") {
      chrome.tabs.create({ url: "chrome-extension://" + chrome.runtime.id + "/onboarding.html" });
      sendResponse({ status: "activating" });
    } else if (request.action === "authSync") {
      chrome.storage.local.set({ 
        userAuth: request.payload 
      }, () => {
        sendResponse({ status: "synced" });
      });
    }
  }
);

// 3. Heartbeat Listener
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'scamcheck-heartbeat') {
    // keeping connection alive
  }
});

// 4. Installation & Default Settings Initialization
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get([
    'isConnected', 
    'sensitivityLevel', 
    'warningType', 
    'stats',
    'whitelistedDomains'
  ], (result) => {
    const defaults = {};
    if (result.isConnected === undefined) defaults.isConnected = true;
    if (result.sensitivityLevel === undefined) defaults.sensitivityLevel = 'standard';
    if (result.warningType === undefined) defaults.warningType = 'all';
    if (result.stats === undefined) defaults.stats = { links: 0, messages: 0 };
    if (result.whitelistedDomains === undefined) defaults.whitelistedDomains = [];
    
    if (Object.keys(defaults).length > 0) {
      chrome.storage.local.set(defaults);
    }
  });
});