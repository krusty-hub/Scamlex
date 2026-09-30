// extension/content.js
var DEBUG = true;
let debounceTimer = null;
let extensionValid = true;
let invalidationPort = null;
let pageScanTimer = null;
let domObserver = null;
let lastScannedText = '';

// ---------------------------------------------------------------
// Context invalidation handling (Preserved)
// ---------------------------------------------------------------
window.addEventListener('unhandledrejection', (event) => {
  const msg = event.reason && event.reason.message ? event.reason.message : '';
  if (msg.includes('Extension context invalidated')) {
    event.preventDefault();
    handleInvalidation();
  }
});

function isContextAlive() {
  if (!extensionValid) return false;
  try {
    return typeof chrome !== 'undefined' && !!chrome.runtime && !!chrome.runtime.id && !!chrome.runtime.getURL;
  } catch (e) {
    return false;
  }
}

function trulyInvalidated() {
  try {
    return typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.id;
  } catch (e) {
    return true;
  }
}

function watchForInvalidation() {
  try {
    invalidationPort = chrome.runtime.connect({ name: 'scamcheck-heartbeat' });
    invalidationPort.onDisconnect.addListener(() => {
      if (trulyInvalidated()) {
        handleInvalidation();
      }
    });
  } catch (e) {
    if (trulyInvalidated()) handleInvalidation();
  }
}

function handleInvalidation() {
  if (!extensionValid) return;
  extensionValid = false;

  if (debounceTimer) clearTimeout(debounceTimer);
  if (pageScanTimer) clearTimeout(pageScanTimer);
  if (domObserver) domObserver.disconnect();

  removeWarningWidget();

  document.removeEventListener('input', onInput, true);
  document.removeEventListener('mouseup', onMouseUp, true);

  console.warn('[ScamCheck] Extension reloaded. Refresh to restore scanner.');
}

// ---------------------------------------------------------------
// Safe Wrappers (Preserved)
// ---------------------------------------------------------------
function safeGetStorage(keys, callback) {
  if (!isContextAlive()) return callback(null);
  try {
    chrome.storage.local.get(keys, (result) => {
      if (!isContextAlive() || chrome.runtime.lastError) {
        callback(null);
      } else {
        callback(result);
      }
    });
  } catch (err) {
    callback(null);
  }
}

function safeSendMessage(payload, callback) {
  if (!isContextAlive()) return callback(null);
  try {
    chrome.runtime.sendMessage(payload, (response) => {
      if (!isContextAlive() || chrome.runtime.lastError) {
        callback(null);
      } else {
        callback(response);
      }
    });
  } catch (err) {
    callback(null);
  }
}

// ---------------------------------------------------------------
// Deep Universal Text Extraction Engine (Preserved)
// ---------------------------------------------------------------
function isSecureField(element) {
  if (!element) return false;
  const type = element.type ? element.type.toLowerCase() : '';
  const name = element.name ? element.name.toLowerCase() : '';
  const id = element.id ? element.id.toLowerCase() : '';

  return (
    type === 'password' || type === 'creditcard' ||
    name.includes('pass') || name.includes('card') || name.includes('cvv') ||
    id.includes('pass') || id.includes('card')
  );
}

function extractTextFromElement(target) {
  if (!target) return '';
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    return target.value;
  }
  if (target.isContentEditable || target.getAttribute('contenteditable') === 'true') {
    return target.innerText || target.textContent;
  }
  return '';
}

function extractDeepText(node) {
  if (!node) return '';

  if (node.nodeType === Node.ELEMENT_NODE) {
    const tagName = node.tagName.toLowerCase();
    if (tagName === 'script' || tagName === 'style' || tagName === 'noscript' || node.id === 'scamcheck-widget-container') {
      return '';
    }
  }

  let text = '';
  if (node.shadowRoot) text += extractDeepText(node.shadowRoot) + ' ';

  if (node.childNodes && node.childNodes.length > 0) {
    for (let child of node.childNodes) {
      text += extractDeepText(child) + ' ';
    }
  } else if (node.nodeType === Node.TEXT_NODE) {
    text += node.textContent.trim() + ' ';
  }
  return text;
}

function getUniversalPageText() {
  if (!document.body) return '';
  const priorityContainers = [
    '[role="main"]', '[role="feed"]', '#main',
    '[data-qa="message_list"]', '.chat-messages', '#canvas'
  ];

  for (let selector of priorityContainers) {
    const container = document.querySelector(selector);
    if (container) {
      const extracted = extractDeepText(container).replace(/\s+/g, ' ').trim();
      if (extracted.length > 30) return extracted;
    }
  }
  return extractDeepText(document.body).replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------
// Analysis Pipeline (Modified to pass full response object)
// ---------------------------------------------------------------
function analyzeTextPayload(text) {
  if (!isContextAlive()) return;
  if (!text || text.trim().length < 10) {
    removeWarningWidget();
    return;
  }

  if (DEBUG) console.log('[ScamCheck] Queued analysis text length:', text.length);
  if (debounceTimer) clearTimeout(debounceTimer);

  debounceTimer = setTimeout(() => {
    if (!isContextAlive()) return;
    safeGetStorage(['isConnected'], (storageData) => {
      if (!isContextAlive()) return;
      const isConnected = storageData && storageData.isConnected !== undefined ? storageData.isConnected : true;
      if (!isConnected) return;

      safeSendMessage(
        {
          action: 'analyzeText',
          payload: { text: text.substring(0, 15000), url: window.location.href }
        },
        (response) => {
          if (!isContextAlive() || !response) return;

          if (response.isScam) {
            // Assuming response contains: message, score, reasons (array), and flaggedTexts (array of strings to highlight)
            showWarningWidget(response);
            if (response.flaggedTexts && response.flaggedTexts.length > 0) {
              highlightThreatsInDOM(response.flaggedTexts);
            }
          } else {
            removeWarningWidget();
          }
        }
      );
    });
  }, 800);
}

// ---------------------------------------------------------------
// Event listeners & DOM Observer Setup (Preserved)
// ---------------------------------------------------------------
function onInput(event) {
  if (!isContextAlive()) return;
  const target = event.target;
  if (isSecureField(target)) return;

  const text = extractTextFromElement(target);
  if (text) analyzeTextPayload(text);
}

function onMouseUp(event) {
  if (!isContextAlive()) return;
  if (event.target && event.target.closest('#scamcheck-widget-container')) return;

  const selection = window.getSelection();
  const selectedText = selection ? selection.toString().trim() : '';
  if (selectedText.length >= 10) analyzeTextPayload(selectedText);
}

function scanPageContent() {
  if (!isContextAlive()) return;
  const pageText = getUniversalPageText();
  if (pageText.length >= 20 && pageText !== lastScannedText) {
    lastScannedText = pageText;
    analyzeTextPayload(pageText);
  }
}

function setupDOMObserver() {
  if (!document.body) {
    setTimeout(setupDOMObserver, 500);
    return;
  }
  scanPageContent();
  domObserver = new MutationObserver(() => {
    if (pageScanTimer) clearTimeout(pageScanTimer);
    pageScanTimer = setTimeout(scanPageContent, 1000);
  });
  domObserver.observe(document, {
    childList: true, subtree: true, characterData: true, attributes: false
  });
}

document.addEventListener('input', onInput, true);
document.addEventListener('mouseup', onMouseUp, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDOMObserver);
} else {
  setupDOMObserver();
}

// ---------------------------------------------------------------
// UI/UX: Highlighting & Draggable Widget (NEW)
// ---------------------------------------------------------------

function highlightThreatsInDOM(textsToHighlight) {
  clearHighlights(); // Clear old highlights first

  if (!textsToHighlight || !Array.isArray(textsToHighlight)) return;

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
  const nodesToReplace = [];
  let node;

  while (node = walker.nextNode()) {
    const parentTag = node.parentElement ? node.parentElement.tagName.toLowerCase() : '';
    // Skip scripts, styles, and our own widget/highlights
    if (parentTag === 'script' || parentTag === 'style' || parentTag === 'noscript' || parentTag === 'mark') continue;

    textsToHighlight.forEach(text => {
      if (node.nodeValue.toLowerCase().includes(text.toLowerCase())) {
        nodesToReplace.push({ node, textToMatch: text });
      }
    });
  }

  // Safely replace text with marked spans
  nodesToReplace.forEach(({ node, textToMatch }) => {
    if (!node.parentNode) return; // Might have been modified already

    const escapeRegExp = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapeRegExp(textToMatch)})`, 'gi');

    const fragment = document.createDocumentFragment();
    const parts = node.nodeValue.split(regex);

    parts.forEach(part => {
      if (part.toLowerCase() === textToMatch.toLowerCase()) {
        const mark = document.createElement('mark');
        mark.className = 'scamcheck-highlight';
        mark.style.cssText = "background-color: #ffe5e5; color: #d32f2f; font-weight: bold; border-bottom: 2px dashed #d32f2f; padding: 0 2px; border-radius: 3px;";
        mark.textContent = part;
        fragment.appendChild(mark);
      } else if (part) {
        fragment.appendChild(document.createTextNode(part));
      }
    });

    try { node.parentNode.replaceChild(fragment, node); } catch (e) { }
  });
}

function clearHighlights() {
  document.querySelectorAll('.scamcheck-highlight').forEach(mark => {
    const parent = mark.parentNode;
    if (parent) {
      parent.replaceChild(document.createTextNode(mark.textContent), mark);
      parent.normalize();
    }
  });
}

function removeWarningWidget() {
  const widget = document.getElementById('scamcheck-widget-container');
  if (widget) {
    widget.remove();
  }
  clearHighlights();
}

function showWarningWidget(resultData) {
  if (!isContextAlive()) return;
  const score = resultData.score || 'N/A';
  const message = resultData.message || 'Suspicious content detected.';
  // Default to empty array if backend doesn't provide reasons yet
  const reasons = Array.isArray(resultData.reasons) ? resultData.reasons : [];

  let widget = document.getElementById('scamcheck-widget-container');
  if (!widget) {
    widget = document.createElement('div');
    widget.id = 'scamcheck-widget-container';
    widget.style.cssText = `
     position: fixed;
     bottom: 20px;
     right: 20px;
     z-index: 2147483647;
     font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
     touch-action: none;
     user-select: none;
     will-change: transform;
     `;
    document.body.appendChild(widget);

    setupWidgetDrag(widget);
  }

  // Generate reasons list HTML if available
  const reasonsHtml = reasons.length > 0
    ? `<ul style="margin: 8px 0 0 0; padding-left: 20px; font-size: 12px; color: #444;">
         ${reasons.map(r => `<li>${r}</li>`).join('')}
       </ul>`
    : '';

  widget.innerHTML = `
    <!-- Collapsed State (Default) -->
    <div id="scamcheck-collapsed" style="
      background: #d32f2f; 
      color: white; 
      width: 48px; 
      height: 48px; 
      border-radius: 50%; 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      box-shadow: 0 4px 12px rgba(211, 47, 47, 0.4);
      cursor: grab;
      font-size: 20px;
      user-select: none;
    " title="ScamCheck: Threat Detected (Click to expand)">
      🛡️
    </div>

    <!-- Expanded State -->
    <div id="scamcheck-expanded" style="
      display: none;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.15);
      width: 280px;
      overflow: hidden;
      cursor: default;
    ">
      <div style="background: #ffebee; padding: 12px 16px; border-bottom: 1px solid #ffcdd2; display: flex; justify-content: space-between; align-items: center; cursor: grab;" class="scamcheck-drag-handle">
        <strong style="color: #d32f2f; font-size: 14px; display: flex; align-items: center; gap: 6px;">
          <span>⚠</span> ScamCheck Alert
        </strong>
        <button id="scamcheck-collapse-btn" style="background: none; border: none; cursor: pointer; color: #d32f2f; font-size: 16px; padding: 0;">&times;</button>
      </div>
      
      <div style="padding: 16px;">
        <div style="font-weight: 600; font-size: 15px; margin-bottom: 6px; color: #111;">
          Risk Score: <span style="color: #d32f2f;">${score}/100</span>
        </div>
        <div style="font-size: 13px; color: #333; line-height: 1.4;">
          ${message}
        </div>
        ${reasonsHtml}
      </div>
    </div>
  `;

  // Toggle Logic
  widget.addEventListener('click', (e) => {

    // CLICK WARNING ICON → OPEN FULL WARNING
    const collapsed = e.target.closest('#scamcheck-collapsed') ||
      (e.target === widget && widget.querySelector('#scamcheck-collapsed')?.style.display !== 'none' ? widget.querySelector('#scamcheck-collapsed') : null);

    if (collapsed) {

      // Ignore click if the icon was dragged
      if (widget.dataset.dragged === 'true') {
        widget.dataset.dragged = 'false';
        return;
      }

      const expanded = widget.querySelector('#scamcheck-expanded');

      if (expanded) {
        collapsed.style.display = 'none';
        expanded.style.display = 'block';
      }

      return;
    }

    // CLICK X → CLOSE WARNING
    const collapseButton = e.target.closest('#scamcheck-collapse-btn');

    if (collapseButton) {

      const expanded = widget.querySelector('#scamcheck-expanded');
      const collapsedView = widget.querySelector('#scamcheck-collapsed');

      if (expanded && collapsedView) {
        expanded.style.display = 'none';
        collapsedView.style.display = 'flex';

        widget.dataset.dragged = 'false';
      }
    }
  });

  // ---------------------------------------------------------------
  // Smooth Draggable Logic
  // ---------------------------------------------------------------
  // ---------------------------------------------------------------
  // Ultra Smooth Draggable Widget
  // ---------------------------------------------------------------
  function setupWidgetDrag(widget) {
    let isDragging = false;
    let hasMoved = false;

    let startX = 0;
    let startY = 0;

    let initialX = 0;
    let initialY = 0;

    let currentX = 0;
    let currentY = 0;

    let animationFrame = null;
    let activePointerId = null;

    const DRAG_THRESHOLD = 4;

    // -------------------------------------------------------------
    // POINTER DOWN
    // -------------------------------------------------------------
    function onPointerDown(e) {
      // Only allow left mouse button
      if (e.pointerType === 'mouse' && e.button !== 0) {
        return;
      }

      // Don't start dragging from buttons
      if (e.target.closest('button')) {
        return;
      }

      // Only drag from the collapsed circle
      // or expanded header
      const dragTarget =
        e.target.closest('#scamcheck-collapsed') ||
        e.target.closest('.scamcheck-drag-handle');

      if (!dragTarget) {
        return;
      }

      isDragging = true;
      hasMoved = false;
      activePointerId = e.pointerId;

      widget.dataset.dragged = 'false';

      startX = e.clientX;
      startY = e.clientY;

      // Get current rendered position
      const rect = widget.getBoundingClientRect();

      initialX = rect.left;
      initialY = rect.top;

      currentX = initialX;
      currentY = initialY;

      // Convert from right/bottom positioning
      // to left/top positioning ONCE.
      widget.style.right = 'auto';
      widget.style.bottom = 'auto';
      widget.style.left = `${initialX}px`;
      widget.style.top = `${initialY}px`;

      // Reset previous transform
      widget.style.transform = 'translate3d(0, 0, 0)';

      // Prevent text selection while dragging
      document.body.style.userSelect = 'none';

      // Keep receiving pointer events even if cursor
      // leaves the widget.
      try {
        widget.setPointerCapture(e.pointerId);
      } catch (err) { }

      // IMPORTANT:
      // Do NOT call preventDefault() here.
      // The browser must still be able to generate
      // the normal click event.
    }

    // -------------------------------------------------------------
    // POINTER MOVE
    // -------------------------------------------------------------
    function onPointerMove(e) {
      if (!isDragging || e.pointerId !== activePointerId) {
        return;
      }

      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      // -----------------------------------------------------------
      // CLICK VS DRAG
      // -----------------------------------------------------------
      if (!hasMoved) {
        if (
          Math.abs(dx) <= DRAG_THRESHOLD &&
          Math.abs(dy) <= DRAG_THRESHOLD
        ) {
          return;
        }

        hasMoved = true;
        widget.dataset.dragged = 'true';
      }

      // -----------------------------------------------------------
      // BOUNDARY CALCULATION
      // -----------------------------------------------------------
      const widgetWidth = widget.offsetWidth;
      const widgetHeight = widget.offsetHeight;

      const maxX = Math.max(0, window.innerWidth - widgetWidth);
      const maxY = Math.max(0, window.innerHeight - widgetHeight);

      currentX = Math.max(
        0,
        Math.min(initialX + dx, maxX)
      );

      currentY = Math.max(
        0,
        Math.min(initialY + dy, maxY)
      );

      // -----------------------------------------------------------
      // GPU-ACCELERATED MOVEMENT
      // -----------------------------------------------------------
      if (animationFrame !== null) {
        return;
      }

      animationFrame = requestAnimationFrame(() => {
        const moveX = currentX - initialX;
        const moveY = currentY - initialY;

        widget.style.transform =
          `translate3d(${moveX}px, ${moveY}px, 0)`;

        animationFrame = null;
      });
    }

    // -------------------------------------------------------------
    // POINTER UP
    // -------------------------------------------------------------
    function onPointerUp(e) {
      if (!isDragging || e.pointerId !== activePointerId) {
        return;
      }

      isDragging = false;

      document.body.style.userSelect = '';

      // Save final position
      widget.style.left = `${currentX}px`;
      widget.style.top = `${currentY}px`;

      // Remove temporary transform
      widget.style.transform = 'translate3d(0, 0, 0)';

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      try {
        if (widget.hasPointerCapture(e.pointerId)) {
          widget.releasePointerCapture(e.pointerId);
        }
      } catch (err) { }

      activePointerId = null;
    }

    // -------------------------------------------------------------
    // POINTER CANCEL
    // -------------------------------------------------------------
    function onPointerCancel(e) {
      if (!isDragging || e.pointerId !== activePointerId) {
        return;
      }

      isDragging = false;

      document.body.style.userSelect = '';

      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame);
        animationFrame = null;
      }

      try {
        if (widget.hasPointerCapture(e.pointerId)) {
          widget.releasePointerCapture(e.pointerId);
        }
      } catch (err) { }

      activePointerId = null;
    }

    // -------------------------------------------------------------
    // EVENT LISTENERS
    // -------------------------------------------------------------
    widget.addEventListener('pointerdown', onPointerDown);
    widget.addEventListener('pointermove', onPointerMove);
    widget.addEventListener('pointerup', onPointerUp);
    widget.addEventListener('pointercancel', onPointerCancel);
  }
}
watchForInvalidation();
