// extension/background.js

const DEBUG = true; // set to false once everything is confirmed working

// 1. Internal Message Listener (Extension UI/Content Scripts)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'analyzeText') {
    if (DEBUG) console.log('[ScamCheck:bg] received analyzeText, calling backend...', request.payload);

    fetch('http://127.0.0.1:8000/scan', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(request.payload)
    })
      .then((res) => {
        if (DEBUG) console.log('[ScamCheck:bg] backend HTTP status:', res.status);
        if (!res.ok) throw new Error(`Server returned ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (DEBUG) console.log('[ScamCheck:bg] backend response body:', data);
        sendResponse({
          isScam: data.isScam || false,
          score: data.score || 0,
          level: data.level || 'LOW',
          message: data.message || '',
          reasons: data.reasons || [],
          flaggedTexts: data.flaggedTexts || []
        });
      })
      .catch((err) => {
        console.warn('[ScamCheck:bg] Fetch Error:', err.message);
        sendResponse({
          isScam: false,
          error: err.message,
          reasons: [],
          flaggedTexts: []
        });
      });

    return true; // Keep message channel open for async response
  }
});

// 2. External Message Listener (Web App)
chrome.runtime.onMessageExternal.addListener(
  (request, sender, sendResponse) => {
    // Respond to the web app's installation check
    if (request.message === "ping") {
      sendResponse({ status: "installed" });
    }
    // Handle the "Connect" button click
    else if (request.message === "activate") {
      // You cannot force a popup, but you can open a new tab or trigger an auth flow
      chrome.tabs.create({ url: "chrome-extension://" + chrome.runtime.id + "/onboarding.html" });
      sendResponse({ status: "activating" });
    }
  }
);

// 3. Heartbeat Listener
chrome.runtime.onConnect.addListener((port) => {
  if (port.name === 'scamcheck-heartbeat') {
    // keeping connection alive
  }
});

// 4. Installation Listener
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get(['isConnected'], (result) => {
    if (result.isConnected === undefined) {
      chrome.storage.local.set({ isConnected: true });
    }
  });
});