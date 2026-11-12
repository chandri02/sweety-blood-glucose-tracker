import React, { useState } from 'react';

export default function DailyBreakdownTable({ dailyBreakdown, periodTitle }) {
  const [expandedDate, setExpandedDate] = useState(null);

  if (!dailyBreakdown || dailyBreakdown.length === 0) {
    return null;
  }

  function toggleExpand(date) {
    setExpandedDate((prev) => (prev === date ? null : date));
  }

  return (
    <div className="daily-breakdown-section">
      <div className="section-header">
        <h3 className="section-title">
          📅 Daily Breakdown ({dailyBreakdown.length} active {dailyBreakdown.length === 1 ? 'day' : 'days'})
        </h3>
        {periodTitle && <span className="period-subtitle">{periodTitle}</span>}
      </div>

      <div className="table-responsive">
        <table className="breakdown-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Readings</th>
              <th>Lowest</th>
              <th>Highest</th>
              <th>Average</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {dailyBreakdown.map((day) => {
              const isExpanded = expandedDate === day.date;
              return (
                <React.Fragment key={day.date}>
                  <tr
                    className={`breakdown-row ${isExpanded ? 'expanded' : ''}`}
                    onClick={() => toggleExpand(day.date)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={isExpanded}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggleExpand(day.date);
                      }
                    }}
                  >
                    <td className="cell-date">
                      <strong>{day.date}</strong>
                    </td>
                    <td>
                      <span className="reading-count-badge">
                        {day.totalReadings} / 4
                      </span>
                    </td>
                    <td className="cell-lowest">{day.lowest} mg/dL</td>
                    <td className="cell-highest">{day.highest} mg/dL</td>
                    <td className="cell-avg">
                      <strong>{day.average.toFixed(1)}</strong> mg/dL
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-outline btn-xs"
                        aria-label={`Toggle details for ${day.date}`}
                      >
                        {isExpanded ? '▲ Hide' : '▼ View'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="breakdown-detail-row">
                      <td colSpan="6">
                        <div className="expanded-readings-list">
                          <span className="detail-heading">Readings for {day.date}:</span>
                          <div className="detail-chips-row">
                            {day.readings.map((r) => (
                              <div key={r.id} className="reading-chip">
                                <span className="chip-slot">{r.time_slot}:</span>
                                <span className="chip-value">
                                  <strong>{r.glucose_value}</strong> mg/dL
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
