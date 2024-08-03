chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "SHOW_SUMMARY") {
    const existingPopup = document.getElementById("summary-popup-overlay");
    if (existingPopup) {
      existingPopup.remove();
    }

    const popupOverlay = document.createElement("div");
    popupOverlay.id = "summary-popup-overlay";
    popupOverlay.style.position = "fixed";
    popupOverlay.style.top = "0";
    popupOverlay.style.left = "0";
    popupOverlay.style.width = "100%";
    popupOverlay.style.height = "100%";
    popupOverlay.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    popupOverlay.style.display = "flex";
    popupOverlay.style.justifyContent = "center";
    popupOverlay.style.alignItems = "center";
    popupOverlay.style.zIndex = "10000";

    const popupContent = document.createElement("div");
    popupContent.style.backgroundColor = "#ecf0f1";
    popupContent.style.color = "#2c3e50";
    popupContent.style.padding = "2rem";
    popupContent.style.borderRadius = "1rem";
    popupContent.style.textAlign = "center";
    popupContent.style.maxWidth = "80%";
    popupContent.style.maxHeight = "80%";
    popupContent.style.overflowY = "auto";

    const summaryText = document.createElement("p");
    summaryText.textContent = request.summary;
    summaryText.style.fontSize = "1rem";

    const closeButton = document.createElement("button");
    closeButton.textContent = "Close";
    closeButton.style.backgroundColor = "#2980b9";
    closeButton.style.color = "#ecf0f1";
    closeButton.style.border = "none";
    closeButton.style.borderRadius = "0.5rem";
    closeButton.style.padding = "0.5rem 1rem";
    closeButton.style.fontSize = "1rem";
    closeButton.style.cursor = "pointer";
    closeButton.style.marginTop = "1rem";
    closeButton.style.transition = "background-color 0.3s ease";

    closeButton.addEventListener("click", () => {
      popupOverlay.remove();
    });

    popupContent.appendChild(summaryText);
    popupContent.appendChild(closeButton);
    popupOverlay.appendChild(popupContent);
    document.body.appendChild(popupOverlay);
  }
});
