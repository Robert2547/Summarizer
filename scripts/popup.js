/**
 * Base URL for the summarization API.
 * @constant {string}
 */
const API_URL = "http://127.0.0.1:8000";

/**
 * Object containing references to important DOM elements.
 * @type {Object}
 */
const elements = {
  checkButton: document.getElementById("check-summary"),
  summary: document.getElementById("summary"),
  loadingScreen: document.getElementById("loading-screen"),
  clearButton: document.getElementById("clear-summary"),
};

// Event Listeners
document.addEventListener("DOMContentLoaded", initializePopup);
elements.checkButton.addEventListener("click", handleCheckResult);
elements.clearButton.addEventListener("click", handleClearSummary);

// Message Listeners
chrome.runtime.onMessage.addListener(handleRuntimeMessages);

/**
 * Initializes the popup by loading the most recent summary.
 */
function initializePopup() {
  checkServerStatus();
  loadMostRecentSummary();
}

/**
 * Loads and displays the most recent summary from storage.
 */
function loadMostRecentSummary() {
  showLoading(true);
  chrome.runtime.sendMessage({ type: "GET_SUMMARY" }, (response) => {
    updateSummaryDisplay(response.summary);
    showLoading(false);
  });
}

/**
 * Handles the click event on the check result button.
 * Retrieves the most recent summary and displays it in the active tab.
 */
function handleCheckResult() {
  showLoading(true);
  chrome.runtime.sendMessage({ type: "GET_SUMMARY" }, (response) => {
    const summary = response.summary || "No summary available.";
    if (summary === "No summary available.") {
      showLoading(false);
      return;
    }
    showSummaryInActiveTab(summary);
  });
}

function handleClearSummary() {
  chrome.runtime.sendMessage({ type: "CLEAR_SUMMARY" }, () => {
    updateSummaryDisplay("Summary cleared");
    elements.summary.style.fontStyle = "italic";
  });
}

/**
 * Shows or hides the loading screen.
 * @param {boolean} show - Whether to show or hide the loading screen.
 */
function showLoading(show) {
  elements.loadingScreen.style.display = show ? "block" : "none";
  elements.summary.style.display = show ? "none" : "block";
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
    chrome.scripting.executeScript(
      {
        target: { tabId: activeTab.id },
        files: ["scripts/content.js"],
      },
      () => {
        chrome.tabs.sendMessage(activeTab.id, {
          type: "SHOW_SUMMARY",
          summary,
        });
        showLoading(false);
      }
    );
  });
}

/**
 * Handles runtime messages from other parts of the extension.
 * @param {Object} message - The received message.
 */
function handleRuntimeMessages(message) {
  switch (message.type) {
    case "SUMMARY_UPDATED":
      loadMostRecentSummary();
      break;
    case "SHOW_LOADING":
      showLoading(message.show);
      break;
  }
}

/**
 * Checks the status of the summarization server.
 * If the server is down, it displays a status page.
 */
async function checkServerStatus() {
  try {
    const response = await fetch(`${API_URL}/healthcheck`);
    if (response.ok) {
      console.log("Server is running");
      chrome.storage.local.set({ serverStatus: "running" });
    } else {
      throw new Error("Server not reachable");
    }
  } catch (error) {
    console.error("Server is down:", error);
    chrome.storage.local.set({ serverStatus: "down" });
    // Display status page if server is down
    document.body.innerHTML =
      '<object type="text/html" data="status.html" width="300px" height="200px"></object>';
  }
}
