import React, { useEffect, useState, useCallback } from "react";
import { checkServerStatus, clearSummary, getSummary } from "@src/utils/utils";
import { Message } from "@src/types/types";
import Loader from "@src/component/Loader/Loader";

const API_URL = "http://127.0.0.1:8000";
const Popup: React.FC = () => {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<"running" | "down">(
    "running"
  );

  /**
   * Checks the status of the summarization server.
   */
  const checkStatus = useCallback(async () => {
    const status = await checkServerStatus(API_URL);
    setServerStatus(status ? "running" : "down");
  }, []);

  /**
   * Loads the most recent summary from storage.
   */
  const loadMostRecentSummary = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSummary();
      setSummary(result);
    } catch (error) {
      console.error("Error loading most recent summary:", error);
      setSummary("No summary available.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadSummaryAndCheckStatus = async () => {
      try {
        await loadMostRecentSummary();
        await checkStatus();
      } catch (error) {
        console.error("Error loading summary or checking status:", error);
      }
    };

    loadSummaryAndCheckStatus();

    const messageListener = (message: Message) => {
      if (message.type === "SUMMARY_UPDATED") {
        loadSummaryAndCheckStatus();
        setIsLoading(false);
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    const getInitialLoadingState = () => {
      chrome.runtime.sendMessage({ type: "GET_LOADING_STATE" }, (response) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error getting initial loading state:",
            chrome.runtime.lastError
          );
          return;
        }
        setIsLoading(response.isLoading);
      });
    };

    const handleLoadingStateChange = (message: any) => {
      if (message.type === "LOADING_STATE_CHANGED") {
        setIsLoading(message.isLoading);
      }
    };

    getInitialLoadingState();
    chrome.runtime.onMessage.addListener(handleLoadingStateChange);

    chrome.storage.local.set({ contentInjected: false });
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  /**
   * Handles the "Check Result" button click.
   * Retrieves the summary and displays it in the active tab.
   */
  const handleCheckResult = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getSummary();
      if (result !== "No summary available.") {
        await displaySummaryInActiveTab(result);
      }
    } catch (error) {
      console.error("Error checking result:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Handles the "Clear Summary" button click.
   * Clears the summary from storage and updates the state.
   */
  const handleClearSummary = useCallback(async () => {
    try {
      await clearSummary();
      setSummary("Summary cleared");
    } catch (error) {
      console.error("Error clearing summary:", error);
      setSummary("Error clearing summary");
    }
  }, []);

  /**
   * Displays the summary in the active tab by sending a message to the content script.
   * @param summary - The summary to display.
   */
  const displaySummaryInActiveTab = async (summary: string) => {
    chrome.tabs.query(
      { active: true, currentWindow: true },
      async ([activeTab]) => {
        if (activeTab.id) {
          try {
            await sendMessageToContentScript(activeTab.id, summary);
          } catch (error) {
            console.error("Error sending message to content script:", error);
          }
        }
      }
    );
  };

  /**
   * Sends a message to the content script to display the summary.
   * @param tabId - The ID of the tab to send the message to.
   * @param summary - The summary to display.
   */
  const sendMessageToContentScript = async (
    tabId: number,
    summary: string
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      chrome.tabs.sendMessage(
        tabId,
        { type: "SHOW_SUMMARY", summary } as Message,
        (response) => {
          if (chrome.runtime.lastError) {
            injectContentScriptAndRetry(tabId, summary, resolve, reject);
          } else if (response && response.received) {
            console.log("Summary displayed, closing popup");
            window.close();
            resolve();
          } else {
            reject(new Error("Failed to display summary"));
          }
        }
      );
    });
  };

  /**
   * Injects the content script and retries sending the message if the initial attempt fails.
   * @param tabId - The ID of the tab to inject the script into.
   * @param summary - The summary to display.
   * @param resolve - The resolve function of the Promise.
   * @param reject - The reject function of the Promise.
   */
  const injectContentScriptAndRetry = (
    tabId: number,
    summary: string,
    resolve: () => void,
    reject: (reason?: any) => void
  ) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ["content.js"],
      },
      () => {
        chrome.tabs.sendMessage(
          tabId,
          { type: "SHOW_SUMMARY", summary } as Message,
          (response) => {
            if (response && response.received) {
              console.log("Summary displayed after injection, closing popup");
              window.close();
              resolve();
            } else {
              reject(new Error("Failed to display summary after injection"));
            }
          }
        );
      }
    );
  };

  if (serverStatus === "down") {
    return (
      <div className="server-down">
        <h1>Server Status</h1>
        <p>The server is currently down. Please try again later.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Text Summarizer</h1>
      <p>Select text on a webpage, right-click, and choose "Summarize"!</p>
      {isLoading ? <Loader /> : <div id="summary">{summary}</div>}
      <button
        id="check-result"
        onClick={handleCheckResult}
        disabled={isLoading}
      >
        Check Result
      </button>
      <button
        id="clear-summary"
        onClick={handleClearSummary}
        disabled={isLoading}
      >
        <img src="icons/delete.png" alt="delete" id="clear-btn" />
      </button>
    </div>
  );
};

export default Popup;
