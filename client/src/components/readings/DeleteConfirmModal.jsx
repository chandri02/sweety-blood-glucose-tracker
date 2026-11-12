import React, { useState } from 'react';
import { deleteReading } from '../../api/readings.api';

export default function DeleteConfirmModal({
  isOpen,
  reading,
  onClose,
  onDeleted,
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !reading) return null;

  async function handleDelete() {
    setLoading(true);
    setError(null);
    try {
      await deleteReading(reading.id);
      onDeleted(reading.id);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to delete reading.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-container modal-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-wrap">
            <span className="modal-icon" aria-hidden="true">🗑️</span>
            <h3 className="modal-title">Delete Glucose Reading</h3>
          </div>
          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="modal-alert modal-alert-error" role="alert">
            <span aria-hidden="true">⚠️</span> {error}
          </div>
        )}

        <div className="modal-body-confirm">
          <p>Are you sure you want to delete this recorded reading?</p>
          <div className="delete-reading-preview">
            <div><strong>Date:</strong> {reading.reading_date}</div>
            <div><strong>Slot:</strong> {reading.time_slot}</div>
            <div><strong>Glucose:</strong> {reading.glucose_value} mg/dL</div>
          </div>
          <p className="warning-note">This action cannot be undone.</p>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            disabled={loading}
          >
            {loading ? 'Deleting...' : 'Confirm Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
