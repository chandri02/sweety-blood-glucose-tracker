export const CLINICAL_THRESHOLDS = {
  LOW: 70,
  TARGET_MIN: 70,
  TARGET_MAX: 140,
  ELEVATED_MAX: 180,
};

export const CLINICAL_COLORS = {
  LOW: '#ef4444',
  NORMAL: '#16a34a',
  ELEVATED: '#f59e0b',
  HIGH: '#dc2626',
  TARGET_BAND: '#22c55e',
  PRIMARY: '#0284c7',
  SECONDARY: '#6366f1',
};

export const TIME_SLOTS = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner',
];

export function getGlucoseStatus(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return {
      label: 'No Data',
      className: 'badge-muted',
      color: '#94a3b8',
      description: 'No reading recorded',
    };
  }
  const v = Number(value);
  if (v < CLINICAL_THRESHOLDS.LOW) {
    return {
      label: 'Low',
      category: 'hypo',
      className: 'badge-low',
      color: CLINICAL_COLORS.LOW,
      description: 'Below target (< 70 mg/dL)',
    };
  }
  if (v <= CLINICAL_THRESHOLDS.TARGET_MAX) {
    return {
      label: 'Normal',
      category: 'normal',
      className: 'badge-normal',
      color: CLINICAL_COLORS.NORMAL,
      description: 'In target range (70–140 mg/dL)',
    };
  }
  if (v <= CLINICAL_THRESHOLDS.ELEVATED_MAX) {
    return {
      label: 'Elevated',
      category: 'elevated',
      className: 'badge-elevated',
      color: CLINICAL_COLORS.ELEVATED,
      description: 'Elevated (141–180 mg/dL)',
    };
  }
  return {
    label: 'High',
    category: 'high',
    className: 'badge-high',
    color: CLINICAL_COLORS.HIGH,
    description: 'High (> 180 mg/dL)',
  };
}
