import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { Message } from "@src/types/types";

interface SummaryPopupProps {
  summary: string;
  onClose: () => void;
}

/**
 * Component for displaying the summary popup in the active tab.
 */
const SummaryPopup: React.FC<SummaryPopupProps> = ({ summary, onClose }) => {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        backgroundColor: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        zIndex: 10000,
      }}
    >
      <div
        style={{
          backgroundColor: "#ecf0f1",
          color: "#2c3e50",
          padding: "2rem",
          borderRadius: "1rem",
          textAlign: "center",
          maxWidth: "80%",
          maxHeight: "80%",
          overflowY: "auto",
        }}
      >
        <p style={{ fontSize: "1rem" }}>{summary}</p>
        <button
          onClick={onClose}
          style={{
            backgroundColor: "#2980b9",
            color: "#ecf0f1",
            border: "none",
            borderRadius: "0.5rem",
            padding: "0.5rem 1rem",
            fontSize: "1rem",
            cursor: "pointer",
            marginTop: "1rem",
            transition: "background-color 0.3s ease",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

/**
 * Content script component that listens for messages to show the summary popup.
 */
const Content: React.FC = () => {
  const [summary, setSummary] = useState<string | null>(null);

  useEffect(() => {
    const messageListener = (
      request: Message,
      sender: chrome.runtime.MessageSender,
      sendResponse: (response?: any) => void
    ) => {
      if (request.type === "SHOW_SUMMARY") {
        console.log("SHOW_SUMMARY message received");
        setSummary(request.summary);
        sendResponse({ received: true });
      }
    };

    chrome.runtime.onMessage.addListener(messageListener);

    return () => {
      chrome.runtime.onMessage.removeListener(messageListener);
    };
  }, []);

  if (!summary) {
    return null;
  }

  console.log("Rendering summary popup with summary");
  return <SummaryPopup summary={summary} onClose={() => setSummary(null)} />;
};
// Check if the root element already exists
let root = document.getElementById("summary-root");

if (!root) {
  // If it doesn't exist, create it
  root = document.createElement("div");
  root.id = "summary-root";
  document.body.appendChild(root);
}

// Render the Content component
ReactDOM.render(<Content />, root);
``;

// Listen for messages from the popup
chrome.runtime.onMessage.addListener(
  (request: Message, sender, sendResponse) => {
    if (request.type === "SHOW_SUMMARY") {
      // Force a re-render of the Content component
      ReactDOM.render(<Content />, root);
    }
    sendResponse({ received: true });
    return true; // Indicates that the response is sent asynchronously
  }
);

export default Content;
