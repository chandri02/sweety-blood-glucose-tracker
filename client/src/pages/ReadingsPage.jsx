import React, { useState, useEffect, useCallback } from 'react';
import { getReadings } from '../api/readings.api';
import { TIME_SLOTS, getGlucoseStatus } from '../utils/clinical';
import ReadingModal from '../components/readings/ReadingModal';
import DeleteConfirmModal from '../components/readings/DeleteConfirmModal';

export default function ReadingsPage({ onDataMutated }) {
  const [readings, setReadings] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    totalReadings: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filters
  const [slotFilter, setSlotFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Modals state
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingReading, setEditingReading] = useState(null);
  const [deletingReading, setDeletingReading] = useState(null);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchReadings = useCallback(async (page = 1) => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 10,
      };
      if (slotFilter) params.timeSlot = slotFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;

      const data = await getReadings(params);
      setReadings(data.readings || []);
      setPagination(data.pagination || {
        page: 1,
        limit: 10,
        totalReadings: 0,
        totalPages: 1,
      });
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to fetch glucose readings');
    } finally {
      setLoading(false);
    }
  }, [slotFilter, startDate, endDate]);

  useEffect(() => {
    fetchReadings(1);
  }, [fetchReadings]);

  function showToast(msg) {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  }

  function handleSaved(savedReading) {
    showToast(editingReading ? 'Reading updated successfully.' : 'New reading recorded successfully.');
    fetchReadings(pagination.page);
    if (onDataMutated) onDataMutated();
  }

  function handleDeleted(deletedId) {
    showToast('Reading deleted successfully.');
    fetchReadings(pagination.page);
    if (onDataMutated) onDataMutated();
  }

  function resetFilters() {
    setSlotFilter('');
    setStartDate('');
    setEndDate('');
  }

  return (
    <div className="readings-page-container">
      {/* Page Header */}
      <div className="page-header-row">
        <div>
          <h2 className="page-title">Glucose Readings Management</h2>
          <p className="page-subtitle">
            View, filter, log, and maintain your complete blood glucose record history.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsAddOpen(true)}
        >
          <span aria-hidden="true">+</span> Log New Reading
        </button>
      </div>

      {/* Toast Alert */}
      {toastMessage && (
        <div className="alert alert-success" role="alert">
          <span aria-hidden="true">✓</span> {toastMessage}
        </div>
      )}

      {/* Filter Controls Bar */}
      <div className="readings-filters-card">
        <div className="filters-grid">
          <div className="filter-group">
            <label htmlFor="filter-slot" className="filter-label">Time Slot</label>
            <select
              id="filter-slot"
              className="filter-input"
              value={slotFilter}
              onChange={(e) => setSlotFilter(e.target.value)}
            >
              <option value="">All Time Slots</option>
              {TIME_SLOTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label htmlFor="filter-start" className="filter-label">From Date</label>
            <input
              id="filter-start"
              type="date"
              className="filter-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>

          <div className="filter-group">
            <label htmlFor="filter-end" className="filter-label">To Date</label>
            <input
              id="filter-end"
              type="date"
              className="filter-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="filter-actions">
            {(slotFilter || startDate || endDate) && (
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={resetFilters}
              >
                Clear Filters
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => fetchReadings(1)}
              disabled={loading}
            >
              Apply Filter
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-error" role="alert">
          <span aria-hidden="true">⚠️</span> {error}
        </div>
      )}

      {/* Main Table / State */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading glucose readings...</p>
        </div>
      ) : readings.length === 0 ? (
        <div className="empty-readings-box">
          <span className="empty-icon" aria-hidden="true">📋</span>
          <h3>No readings found</h3>
          <p>
            {slotFilter || startDate || endDate
              ? 'No readings match your filter criteria. Try adjusting dates or slots.'
              : 'You have not recorded any glucose readings yet.'}
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => setIsAddOpen(true)}
          >
            + Log Your First Reading
          </button>
        </div>
      ) : (
        <div className="readings-table-card">
          <div className="table-meta-bar">
            <span>
              Showing {readings.length} of {pagination.totalReadings} recorded readings
            </span>
            <span>
              Page {pagination.page} of {pagination.totalPages}
            </span>
          </div>

          <div className="table-responsive">
            <table className="readings-full-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Clinical Slot</th>
                  <th>Glucose Value</th>
                  <th>Clinical Status</th>
                  <th>Recorded At</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {readings.map((r) => {
                  const status = getGlucoseStatus(r.glucose_value);
                  const createdTime = r.created_at
                    ? new Date(r.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '—';

                  return (
                    <tr key={r.id}>
                      <td className="cell-date font-medium">{r.reading_date}</td>
                      <td>{r.time_slot}</td>
                      <td className="cell-glucose">
                        <span className="glucose-val">{r.glucose_value}</span>
                        <span className="glucose-unit">mg/dL</span>
                      </td>
                      <td>
                        <span className={`status-badge ${status.className}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="cell-muted">{createdTime}</td>
                      <td className="text-right">
                        <div className="row-action-btns">
                          <button
                            type="button"
                            className="btn btn-outline btn-xs"
                            onClick={() => setEditingReading(r)}
                            title="Edit this reading"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline btn-xs text-danger"
                            onClick={() => setDeletingReading(r)}
                            title="Delete this reading"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          {pagination.totalPages > 1 && (
            <div className="pagination-bar">
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fetchReadings(pagination.page - 1)}
                disabled={pagination.page <= 1 || loading}
              >
                ← Previous
              </button>
              <div className="page-indicator">
                Page {pagination.page} of {pagination.totalPages}
              </div>
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={() => fetchReadings(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages || loading}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Reading Modal */}
      <ReadingModal
        isOpen={isAddOpen || Boolean(editingReading)}
        initialData={editingReading}
        onClose={() => {
          setIsAddOpen(false);
          setEditingReading(null);
        }}
        onSaved={handleSaved}
      />

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={Boolean(deletingReading)}
        reading={deletingReading}
        onClose={() => setDeletingReading(null)}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
