import React from 'react';
import { getGlucoseStatus } from '../../utils/clinical';

export default function RecentReadings({
  readings = [],
  loading = false,
  onOpenAddModal,
  onNavigateToReadings,
}) {
  return (
    <section className="recent-readings-card">
      <div className="card-header-bar">
        <div className="header-info">
          <h3 className="section-title">
            <span aria-hidden="true">⏱️</span> Recent Glucose Logs
          </h3>
          <p className="section-desc">Latest entries recorded in your personal glucose log</p>
        </div>
        <div className="header-actions">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={onNavigateToReadings}
            title="Open Glucose Readings page"
          >
            View All Readings →
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAddModal}
            title="Log a new blood glucose reading"
          >
            + Log Reading
          </button>
        </div>
      </div>

      {loading ? (
        <div className="recent-loading-placeholder">
          <div className="spinner spinner-sm"></div>
          <span>Loading recent entries...</span>
        </div>
      ) : readings.length === 0 ? (
        <div className="recent-empty-state">
          <p>No glucose readings logged yet.</p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={onOpenAddModal}
          >
            Log Your First Reading
          </button>
        </div>
      ) : (
        <div className="recent-table-wrap">
          <table className="recent-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Clinical Slot</th>
                <th>Glucose Value</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {readings.slice(0, 5).map((r) => {
                const status = getGlucoseStatus(r.glucose_value);
                return (
                  <tr key={r.id}>
                    <td className="cell-date">{r.reading_date}</td>
                    <td className="cell-slot">{r.time_slot}</td>
                    <td className="cell-glucose">
                      <span className="glucose-val">{r.glucose_value}</span>
                      <span className="glucose-unit">mg/dL</span>
                    </td>
                    <td>
                      <span className={`status-badge ${status.className}`}>
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
