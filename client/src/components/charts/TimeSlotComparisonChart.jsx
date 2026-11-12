import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { TIME_SLOTS, CLINICAL_THRESHOLDS, getGlucoseStatus } from '../../utils/clinical';

export default function TimeSlotComparisonChart({
  reportData,
  showTargetZones = true,
}) {
  const slotAnalysis = reportData?.slotAnalysis;
  const slotsMap = slotAnalysis?.slots || {};
  const highestAverageSlot = slotAnalysis?.highestAverageSlot;

  // Build ordered data for the 4 time slots
  const chartData = TIME_SLOTS.map((slotName) => {
    const s = slotsMap[slotName] || { count: 0, lowest: null, highest: null, average: null };
    const hasData = s.count > 0 && s.average !== null;
    const isHighest = hasData && slotName === highestAverageSlot;

    return {
      slot: slotName,
      // Short label for cleaner display on small screens
      shortSlot:
        slotName === 'Morning fasting'
          ? 'Fasting'
          : slotName === 'After breakfast'
          ? 'Breakfast'
          : slotName === 'After lunch'
          ? 'Lunch'
          : 'Dinner',
      count: s.count,
      average: hasData ? s.average : null,
      lowest: s.lowest,
      highest: s.highest,
      isHighestAvg: isHighest,
      status: hasData ? getGlucoseStatus(s.average) : null,
    };
  });

  const totalReadingsInSlots = chartData.reduce((acc, s) => acc + s.count, 0);

  if (totalReadingsInSlots === 0) {
    return (
      <div className="chart-empty-placeholder">
        <span className="placeholder-icon" aria-hidden="true">📊</span>
        <h4>No slot comparison data</h4>
        <p>Record readings across your daily routine to compare Morning, Breakfast, Lunch, and Dinner patterns.</p>
      </div>
    );
  }

  // Calculate Y-axis domain
  const validAvgs = chartData.filter((d) => d.average !== null).map((d) => d.average);
  const maxAvg = validAvgs.length ? Math.max(...validAvgs) : 180;
  const yMax = Math.min(600, Math.ceil(Math.max(180, maxAvg + 30) / 20) * 20);

  return (
    <div className="slot-comparison-chart-wrapper">
      <div className="chart-header-row">
        <div>
          <h3 className="chart-card-title">Time-Slot Glucose Comparison</h3>
          <p className="chart-card-subtitle">
            Average glucose and reading distribution across 4 clinical daily slots
          </p>
        </div>
        {highestAverageSlot && (
          <div className="peak-slot-badge">
            <span className="peak-badge-icon" aria-hidden="true">⚡</span>
            <span>
              Peak Slot: <strong>{highestAverageSlot}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="chart-canvas-container" style={{ width: '100%', height: 340 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 25, right: 25, left: 10, bottom: 25 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />

            <XAxis
              dataKey="shortSlot"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              dy={10}
            />

            <YAxis
              domain={[0, yMax]}
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              dx={-5}
              unit=" mg/dL"
            />

            <Tooltip
              content={<ChartTooltip mode="slot-comparison" />}
            />

            {showTargetZones && (
              <>
                <ReferenceLine
                  y={CLINICAL_THRESHOLDS.TARGET_MAX}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: 'Target Max (140)',
                    position: 'insideTopRight',
                    fill: '#d97706',
                    fontSize: 11,
                    fontWeight: 600,
                  }}
                />
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
              </>
            )}

            <Bar
              dataKey="average"
              name="Average Glucose"
              radius={[6, 6, 0, 0]}
              maxBarSize={60}
            >
              {chartData.map((entry, index) => {
                let fillColor = '#0284c7'; // standard blue
                if (entry.average === null) {
                  fillColor = 'transparent';
                } else if (entry.isHighestAvg) {
                  fillColor = '#ea580c'; // peak orange-red
                } else if (entry.status?.color) {
                  fillColor = entry.status.color;
                }
                return <Cell key={`cell-${index}`} fill={fillColor} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Slot Summary Cards */}
      <div className="slot-cards-summary-row">
        {chartData.map((slot) => (
          <div
            key={slot.slot}
            className={`slot-card-chip ${slot.isHighestAvg ? 'chip-highlight' : ''}`}
          >
            <div className="chip-slot-name">{slot.shortSlot}</div>
            <div className="chip-avg">
              {slot.average !== null ? `${slot.average} mg/dL` : 'No readings'}
            </div>
            <div className="chip-count">
              {slot.count > 0 ? `${slot.count} recorded` : '0 readings'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
