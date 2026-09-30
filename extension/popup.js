document.addEventListener('DOMContentLoaded', async () => {
  const connectBtn = document.getElementById('connectBtn');
  const statusText = document.getElementById('statusText');
  const statusDot = document.getElementById('statusDot');
  const streamlitLink = document.getElementById('streamlitLink');
  const menuBtn = document.getElementById('menuBtn');

  // Streamlit app URL running via app.py
  const STREAMLIT_URL = "http://localhost:5173";

  // Load active status from sync storage
  const { isConnected } = await chrome.storage.local.get(['isConnected']);
  updateUI(!!isConnected);

  connectBtn.addEventListener('click', async () => {
    const { isConnected } = await chrome.storage.local.get(['isConnected']);
    const newState = !isConnected;
    await chrome.storage.local.set({ isConnected: newState });
    updateUI(newState);
  });

  const openDashboard = () => chrome.tabs.create({ url: STREAMLIT_URL });
  streamlitLink.addEventListener('click', openDashboard);
  menuBtn.addEventListener('click', openDashboard);

  function updateUI(connected) {
    if (connected) {
      connectBtn.innerText = "DISCONNECT";
      connectBtn.className = "connect-btn connected";
      statusText.innerText = "Protection Active";
      statusDot.className = "status-dot enabled";
    } else {
      connectBtn.innerText = "CONNECT";
      connectBtn.className = "connect-btn disconnected";
      statusText.innerText = "Protection Disabled";
      statusDot.className = "status-dot disabled";
    }
  }
});