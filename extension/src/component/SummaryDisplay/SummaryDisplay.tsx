import React from "react";

interface SummaryDisplayProps {
  summary: string;
}

/**
 * Component for displaying the summary text.
 * @param summary - The summary text to display.
 */
const SummaryDisplay: React.FC<SummaryDisplayProps> = ({ summary }) => (
  <div id="summary">{summary}</div>
);

export default SummaryDisplay;
