import React, { useEffect, useState } from "react";
import { getSummary, clearSummary, checkServerStatus } from "@src/utils/utils";
import { Message } from "@src/types/types";

// const API_URL = process.env.API_URL || "http://127.0.0.1:8000";
const API_URL = "http://127.0.0.1:8000";
/**
 * Popup component for the extension.
 * Displays the most recent summary and provides controls for checking and clearing summaries.
 */
const Popup: React.FC = () => {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<"running" | "down">(
    "running"
  );

  useEffect(() => {
    loadMostRecentSummary();
    checkStatus();
  }, []);

  /**
   * Loads the most recent summary from storage.
   */
  const loadMostRecentSummary = async () => {
    console.log("Loading most recent summary...");
    setIsLoading(true);
    try {
      const result = await getSummary();
      console.log("Most recent summary:", result);
      setSummary(result);
    } catch (error) {
      console.error("Error loading most recent summary:", error);
      setSummary("No summary available.");
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handles the "Check Result" button click.
   * Retrieves the most recent summary and displays it in the active tab.
   */
  const handleCheckResult = async () => {
    setIsLoading(true);
    const result = await getSummary();
    if (result !== "No summary available.") {
      chrome.tabs.query(
        { active: true, currentWindow: true },
        async ([activeTab]) => {
          if (activeTab.id) {
            try {
              // inject the content script if it's not already there
              await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                files: ["content.js"],
              });

              chrome.tabs.sendMessage(activeTab.id, {
                type: "SHOW_SUMMARY",
                summary: result,
              } as Message);
            } catch (error) {
              console.error("Error sending message to content script:", error);
            }
          }
        }
      );
    }
    setIsLoading(false);
  };

  /**
   * Handles the "Clear Summary" button click.
   * Clears all summaries from storage.
   */
  const handleClearSummary = async () => {
    await clearSummary();
    setSummary("Summary cleared");
  };

  /**
   * Checks the status of the summarization server.
   */
  const checkStatus = async () => {
    const status = await checkServerStatus(API_URL);
    setServerStatus(status ? "running" : "down");
  };

  if (serverStatus === "down") {
    return (
      <div className="server-down">
        <h1>Server Status</h1>
        <p>The server is currently down. Please come back later.</p>
      </div>
    );
  }

  return (
    <div>
      <h1>Text Summarizer</h1>
      <p>Select text on a webpage, right-click, and choose "Summarize"!</p>
      <div id="summary">{summary}</div>
      {isLoading && <div id="loading-screen">Loading...</div>}
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
