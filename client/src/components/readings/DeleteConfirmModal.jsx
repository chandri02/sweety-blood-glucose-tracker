import React, { useState } from 'react';
import Modal from '../common/Modal';
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Delete Glucose Reading"
      icon="🗑️"
      size="sm"
    >
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
          data-autofocus="true"
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
    </Modal>
  );
}
