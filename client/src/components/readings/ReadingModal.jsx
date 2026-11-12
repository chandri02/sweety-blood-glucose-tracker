import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { TIME_SLOTS, getGlucoseStatus } from '../../utils/clinical';
import { createReading, updateReading } from '../../api/readings.api';

export default function ReadingModal({
  isOpen,
  onClose,
  onSaved,
  initialData = null, // if provided, edit mode; else create mode
}) {
  const isEdit = Boolean(initialData?.id);
  const today = new Date().toISOString().split('T')[0];

  const [readingDate, setReadingDate] = useState(today);
  const [timeSlot, setTimeSlot] = useState(TIME_SLOTS[0]);
  const [glucoseValue, setGlucoseValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setReadingDate(initialData.reading_date || today);
      setTimeSlot(initialData.time_slot || TIME_SLOTS[0]);
      setGlucoseValue(initialData.glucose_value !== undefined ? String(initialData.glucose_value) : '');
    } else {
      setReadingDate(today);
      setTimeSlot(TIME_SLOTS[0]);
      setGlucoseValue('');
    }
    setError(null);
    setFieldErrors({});
  }, [initialData, isOpen, today]);

  if (!isOpen) return null;

  const currentStatus = glucoseValue && !isNaN(glucoseValue)
    ? getGlucoseStatus(Number(glucoseValue))
    : null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Client-side quick validation
    const errors = {};
    if (!readingDate) errors.reading_date = 'Date is required';
    if (readingDate > today) errors.reading_date = 'Reading date cannot be in the future';
    if (!timeSlot) errors.time_slot = 'Time slot is required';
    const numVal = Number(glucoseValue);
    if (!glucoseValue || isNaN(numVal)) {
      errors.glucose_value = 'Glucose value is required';
    } else if (numVal < 40 || numVal > 600) {
      errors.glucose_value = 'Glucose value must be between 40 and 600 mg/dL';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        reading_date: readingDate,
        time_slot: timeSlot,
        glucose_value: numVal,
      };

      let result;
      if (isEdit) {
        result = await updateReading(initialData.id, payload);
      } else {
        result = await createReading(payload);
      }

      onSaved(result);
      onClose();
    } catch (err) {
      const resp = err.response?.data?.error;
      if (resp?.details) {
        setFieldErrors(resp.details);
      }
      setError(resp?.message || 'Failed to save glucose reading. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Blood Glucose Reading' : 'Log Blood Glucose Reading'}
      icon="🩸"
      size="md"
    >
      {error && (
        <div className="modal-alert modal-alert-error" role="alert">
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="modal-form">
        <div className="form-group">
          <label htmlFor="reading-date-input" className="form-label">
            Reading Date <span className="required">*</span>
          </label>
          <input
            id="reading-date-input"
            type="date"
            data-autofocus="true"
            className={`form-input ${fieldErrors.reading_date ? 'input-error' : ''}`}
            value={readingDate}
            max={today}
            onChange={(e) => setReadingDate(e.target.value)}
            required
          />
          {fieldErrors.reading_date && (
            <span className="field-error-text">{fieldErrors.reading_date}</span>
          )}
        </div>

        <div className="form-group">
          <label htmlFor="reading-slot-select" className="form-label">
            Clinical Time Slot <span className="required">*</span>
          </label>
          <select
            id="reading-slot-select"
            className={`form-input ${fieldErrors.time_slot ? 'input-error' : ''}`}
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            required
          >
            {TIME_SLOTS.map((slot) => (
              <option key={slot} value={slot}>
                {slot}
              </option>
            ))}
          </select>
          {fieldErrors.time_slot && (
            <span className="field-error-text">{fieldErrors.time_slot}</span>
          )}
          <small className="form-hint">
            Maximum 4 readings per day (one per clinical time slot).
          </small>
        </div>

        <div className="form-group">
          <label htmlFor="reading-glucose-input" className="form-label">
            Glucose Value (mg/dL) <span className="required">*</span>
          </label>
          <div className="glucose-input-wrapper">
            <input
              id="reading-glucose-input"
              type="number"
              min="40"
              max="600"
              step="1"
              placeholder="e.g. 105"
              className={`form-input ${fieldErrors.glucose_value ? 'input-error' : ''}`}
              value={glucoseValue}
              onChange={(e) => setGlucoseValue(e.target.value)}
              required
            />
            <span className="input-unit">mg/dL</span>
          </div>
          {fieldErrors.glucose_value && (
            <span className="field-error-text">{fieldErrors.glucose_value}</span>
          )}

          {/* Live Clinical Status Preview */}
          {currentStatus && (
            <div className="live-status-preview">
              <span className="preview-label">Category Preview:</span>
              <span className={`status-badge ${currentStatus.className}`}>
                {currentStatus.label}
              </span>
              <span className="preview-desc">({currentStatus.description})</span>
            </div>
          )}
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
            type="submit"
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Saving...' : isEdit ? 'Update Reading' : 'Save Reading'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
