/**
 * Represents the structure of a summary stored in Chrome storage.
 */
export interface SummaryData {
  /** The summarized text. */
  text: string;
  /** The expiration timestamp of the summary. */
  expiration: number;
  /** The type of the summary (text or URL). */
  type: "text" | "url";
  /** The original text or URL that was summarized. */
  payload: string;
}

/**
 * Represents the possible messages that can be sent between different parts of the extension.
 */
export type Message =
  | { type: "GET_SUMMARY" }
  | { type: "SUMMARIZE"; payload: string; summarizationType: "text" | "url" }
  | { type: "CLEAR_SUMMARY" }
  | { type: "SHOW_LOADING"; show: boolean }
  | { type: "SHOW_SUMMARY"; summary: string }
  | { type: "SUMMARY_UPDATED"; key: string; summaryData: SummaryData };
