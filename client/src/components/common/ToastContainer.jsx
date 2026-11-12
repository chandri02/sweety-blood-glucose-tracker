import React from 'react';
import { useToastState } from '../../context/ToastContext';

export default function ToastContainer() {
  const { toasts, removeToast } = useToastState();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      className="toast-container"
      role="region"
      aria-label="System Notifications"
      aria-live="polite"
    >
      {toasts.map((t) => {
        const isAlert = t.type === 'error' || t.type === 'warning';
        const icon =
          t.type === 'success'
            ? '✓'
            : t.type === 'error'
            ? '⚠️'
            : t.type === 'warning'
            ? '⚠️'
            : 'ℹ️';

        return (
          <div
            key={t.id}
            className={`toast-item toast-${t.type}`}
            role={isAlert ? 'alert' : 'status'}
          >
            <div className="toast-icon-wrap" aria-hidden="true">
              {icon}
            </div>
            <div className="toast-content">
              {t.title && <div className="toast-title">{t.title}</div>}
              <div className="toast-message">{t.message}</div>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => removeToast(t.id)}
              aria-label="Close notification"
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
