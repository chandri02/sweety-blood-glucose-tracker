import React, { useState } from 'react';
import GlucoseTrendChart from './GlucoseTrendChart';
import TimeSlotComparisonChart from './TimeSlotComparisonChart';

export default function DashboardChartSection({
  reportType,
  reportData,
  loading = false,
}) {
  const [chartView, setChartView] = useState('trend'); // 'trend' | 'slots'
  const [showTargetZones, setShowTargetZones] = useState(true);

  const hasData = reportData && reportData.totalReadings > 0;

  return (
    <section className="dashboard-chart-section-card">
      <div className="chart-toolbar">
        {/* View Switcher: Trend vs Slot Comparison */}
        <div className="view-mode-tabs" role="tablist" aria-label="Chart visualization type">
          <button
            type="button"
            role="tab"
            aria-selected={chartView === 'trend'}
            className={`tab-btn ${chartView === 'trend' ? 'tab-btn-active' : ''}`}
            onClick={() => setChartView('trend')}
          >
            <span aria-hidden="true">📈</span> Glucose Trend
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={chartView === 'slots'}
            className={`tab-btn ${chartView === 'slots' ? 'tab-btn-active' : ''}`}
            onClick={() => setChartView('slots')}
          >
            <span aria-hidden="true">📊</span> Time-Slot Comparison
          </button>
        </div>

        {/* Target Zone Toggle */}
        <div className="chart-controls-toolbar">
          <label className="toggle-label" title="Toggle clinical target zone reference bands">
            <input
              type="checkbox"
              className="toggle-checkbox"
              checked={showTargetZones}
              onChange={(e) => setShowTargetZones(e.target.checked)}
            />
            <span className="toggle-text">Show Target Zones</span>
          </label>
        </div>
      </div>

      {/* Body: Loading / Empty / Chart */}
      {loading ? (
        <div className="chart-loading-state">
          <div className="spinner"></div>
          <p>Rendering visualization data...</p>
        </div>
      ) : !hasData ? (
        <div className="chart-empty-placeholder">
          <span className="placeholder-icon" aria-hidden="true">🩸</span>
          <h4>No glucose readings for this period</h4>
          <p>Select another date range or log new readings to see your trends.</p>
        </div>
      ) : (
        <div className="chart-content-area">
          {chartView === 'trend' ? (
            <GlucoseTrendChart
              reportType={reportType}
              reportData={reportData}
              showTargetZones={showTargetZones}
            />
          ) : (
            <TimeSlotComparisonChart
              reportData={reportData}
              showTargetZones={showTargetZones}
            />
          )}
        </div>
      )}
    </section>
  );
}
