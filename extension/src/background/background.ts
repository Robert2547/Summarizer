import { Message, SummaryData } from "@src/types/types";
import { getMostRecentSummary } from "@src/utils/utils";
const API_URL = "http://127.0.0.1:8000";
const SUMMARY_EXPIRATION = 24 * 60 * 60 * 1000; // 24 hours

let isLoading = false;
// Event Listeners
chrome.runtime.onInstalled.addListener(createContextMenus);
chrome.contextMenus.onClicked.addListener(
  (info: chrome.contextMenus.OnClickData, tab?: chrome.tabs.Tab) => {
    if (tab) {
      handleContextMenuClick(info, tab);
    }
  }
);
chrome.runtime.onMessage.addListener(handleRuntimeMessages);

chrome.runtime.onMessage.addListener(
  (message: Message, sender, sendResponse) => {
    if (message.type === "SHOW_LOADING") {
      sendResponse({ isLoading });
      return true;
    }
  }
);

function setLoadingState(loading: boolean) {
  isLoading = loading;
  chrome.runtime.sendMessage({ type: "LOADING_STATE_CHANGED", isLoading });
}

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
 * @param info Information about the clicked menu item and current page.
 * @param tab Information about the current tab. May be undefined.
 */
function handleContextMenuClick(
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab
) {
  const summarizationTypes: Record<
    string,
    { payload: string; type: "text" | "url" }
  > = {
    summarizeSelection: { payload: info.selectionText || "", type: "text" },
    summarizeArticle: { payload: tab?.url || "", type: "url" },
  };

  const { payload, type } = summarizationTypes[info.menuItemId as string] || {};
  if (payload && type) {
    performSummarization(payload, type);
  }
}

/**
 * Performs summarization of the given payload.
 * @param payload The text or URL to summarize.
 * @param type The type of summarization ('text' or 'url').
 */
async function performSummarization(payload: string, type: "text" | "url") {
  setLoadingState(true);
  console.time("Summarization Time");

  try {
    const summary = await fetchSummary(payload, type);
    await storeSummary(summary, type, payload);
  } catch (error) {
    console.error("Error in summarizing:", error);
  } finally {
    console.timeEnd("Summarization Time");
    setLoadingState(false);
    console.log("Hiding loading screen");
    chrome.runtime.sendMessage({ type: "SUMMARY_UPDATED" } as Message);
  }
}

/**
 * Handles runtime messages from other parts of the extension.
 * @param request The received message.
 * @param sender Information about the message sender.
 * @param sendResponse Function to send a response.
 * @returns Whether the response will be sent asynchronously.
 */
function handleRuntimeMessages(
  request: Message,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: any) => void
): boolean {
  switch (request.type) {
    case "GET_SUMMARY":
      chrome.storage.sync.get(null, (items) => {
        const mostRecentSummary = getMostRecentSummary(
          items as { [key: string]: SummaryData }
        );
        sendResponse({
          summary: mostRecentSummary
            ? mostRecentSummary.text
            : "No summary available.",
        });
      });
      return true;
    case "SUMMARIZE":
      console.log("Performing summarization...");
      performSummarization(request.payload, request.summarizationType);
      return false;
    case "CLEAR_SUMMARY":
      chrome.storage.sync.clear(() => {
        console.log("Cache cleared");
        sendResponse({ success: true });
      });
      return true;
    default:
      return false;
  }
}

/**
 * Fetches a summary from the API.
 * @param payload The text or URL to summarize.
 * @param type The type of summarization ('text' or 'url').
 * @returns A promise that resolves to the summary data.
 */
async function fetchSummary(
  payload: string,
  type: "text" | "url"
): Promise<any> {
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
 * @param summary The summary data from the API.
 * @param type The type of summarization ('text' or 'url').
 * @param payload The original text or URL.
 */
async function storeSummary(
  summary: any,
  type: "text" | "url",
  payload: string
) {
  const summaryData: SummaryData = {
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
  } as Message);
}

/**
 * Shows or hides the loading screen by sending a message to the popup.
 * @param show Whether to show or hide the loading screen.
 */
