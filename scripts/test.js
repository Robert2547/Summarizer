// document.addEventListener("DOMContentLoaded", () => {
//   console.log("Popup loaded");

//   const checkButton = document.getElementById("check-summary");

//   checkServerStatus();

//   // Load the most recent summary
//   loadMostRecentSummary();

//   checkResult(checkButton);
// });

// async function loadMostRecentSummary() {
//   const summaryElement = document.getElementById("summary");

//   chrome.storage.sync.get(null, async (items) => {
//     let mostRecentSummary = null;
//     let mostRecentTime = 0;

//     for (let key in items) {
//       const summaryData = items[key];
//       if (summaryData.expiration > mostRecentTime) {
//         mostRecentSummary = summaryData;
//         mostRecentTime = summaryData.expiration;
//       }
//     }

//     if (mostRecentSummary && Date.now() < mostRecentSummary.expiration) {
//       // If we have a non-expired summary, use it
//       summaryElement.textContent = mostRecentSummary.text;
//     } else {
//       summaryElement.textContent = "No recent summary available.";
//     }
//   });
// }

// // Listen for summary updates
// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.type === "SUMMARY_UPDATED") {
//     const summaryElement = document.getElementById("summary");
//     summaryElement.textContent = message.summaryData.text;
//   }
// });
