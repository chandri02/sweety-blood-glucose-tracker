import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ReferenceLine,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { CLINICAL_THRESHOLDS, getGlucoseStatus } from '../../utils/clinical';

// Custom dot component for daily reading points
function DailyTrendDot(props) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload) return null;
  const status = getGlucoseStatus(payload.glucose_value);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={6}
      fill={status.color}
      stroke="#ffffff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.25))' }}
    />
  );
}

// Custom dot component for range average points
function RangeTrendDot(props) {
  const { cx, cy, payload } = props;
  if (!cx || !cy || !payload || payload.average === null) return null;
  const status = getGlucoseStatus(payload.average);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={status.color}
      stroke="#ffffff"
      strokeWidth={2}
      style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.2))' }}
    />
  );
}

export default function GlucoseTrendChart({
  reportType,
  reportData,
  showTargetZones = true,
}) {
  const isDaily = reportType === 'daily';

  // Prepare chart dataset
  let chartData = [];
  if (isDaily) {
    // Only plot recorded readings, maintaining chronological order
    chartData = (reportData?.readings || []).map((r) => ({
      ...r,
      time_slot: r.time_slot,
      glucose_value: Number(r.glucose_value),
    }));
  } else {
    // Range view: use dailyBreakdown (only days with recorded readings)
    // Never plots missing days as 0 mg/dL
    chartData = (reportData?.dailyBreakdown || []).map((d) => ({
      date: d.date,
      totalReadings: d.totalReadings,
      average: d.average !== null ? Number(d.average) : null,
      lowest: d.lowest !== null ? Number(d.lowest) : null,
      highest: d.highest !== null ? Number(d.highest) : null,
      // For fluctuation area band: spread between lowest and highest
      spread: d.highest !== null && d.lowest !== null ? [d.lowest, d.highest] : null,
    }));
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="chart-empty-placeholder">
        <span className="placeholder-icon" aria-hidden="true">📈</span>
        <h4>No trend data available</h4>
        <p>Record blood glucose readings for this period to visualize your clinical trend line.</p>
      </div>
    );
  }

  // Calculate dynamic Y-axis domain with padding to keep lines visible
  const allValues = isDaily
    ? chartData.map((d) => d.glucose_value)
    : chartData.flatMap((d) => [d.lowest, d.highest, d.average]).filter((v) => v !== null && !isNaN(v));

  const minVal = Math.min(60, ...allValues);
  const maxVal = Math.max(200, ...allValues);
  const yMin = Math.max(30, Math.floor((minVal - 15) / 10) * 10);
  const yMax = Math.min(600, Math.ceil((maxVal + 20) / 10) * 10);

  return (
    <div className="glucose-trend-chart-wrapper">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-card-title">
            {isDaily ? 'Intraday Glucose Trend' : 'Daily Average Glucose Trend'}
          </h3>
          <p className="chart-card-subtitle">
            {isDaily
              ? 'Chronological readings across clinical time slots for the selected day'
              : 'Daily average progression with min-to-max daily fluctuation spread'}
          </p>
        </div>
        <div className="chart-legend-pills">
          <span className="legend-item">
            <span className="legend-indicator dot-normal"></span> In Target (70–140)
          </span>
          <span className="legend-item">
            <span className="legend-indicator dot-elevated"></span> Elevated (141–180)
          </span>
          <span className="legend-item">
            <span className="legend-indicator dot-high"></span> High (&gt;180)
          </span>
          <span className="legend-item">
            <span className="legend-indicator dot-low"></span> Low (&lt;70)
          </span>
        </div>
      </div>

      <div className="chart-canvas-container" style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey={isDaily ? 'time_slot' : 'date'}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              dy={10}
              interval={0}
              tickFormatter={(val) => {
                if (isDaily) {
                  // Shorten slot names on mobile
                  if (val === 'Morning fasting') return 'Fasting';
                  if (val === 'After breakfast') return 'Breakfast';
                  if (val === 'After lunch') return 'Lunch';
                  if (val === 'After dinner') return 'Dinner';
                  return val;
                }
                // Shorten date YYYY-MM-DD -> MM/DD
                if (typeof val === 'string' && val.length === 10) {
                  return val.substring(5);
                }
                return val;
              }}
            />

            <YAxis
              domain={[yMin, yMax]}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              dx={-5}
              unit=" mg/dL"
            />

            <Tooltip
              content={
                <ChartTooltip
                  mode={isDaily ? 'daily-trend' : 'range-trend'}
                />
              }
            />

            {/* Target Zones Overlay */}
            {showTargetZones && (
              <>
                {/* Green Target Zone Band: 70 - 140 mg/dL */}
                <ReferenceArea
                  y1={CLINICAL_THRESHOLDS.TARGET_MIN}
                  y2={CLINICAL_THRESHOLDS.TARGET_MAX}
                  fill="#22c55e"
                  fillOpacity={0.12}
                  stroke="#22c55e"
                  strokeOpacity={0.25}
                  strokeDasharray="3 3"
                />

                {/* Amber Elevated Reference Line (140 mg/dL) */}
                <ReferenceLine
                  y={CLINICAL_THRESHOLDS.TARGET_MAX}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Elevated (140)',
                    position: 'insideTopRight',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Red High Reference Line (180 mg/dL) */}
                <ReferenceLine
                  y={CLINICAL_THRESHOLDS.ELEVATED_MAX}
                  stroke="#dc2626"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'High (180)',
                    position: 'insideTopRight',
                    fill: '#dc2626',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />

                {/* Red/Amber Low Hypoglycemia Reference Line (70 mg/dL) */}
                <ReferenceLine
                  y={CLINICAL_THRESHOLDS.LOW}
                  stroke="#ef4444"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Low (70)',
                    position: 'insideBottomRight',
                    fill: '#ef4444',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
              </>
            )}

            {/* Multi-Day Range: Daily spread Area */}
            {!isDaily && (
              <Area
                type="monotone"
                dataKey="spread"
                stroke="none"
                fill="#0284c7"
                fillOpacity={0.15}
                name="Fluctuation Spread"
                connectNulls={false}
              />
            )}

            {/* Main Trend Line */}
            {isDaily ? (
              <Line
                type="monotone"
                dataKey="glucose_value"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={<DailyTrendDot />}
                activeDot={{ r: 8, stroke: '#0284c7', strokeWidth: 2 }}
                name="Blood Glucose"
              />
            ) : (
              <Line
                type="monotone"
                dataKey="average"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={<RangeTrendDot />}
                activeDot={{ r: 7, stroke: '#0284c7', strokeWidth: 2 }}
                name="Daily Average"
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="chart-footer-note">
        <span className="info-icon" aria-hidden="true">ℹ️</span>
        <span>
          Clinical target zones (70–140 mg/dL) are standard reference thresholds based on general clinical practice and are not individualized medical advice.
        </span>
      </div>
    </div>
  );
}
