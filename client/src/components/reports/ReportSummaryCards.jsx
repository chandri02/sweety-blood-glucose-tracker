import React from 'react';

function getGlucoseBadge(val) {
  if (val === null || val === undefined) return null;
  if (val < 70) return { label: 'Low', className: 'badge-low' };
  if (val <= 140) return { label: 'Normal', className: 'badge-normal' };
  if (val <= 180) return { label: 'Elevated', className: 'badge-elevated' };
  return { label: 'High', className: 'badge-high' };
}

export default function ReportSummaryCards({ reportData }) {
  if (!reportData) return null;

  const { totalReadings = 0, highest = null, lowest = null, average = null } = reportData;

  const highestBadge = getGlucoseBadge(highest);
  const lowestBadge = getGlucoseBadge(lowest);
  const avgBadge = getGlucoseBadge(average);

  return (
    <div className="summary-cards-grid">
      {/* 1. Total Readings */}
      <div className="summary-card card-total">
        <div className="card-header">
          <span className="card-icon" aria-hidden="true">📊</span>
          <span className="card-label">Total Readings</span>
        </div>
        <div className="card-value">{totalReadings}</div>
        <div className="card-footer">
          {totalReadings === 1 ? '1 reading recorded' : `${totalReadings} readings recorded`}
        </div>
      </div>

      {/* 2. Highest Glucose */}
      <div className="summary-card card-highest">
        <div className="card-header">
          <span className="card-icon" aria-hidden="true">⬆️</span>
          <span className="card-label">Highest Glucose</span>
        </div>
        <div className="card-value">
          {highest !== null ? `${highest} mg/dL` : '—'}
        </div>
        <div className="card-footer">
          {highestBadge && (
            <span className={`status-badge ${highestBadge.className}`}>
              {highestBadge.label}
            </span>
          )}
          {!highestBadge && 'No data'}
        </div>
      </div>

      {/* 3. Lowest Glucose */}
      <div className="summary-card card-lowest">
        <div className="card-header">
          <span className="card-icon" aria-hidden="true">⬇️</span>
          <span className="card-label">Lowest Glucose</span>
        </div>
        <div className="card-value">
          {lowest !== null ? `${lowest} mg/dL` : '—'}
        </div>
        <div className="card-footer">
          {lowestBadge && (
            <span className={`status-badge ${lowestBadge.className}`}>
              {lowestBadge.label}
            </span>
          )}
          {!lowestBadge && 'No data'}
        </div>
      </div>

      {/* 4. Average Glucose */}
      <div className="summary-card card-average">
        <div className="card-header">
          <span className="card-icon" aria-hidden="true">🎯</span>
          <span className="card-label">Average Glucose</span>
        </div>
        <div className="card-value">
          {average !== null ? `${Number(average).toFixed(1)} mg/dL` : '—'}
        </div>
        <div className="card-footer">
          {avgBadge && (
            <span className={`status-badge ${avgBadge.className}`}>
              {avgBadge.label}
            </span>
          )}
          {!avgBadge && 'No data'}
        </div>
      </div>
    </div>
  );
}
