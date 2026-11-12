import React from 'react';
import { getGlucoseStatus } from '../../utils/clinical';

export default function ChartTooltip({ active, payload, label, mode = 'trend' }) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  // Bar Chart / Slot Comparison Tooltip
  if (mode === 'slot-comparison') {
    const data = payload[0]?.payload;
    if (!data) return null;
    const status = data.average !== null ? getGlucoseStatus(data.average) : null;

    return (
      <div className="chart-custom-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-title">{data.slot}</span>
          {data.isHighestAvg && <span className="tooltip-peak-tag">Peak Slot</span>}
        </div>
        <div className="tooltip-body">
          {data.count > 0 ? (
            <>
              <div className="tooltip-metric-row">
                <span className="metric-label">Average Glucose:</span>
                <span className="metric-val">{data.average} mg/dL</span>
              </div>
              {status && (
                <div className="tooltip-status-row">
                  <span className={`status-badge ${status.className}`}>{status.label}</span>
                  <span className="status-desc">{status.description}</span>
                </div>
              )}
              <div className="tooltip-metric-row sub-row">
                <span className="metric-label">Readings Count:</span>
                <span className="metric-val">{data.count}</span>
              </div>
              <div className="tooltip-metric-row sub-row">
                <span className="metric-label">Observed Range:</span>
                <span className="metric-val">{data.lowest} – {data.highest} mg/dL</span>
              </div>
            </>
          ) : (
            <div className="tooltip-empty">No readings recorded for this slot</div>
          )}
        </div>
      </div>
    );
  }

  // Daily Trend Tooltip (single day, slots on X-axis)
  if (mode === 'daily-trend') {
    const data = payload[0]?.payload;
    if (!data) return null;
    const val = data.glucose_value;
    const status = getGlucoseStatus(val);

    return (
      <div className="chart-custom-tooltip">
        <div className="tooltip-header">
          <span className="tooltip-title">{data.time_slot}</span>
          <span className="tooltip-date">{data.reading_date}</span>
        </div>
        <div className="tooltip-body">
          <div className="tooltip-metric-row">
            <span className="metric-label">Glucose Value:</span>
            <span className="metric-val prominent">{val} mg/dL</span>
          </div>
          <div className="tooltip-status-row">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <span className="status-desc">{status.description}</span>
          </div>
        </div>
      </div>
    );
  }

  // Multi-day Range Trend Tooltip (dates on X-axis)
  const data = payload[0]?.payload;
  if (!data) return null;
  const avg = data.average;
  const status = avg !== null ? getGlucoseStatus(avg) : null;

  return (
    <div className="chart-custom-tooltip">
      <div className="tooltip-header">
        <span className="tooltip-title">{data.date || label}</span>
        <span className="tooltip-count">{data.totalReadings} {data.totalReadings === 1 ? 'reading' : 'readings'}</span>
      </div>
      <div className="tooltip-body">
        <div className="tooltip-metric-row">
          <span className="metric-label">Daily Average:</span>
          <span className="metric-val prominent">{avg !== null ? `${avg} mg/dL` : '—'}</span>
        </div>
        {status && (
          <div className="tooltip-status-row">
            <span className={`status-badge ${status.className}`}>{status.label}</span>
            <span className="status-desc">{status.description}</span>
          </div>
        )}
        {data.lowest !== null && data.highest !== null && (
          <div className="tooltip-metric-row sub-row">
            <span className="metric-label">Daily Spread:</span>
            <span className="metric-val">{data.lowest} – {data.highest} mg/dL</span>
          </div>
        )}
      </div>
    </div>
  );
}
