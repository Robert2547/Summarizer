/**
 * Base URL for the summarization API.
 * @constant {string}
 */
const API_URL = "http://127.0.0.1:8000";

/**
 * Time in milliseconds for summary expiration (24 hours).
 * @constant {number}
 */
const SUMMARY_EXPIRATION = 24 * 60 * 60 * 1000;

// Initialize context menu
chrome.runtime.onInstalled.addListener(createContextMenus);

// Event Listeners
chrome.contextMenus.onClicked.addListener(handleContextMenuClick);
chrome.runtime.onMessage.addListener(handleRuntimeMessages);

/**
 * Creates context menu items for summarization.
 */
function createContextMenus() {
  chrome.contextMenus.create({
    id: "summarizeSelection",
    title: "Summarize Selection",
    contexts: ["selection"],
  });
  chrome.contextMenus.create({
    id: "summarizeArticle",
    title: "Summarize Article",
    contexts: ["page"],
  });
}

/**
 * Handles clicks on context menu items.
 * @param {Object} info - Information about the clicked menu item and current page. (summarizeSelection or summarizeArticle)
 * @param {Object} tab - Information about the current tab.
 */
function handleContextMenuClick(info, tab) {
  const summarizationTypes = {
    summarizeSelection: { payload: info.selectionText, type: "text" },
    summarizeArticle: { payload: tab.url, type: "url" },
  };

  const { payload, type } = summarizationTypes[info.menuItemId] || {};
  if (payload && type) {
    performSummarization(payload, type);
  }
}

/**
 * Performs summarization of the given payload.
 * @param {string} payload - The text or URL to summarize.
 * @param {string} type - The type of summarization ('text' or 'url').
 */
async function performSummarization(payload, type) {
  showLoading(true);
  console.time("Summarization Time");

  try {
    const summary = await fetchSummary(payload, type);
    await storeSummary(summary, type, payload);
  } catch (error) {
    console.error("Error in summarizing:", error);
  } finally {
    console.timeEnd("Summarization Time");
    showLoading(false);
  }
}

/**
 * Handles runtime messages from other parts of the extension.
 * @param {Object} request - The received message.
 * @param {Object} sender - Information about the message sender.
 * @param {function} sendResponse - Function to send a response.
 * @returns {boolean} - Whether the response will be sent asynchronously.
 */
function handleRuntimeMessages(request, sender, sendResponse) {
  if (request.type === "GET_SUMMARY") {
    chrome.storage.sync.get(null, (items) => {
      const mostRecentSummary = getMostRecentSummary(items);
      sendResponse({
        summary: mostRecentSummary
          ? mostRecentSummary.text
          : "No summary available.",
      });
    });
    return true; // Indicates that the response is sent asynchronously
  } else if (request.type === "SUMMARIZE") {
    performSummarization(request.payload, request.summarizationType);
    return false;
  } else if (request.type === "CLEAR_SUMMARY") {
    chrome.storage.sync.clear(() => {
      console.log("Cache cleared");
      sendResponse({ success: true });
    });
    return true;
  }
}

/**
 * Fetches a summary from the API.
 * @param {string} payload - The text or URL to summarize.
 * @param {string} type - The type of summarization ('text' or 'url').
 * @returns {Promise<Object>} - The summary data.
 */
async function fetchSummary(payload, type) {
  const response = await fetch(`${API_URL}/summarize`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      type === "text" ? { text: payload } : { url: payload }
    ),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

/**
 * Stores the summary in chrome.storage.sync.
 * @param {Object} summary - The summary data from the API.
 * @param {string} type - The type of summarization ('text' or 'url').
 * @param {string} payload - The original text or URL.
 */
async function storeSummary(summary, type, payload) {
  const summaryData = {
    text: summary.summary,
    expiration: Date.now() + SUMMARY_EXPIRATION,
    type,
    payload,
  };

  const storageKey = type === "url" ? payload : `text_${Date.now()}`;
  await chrome.storage.sync.set({ [storageKey]: summaryData });

  chrome.runtime.sendMessage({
    type: "SUMMARY_UPDATED",
    key: storageKey,
    summaryData,
  });
}

/**
 * Retrieves the most recent summary from storage items.
 * @param {Object} items - Storage items containing summaries.
 * @returns {Object|null} The most recent summary or null if no summaries exist.
 */
function getMostRecentSummary(items) {
  return Object.values(items).reduce((mostRecent, current) => {
    return !mostRecent || current.expiration > mostRecent.expiration
      ? current
      : mostRecent;
  }, null);
}

/**
 * Shows or hides the loading screen by sending a message to the popup.
 * @param {boolean} show - Whether to show or hide the loading screen.
 */
function showLoading(show) {
  chrome.runtime.sendMessage({ type: "SHOW_LOADING", show });
}
