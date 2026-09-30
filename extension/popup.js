const STREAMLIT_URL = "http://localhost:5173";

// UI Elements
const btnHome = document.getElementById('navHomeBtn');
const btnSettings = document.getElementById('navSettingsBtn');
const viewHome = document.getElementById('viewHome');
const viewSettings = document.getElementById('viewSettings');
const connectBtn = document.getElementById('connectBtn');
const btnText = document.getElementById('btnText');
const statusCard = document.getElementById('statusCard');
const statusText = document.getElementById('statusText');
const dashboardBtn = document.getElementById('dashboardBtn');
const apiStatusDot = document.getElementById('apiStatusDot');
const apiStatusText = document.getElementById('apiStatusText');

// Auth UI
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userProfile = document.getElementById('userProfile');
const userEmail = document.getElementById('userEmail');
const userAvatar = document.getElementById('userAvatar');

// Stats UI
const statLinks = document.getElementById('statLinks');
const statMessages = document.getElementById('statMessages');

// Settings UI
const settingScanning = document.getElementById('settingScanning');
const settingSensitivity = document.getElementById('settingSensitivity');
const settingWarnings = document.getElementById('settingWarnings');
const btnSnooze = document.getElementById('btnSnooze');
const btnWhitelist = document.getElementById('btnWhitelist');

// Manual Report UI
const manualReportText = document.getElementById('manualReportText');
const btnSubmitReport = document.getElementById('btnSubmitReport');
const reportResult = document.getElementById('reportResult');

// State
let currentState = {};

// Initialization
async function init() {
  try {
    currentState = await chrome.storage.local.get([
      'isConnected', 'sensitivityLevel', 'warningType', 
      'stats', 'userAuth', 'snoozeUntil'
    ]);
    
    bindEvents();
    updateUI();
    checkAPIHealth();
  } catch (err) {
    console.error("Scamlex init failed", err);
  }
}

function updateUI() {
  // Connection Status
  const isSnoozed = currentState.snoozeUntil && Date.now() < currentState.snoozeUntil;
  const isProtectionActive = currentState.isConnected && !isSnoozed;

  if (isProtectionActive) {
    btnText.innerText = "DISCONNECT";
    connectBtn.className = "connect-btn disconnect";
    statusText.innerText = "Protection Active";
    statusCard.className = "status-card active";
  } else {
    btnText.innerText = "ACTIVATE SCAMLEX";
    connectBtn.className = "connect-btn connect";
    statusText.innerText = isSnoozed ? "Protection Snoozed" : "Protection Disabled";
    statusCard.className = "status-card inactive";
  }

  // Settings Toggles
  settingScanning.checked = !!currentState.isConnected;
  settingSensitivity.value = currentState.sensitivityLevel || 'standard';
  settingWarnings.value = currentState.warningType || 'all';
  
  if (isSnoozed) {
    btnSnooze.innerText = "Resume Protection";
  } else {
    btnSnooze.innerText = "Pause 1 Hour";
  }

  // Stats
  if (currentState.stats) {
    statLinks.innerText = currentState.stats.links || 0;
    statMessages.innerText = currentState.stats.messages || 0;
  }

  // Auth Profile
  if (currentState.userAuth && currentState.userAuth.email) {
    loginBtn.style.display = 'none';
    userProfile.classList.remove('hidden');
    userEmail.innerText = currentState.userAuth.email;
    userAvatar.innerText = currentState.userAuth.email.charAt(0).toUpperCase();
  } else {
    loginBtn.style.display = 'block';
    userProfile.classList.add('hidden');
  }
}

async function checkAPIHealth() {
  try {
    const res = await fetch('http://127.0.0.1:8000/docs');
    if (res.ok) {
      apiStatusDot.className = 'status-dot green';
      apiStatusText.innerText = 'Connected';
    } else throw new Error();
  } catch (e) {
    apiStatusDot.className = 'status-dot red';
    apiStatusText.innerText = 'Offline';
  }
}

function bindEvents() {
  // Navigation Tabs
  btnHome.addEventListener('click', () => {
    btnHome.classList.add('active');
    btnSettings.classList.remove('active');
    viewHome.classList.add('active');
    viewHome.classList.remove('hidden');
    viewSettings.classList.add('hidden');
    viewSettings.classList.remove('active');
  });

  btnSettings.addEventListener('click', () => {
    btnSettings.classList.add('active');
    btnHome.classList.remove('active');
    viewSettings.classList.add('active');
    viewSettings.classList.remove('hidden');
    viewHome.classList.add('hidden');
    viewHome.classList.remove('active');
  });

  // Connect Toggle
  const toggleConnection = async () => {
    currentState.isConnected = !currentState.isConnected;
    if (currentState.isConnected) currentState.snoozeUntil = null; // Wake up
    await chrome.storage.local.set({ 
      isConnected: currentState.isConnected,
      snoozeUntil: currentState.snoozeUntil
    });
    updateUI();
  };
  connectBtn.addEventListener('click', toggleConnection);
  settingScanning.addEventListener('change', toggleConnection);

  // Auth Sync (Open Login Page)
  loginBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: `${STREAMLIT_URL}/auth/auth` });
  });

  logoutBtn.addEventListener('click', async () => {
    currentState.userAuth = null;
    await chrome.storage.local.set({ userAuth: null });
    updateUI();
  });

  // Settings
  settingSensitivity.addEventListener('change', async (e) => {
    currentState.sensitivityLevel = e.target.value;
    await chrome.storage.local.set({ sensitivityLevel: e.target.value });
  });

  settingWarnings.addEventListener('change', async (e) => {
    currentState.warningType = e.target.value;
    await chrome.storage.local.set({ warningType: e.target.value });
  });

  // Snooze logic
  btnSnooze.addEventListener('click', async () => {
    if (currentState.snoozeUntil && Date.now() < currentState.snoozeUntil) {
      currentState.snoozeUntil = null; // resume
    } else {
      currentState.snoozeUntil = Date.now() + (60 * 60 * 1000); // 1 hour
    }
    await chrome.storage.local.set({ snoozeUntil: currentState.snoozeUntil });
    updateUI();
  });

  // Whitelist Logic
  btnWhitelist.addEventListener('click', async () => {
    chrome.tabs.query({active: true, currentWindow: true}, async (tabs) => {
      if(tabs[0]) {
        try {
          const url = new URL(tabs[0].url);
          const domain = url.hostname;
          const { whitelistedDomains } = await chrome.storage.local.get(['whitelistedDomains']);
          let list = whitelistedDomains || [];
          if (!list.includes(domain)) list.push(domain);
          await chrome.storage.local.set({ whitelistedDomains: list });
          btnWhitelist.innerText = "Trusted!";
          setTimeout(() => btnWhitelist.innerText = "Trust Current Site", 2000);
        } catch(e) {}
      }
    });
  });

  // Manual Report Logic
  btnSubmitReport.addEventListener('click', async () => {
    const text = manualReportText.value.trim();
    if (!text) return;

    btnSubmitReport.innerText = "Scanning...";
    try {
      const res = await fetch('http://127.0.0.1:8000/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, url: "" })
      });
      const data = await res.json();
      
      reportResult.classList.remove('hidden');
      if (data.isScam) {
        reportResult.className = 'report-result scam';
        reportResult.innerText = `Danger: ${data.message}`;
      } else {
        reportResult.className = 'report-result safe';
        reportResult.innerText = "Safe: No threats detected.";
      }
    } catch(e) {
      reportResult.classList.remove('hidden');
      reportResult.className = 'report-result scam';
      reportResult.innerText = "Error analyzing text. Is backend running?";
    }
    btnSubmitReport.innerText = "Analyze";
  });

  // Dashboard Links
  dashboardBtn.addEventListener('click', () => {
    chrome.tabs.create({ url: STREAMLIT_URL });
  });
}

init();