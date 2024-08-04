/**
 * Object containing references to important DOM elements.
 * @type {Object}
 */
const elements = {
  checkButton: document.getElementById('check-summary'),
  summary: document.getElementById('summary'),
  loadingScreen: document.getElementById('loading-screen'),
};

/**
 * Flag to track if summarization is in progress.
 * @type {boolean}
 */
let isLoading = false;

// Event Listeners
document.addEventListener('DOMContentLoaded', initializePopup);
elements.checkButton.addEventListener('click', handleCheckResult);

// Message Listeners
chrome.runtime.onMessage.addListener(handleRuntimeMessages);

/**
 * Initializes the popup by loading the most recent summary.
 */
function initializePopup() {
  loadMostRecentSummary();
}

/**
 * Loads and displays the most recent summary from storage.
 */
function loadMostRecentSummary() {
  showLoading(true);
  chrome.runtime.sendMessage({ type: 'GET_SUMMARY' }, (response) => {
    updateSummaryDisplay(response.summary);
    showLoading(false);
  });
}

/**
 * Handles the click event on the check result button.
 * Retrieves the most recent summary and displays it in the active tab.
 */
function handleCheckResult() {
  if (isLoading) return; // Prevent action if already loading

  showLoading(true);
  chrome.runtime.sendMessage({ type: 'GET_SUMMARY' }, (response) => {
    const summary = response.summary || 'No summary available.';
    if (summary === 'No summary available.') {
      showLoading(false);
      return;
    }
    showSummaryInActiveTab(summary);
  });
}

/**
 * Shows or hides the loading screen.
 * @param {boolean} show - Whether to show or hide the loading screen.
 */
function showLoading(show) {
  isLoading = show;
  elements.loadingScreen.style.display = show ? 'block' : 'none';
  elements.summary.style.display = show ? 'none' : 'block';
  elements.checkButton.disabled = show;
}

/**
 * Updates the summary display with the provided summary text.
 * @param {string} summaryText - The summary text to display.
 */
function updateSummaryDisplay(summaryText) {
  elements.summary.textContent = summaryText;
}

/**
 * Displays the summary in the active tab.
 * @param {string} summary - The summary to display.
 */
function showSummaryInActiveTab(summary) {
  chrome.tabs.query({ active: true, currentWindow: true }, ([activeTab]) => {
    chrome.scripting.executeScript({
      target: { tabId: activeTab.id },
      files: ['scripts/content.js'],
    }, () => {
      chrome.tabs.sendMessage(activeTab.id, { type: 'SHOW_SUMMARY', summary });
      showLoading(false);
    });
  });
}

/**
 * Handles runtime messages from other parts of the extension.
 * @param {Object} message - The received message.
 */
function handleRuntimeMessages(message) {
  switch (message.type) {
    case 'SUMMARY_UPDATED':
      loadMostRecentSummary();
      break;
    case 'SHOW_LOADING':
      showLoading(message.show);
      break;
  }
}