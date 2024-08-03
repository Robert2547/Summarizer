document.addEventListener("DOMContentLoaded", () => {
  const checkButton = document.getElementById("check-summary");

  checkServerStatus();

  // Load the most recent summary
  loadMostRecentSummary();

  checkResult(checkButton);

  // Check for summary when popup is opened
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "SUMMARY_UPDATED") {
      loadMostRecentSummary();
    }
  });
});

async function loadMostRecentSummary() {
  const summaryElement = document.getElementById("summary");
  showLoading(true);
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

    if (mostRecentSummary && Date.now() < mostRecentSummary.expiration) {
      summaryElement.textContent = mostRecentSummary.text;
    } else {
      summaryElement.textContent = "No recent summary available.";
    }

    console.log(
      "Most recent summary: ",
      mostRecentSummary ? mostRecentSummary.text : "None"
    );
    showLoading(false);
  });
}
function showLoading(show) {
  const summaryElement = document.getElementById("summary");
  const loadingScreen = document.getElementById("loading-screen");

  if (summaryElement && loadingScreen) {
    if (show) {
      // Show loading screen
      loadingScreen.style.display = "block";
      summaryElement.style.display = "none";
      return true;
    } else {
      // Hide loading screen
      loadingScreen.style.display = "none";
      summaryElement.style.display = "block";
      return false;
    }
  } else {
    console.error("Summary or loading screen element not found");
  }
}

// Check for new summary updates
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SUMMARY_UPDATED") {
    loadMostRecentSummary();
  }
});

// Add this listener to handle loading state changes
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "SHOW_LOADING") {
    showLoading(message.show);
  }
});

async function checkServerStatus() {
  try {
    const response = await fetch("http://127.0.0.1:8000/healthcheck");
    if (response.ok) {
      console.log("Server is running");
      chrome.storage.local.set({ serverStatus: "running" });
    } else {
      throw new Error("Server not reachable");
    }
  } catch (error) {
    console.log("Server is down: ", error);
    chrome.storage.local.set({ serverStatus: "down" });
    // Replace popup content with the status page
    document.body.innerHTML =
      '<object type="text/html" data="status.html" width="300px" height="200px"></object>';
  }
}

async function checkResult(checkButton) {
  // Check result button click event
  checkButton.addEventListener("click", () => {
    showLoading(true); // Show loading screen
    chrome.runtime.sendMessage({ type: "GET_SUMMARY" }, (response) => {
      const summary = response.summary || showLoading(true);
      if (summary === showLoading(true)) {
        // No content to show, return
        return;
      }

      // Query for the active tab in the current window
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const activeTab = tabs[0];
        try {
          // Inject content script into the active tab
          chrome.scripting.executeScript(
            {
              target: { tabId: activeTab.id },
              files: ["scripts/content.js"], // Adjusted path
            },
            () => {
              // Send message to content script to show the popup
              chrome.tabs.sendMessage(activeTab.id, {
                type: "SHOW_SUMMARY",
                summary,
              });
              showLoading(false); // Hide loading screen after summary is shown
            }
          );
        } catch (error) {
          console.log("Error in sending SHOW_SUMMARY message: ", error);
          showLoading(false); // Hide loading screen if there's an error
        }
      });
    });
  });
}
