
/**
 * Listens for messages from the extension's background script.
 * Currently handles the 'SHOW_SUMMARY' message type to display a summary popup.
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SHOW_SUMMARY") {
    showSummaryPopup(request.summary);
  }
});

/**
 * Creates and displays a popup with the provided summary text.
 * @param {string} summaryText - The summary to display in the popup.
 */
function showSummaryPopup(summaryText) {
  // Remove existing popup if present
  const existingPopup = document.getElementById("summary-popup-overlay");
  if (existingPopup) {
    existingPopup.remove();
  }

  // Create popup overlay
  const popupOverlay = createPopupOverlay();

  // Create popup content
  const popupContent = createPopupContent(summaryText);

  // Append content to overlay and overlay to body
  popupOverlay.appendChild(popupContent);
  document.body.appendChild(popupOverlay);
}

/**
 * Creates the overlay element for the popup.
 * @returns {HTMLElement} The created overlay element.
 */
function createPopupOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "summary-popup-overlay";
  Object.assign(overlay.style, {
    position: "fixed",
    top: "0",
    left: "0",
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: "10000",
  });
  return overlay;
}

/**
 * Creates the content element for the popup, including the summary text and close button.
 * @param {string} summaryText - The summary to display in the popup.
 * @returns {HTMLElement} The created content element.
 */
function createPopupContent(summaryText) {
  const content = document.createElement("div");
  Object.assign(content.style, {
    backgroundColor: "#ecf0f1",
    color: "#2c3e50",
    padding: "2rem",
    borderRadius: "1rem",
    textAlign: "center",
    maxWidth: "80%",
    maxHeight: "80%",
    overflowY: "auto",
  });

  const summaryParagraph = createSummaryParagraph(summaryText);
  const closeButton = createCloseButton();

  content.appendChild(summaryParagraph);
  content.appendChild(closeButton);

  return content;
}

/**
 * Creates a paragraph element with the summary text.
 * @param {string} summaryText - The summary to display.
 * @returns {HTMLElement} The created paragraph element.
 */
function createSummaryParagraph(summaryText) {
  const paragraph = document.createElement("p");
  paragraph.textContent = summaryText;
  paragraph.style.fontSize = "1rem";
  return paragraph;
}

/**
 * Creates a close button for the popup.
 * @returns {HTMLElement} The created button element.
 */
function createCloseButton() {
  const button = document.createElement("button");
  button.textContent = "Close";
  Object.assign(button.style, {
    backgroundColor: "#2980b9",
    color: "#ecf0f1",
    border: "none",
    borderRadius: "0.5rem",
    padding: "0.5rem 1rem",
    fontSize: "1rem",
    cursor: "pointer",
    marginTop: "1rem",
    transition: "background-color 0.3s ease",
  });

  button.addEventListener("click", () => {
    document.getElementById("summary-popup-overlay").remove();
  });

  return button;
}
