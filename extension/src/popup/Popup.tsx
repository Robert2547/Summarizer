import React, { useEffect, useState } from "react";
import { checkServerStatus } from "@src/utils/utils";
import { Message } from "@src/types/types";

const API_URL = "http://127.0.0.1:8000";

const Popup: React.FC = () => {
  const [summary, setSummary] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [serverStatus, setServerStatus] = useState<"running" | "down">(
    "running"
  );

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
    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  const loadMostRecentSummary = async () => {
    console.log("Loading most recent summary...");
    setIsLoading(true);
    try {
      const result = await new Promise<string>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "GET_SUMMARY" } as Message,
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response.summary);
            }
          }
        );
      });
      setSummary(result);
    } catch (error) {
      console.error("Error loading most recent summary:", error);
      setSummary("No summary available.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheckResult = async () => {
    setIsLoading(true);
    try {
      const result = await new Promise<string>((resolve, reject) => {
        chrome.runtime.sendMessage(
          { type: "GET_SUMMARY" } as Message,
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(response.summary);
            }
          }
        );
      });
      if (result !== "No summary available.") {
        chrome.tabs.query(
          { active: true, currentWindow: true },
          async ([activeTab]) => {
            if (activeTab.id) {
              try {
                await chrome.scripting.executeScript({
                  target: { tabId: activeTab.id },
                  files: ["content.js"],
                });
                chrome.tabs.sendMessage(activeTab.id, {
                  type: "SHOW_SUMMARY",
                  summary: result,
                } as Message);
              } catch (error) {
                console.error(
                  "Error sending message to content script:",
                  error
                );
              }
            }
          }
        );
      }
    } catch (error) {
      console.error("Error checking result:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearSummary = async () => {
    try {
      await new Promise<void>((resolve, reject) => {
        chrome.runtime.sendMessage({ type: "CLEAR_SUMMARY" } as Message, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
      setSummary("Summary cleared");
    } catch (error) {
      console.error("Error clearing summary:", error);
      setSummary("Error clearing summary");
    }
  };

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
      {isLoading ? (
        <div id="loading-screen">Loading...</div>
      ) : (
        <div id="summary">{summary}</div>
      )}
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
