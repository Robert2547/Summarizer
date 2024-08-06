import React from 'react';

interface ActionButtonsProps {
  onCheckResult: () => void;
  onClearSummary: () => void;
  isLoading: boolean;
}

/**
 * Component for rendering action buttons in the popup.
 * @param onCheckResult - Function to handle checking the result.
 * @param onClearSummary - Function to handle clearing the summary.
 * @param isLoading - Boolean indicating if an action is in progress.
 */
const ActionButtons: React.FC<ActionButtonsProps> = ({ onCheckResult, onClearSummary, isLoading }) => (
  <div className="action-buttons">
    <button id="check-result" onClick={onCheckResult} disabled={isLoading}>
      Check Result
    </button>
    <button id="clear-summary" onClick={onClearSummary} disabled={isLoading}>
      <img src="icons/delete.png" alt="delete" id="clear-btn" />
    </button>
  </div>
);

export default ActionButtons;