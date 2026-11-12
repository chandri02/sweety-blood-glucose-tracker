import React from 'react';

export default function EmptyState({ message, actionText, onAction }) {
  return (
    <div className="empty-state-card" role="status">
      <div className="empty-icon" aria-hidden="true">📋</div>
      <h4 className="empty-title">No Readings Found</h4>
      <p className="empty-message">
        {message || 'No blood glucose readings were recorded for the selected timeframe.'}
      </p>
      {actionText && onAction && (
        <button type="button" className="btn btn-primary" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}
