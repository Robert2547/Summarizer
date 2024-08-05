import { Message, SummaryData } from "../types/types";

/**
 * Retrieves the most recent summary from Chrome storage.
 * @returns A promise that resolves to the summary text.
 */
export const getSummary = (): Promise<string> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { type: "GET_SUMMARY" } as Message,
      (response: { summary: string }) => {
        resolve(response.summary);
      }
    );
  });
};

/**
 * Clears all summaries from Chrome storage.
 * @returns A promise that resolves when the operation is complete.
 */
export const clearSummary = (): Promise<void> => {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type: "CLEAR_SUMMARY" } as Message, () => {
      resolve();
    });
  });
};

/**
 * Checks the status of the summarization server.
 * @param apiUrl The base URL of the summarization API.
 * @returns A promise that resolves to true if the server is running, false otherwise.
 */
export const checkServerStatus = async (apiUrl: string): Promise<boolean> => {
  try {
    const response = await fetch(`${apiUrl}/healthcheck`);
    return response.ok;
  } catch (error) {
    return false;
  }
};

/**
 * Retrieves the most recent summary from the provided storage items.
 * @param items An object containing all items in Chrome storage.
 * @returns The most recent SummaryData object, or null if no summaries exist.
 */
export const getMostRecentSummary = (items: {
  [key: string]: SummaryData;
}): SummaryData | null => {
  return Object.values(items).reduce((mostRecent, current) => {
    return !mostRecent || current.expiration > mostRecent.expiration
      ? current
      : mostRecent;
  }, null as SummaryData | null);
};
