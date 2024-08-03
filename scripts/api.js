// Initialize context menu
chrome.runtime.onInstalled.addListener(() => {
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
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  console.log("menu item clicked: ", info.menuItemId);
  if (info.menuItemId === "summarizeSelection") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: performSummarization,
      args: [info.selectionText, "text"],
    });
  } else if (info.menuItemId === "summarizeArticle") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: performSummarization,
      args: [tab.url, "url"],
    });
  }
});

async function performSummarization(payload, type) {
  chrome.runtime.sendMessage({ type: "SHOW_LOADING", show: true });
  console.log("SHOW_LOADING sent");
  console.time("Summarization Time");
  console.log("Type: ", type);
  try {
    const response = await fetch("http://127.0.0.1:8000/summarize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(
        type === "text" ? { text: payload } : { url: payload }
      ),
    });

    if (!response.ok) {
      console.log("Error in summarizing: ", response);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const summary = await response.json();
    console.log("Summary Success!", summary);

    // Store summary with expiration
    const expirationTime = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now
    const summaryData = {
      text: summary.summary, // Changed from summary.text to summary.summary
      expiration: expirationTime,
      type: type,
      payload: payload,
    };

    // Use a unique key for storage
    const storageKey = type === "url" ? payload : `text_${Date.now()}`;
    console.log("Storage Key: ", storageKey);

    // Use sync storage
    chrome.storage.sync.set({ [storageKey]: summaryData }, () => {
      chrome.runtime.sendMessage({
        type: "SUMMARY_UPDATED",
        key: storageKey,
        summaryData: summaryData,
      });
    });
  } catch (error) {
    console.error("Error in summarizing: ", error);
  } finally {
    // chrome.runtime.sendMessage({ type: "SHOW_LOADING", show: false });
    console.timeEnd("Summarization Time");
  }
}

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_SUMMARY") {
    chrome.storage.sync.get(null, (items) => {
      let mostRecentSummary = null;
      let mostRecentTime = 0;

      for (let key in items) {
        const summaryData = items[key];
        if (summaryData.expiration > mostRecentTime) {
          mostRecentSummary = summaryData;
          mostRecentTime = summaryData.expiration;
        }
      }

      sendResponse({
        summary: mostRecentSummary
          ? mostRecentSummary.text
          : "No summary available.",
      });
    });
    return true; // Indicates that the response is sent asynchronously
  }
});
