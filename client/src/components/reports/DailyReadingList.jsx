import React from 'react';

const SLOT_ICONS = {
  'Morning fasting': '🌅',
  'After breakfast': '🍳',
  'After lunch': '🥗',
  'After dinner': '🍲',
};

function getSlotBadgeClass(slot) {
  switch (slot) {
    case 'Morning fasting':
      return 'slot-fasting';
    case 'After breakfast':
      return 'slot-breakfast';
    case 'After lunch':
      return 'slot-lunch';
    case 'After dinner':
      return 'slot-dinner';
    default:
      return '';
  }
}

function getValueBadgeClass(val) {
  if (val < 70) return 'val-low';
  if (val <= 140) return 'val-normal';
  if (val <= 180) return 'val-elevated';
  return 'val-high';
}

export default function DailyReadingList({ readings, date }) {
  if (!readings || readings.length === 0) {
    return null;
  }

  return (
    <div className="daily-readings-section">
      <div className="section-header">
        <h3 className="section-title">
          📋 Readings for {date} ({readings.length} of 4 slots)
        </h3>
      </div>

      <div className="readings-grid">
        {readings.map((reading) => {
          const icon = SLOT_ICONS[reading.time_slot] || '🩸';
          const slotClass = getSlotBadgeClass(reading.time_slot);
          const valClass = getValueBadgeClass(reading.glucose_value);

          return (
            <div key={reading.id} className={`reading-item-card ${valClass}`}>
              <div className="reading-card-top">
                <span className={`slot-tag ${slotClass}`}>
                  <span className="slot-icon" aria-hidden="true">{icon}</span>
                  {reading.time_slot}
                </span>
                <span className="reading-value-pill">
                  <strong>{reading.glucose_value}</strong> mg/dL
                </span>
              </div>
              <div className="reading-meta">
                <span>Recorded: {new Date(reading.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
