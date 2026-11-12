const { query } = require('../config/db');

const ALL_TIME_SLOTS = [
  'Morning fasting',
  'After breakfast',
  'After lunch',
  'After dinner',
];

function computeSlotAnalysis(readings) {
  const slotData = {};
  for (const slot of ALL_TIME_SLOTS) {
    slotData[slot] = {
      slot,
      count: 0,
      lowest: null,
      highest: null,
      average: null,
    };
  }

  const slotValues = {};
  for (const r of readings) {
    if (ALL_TIME_SLOTS.includes(r.time_slot)) {
      if (!slotValues[r.time_slot]) {
        slotValues[r.time_slot] = [];
      }
      slotValues[r.time_slot].push(r.glucose_value);
    }
  }

  let highestAvg = -1;
  let highestAverageSlot = null;

  for (const slot of ALL_TIME_SLOTS) {
    const vals = slotValues[slot];
    if (vals && vals.length > 0) {
      const min = Math.min(...vals);
      const max = Math.max(...vals);
      const sum = vals.reduce((a, b) => a + b, 0);
      const avg = parseFloat((sum / vals.length).toFixed(1));
      slotData[slot] = {
        slot,
        count: vals.length,
        lowest: min,
        highest: max,
        average: avg,
      };
      if (avg > highestAvg) {
        highestAvg = avg;
        highestAverageSlot = slot;
      }
    }
  }

  return {
    slots: slotData,
    highestAverageSlot,
  };
}

async function getDailyReportData({ userId, date }) {
  const summarySql = `
    SELECT 
      COUNT(*)::int AS total_readings,
      MIN(glucose_value) AS lowest,
      MAX(glucose_value) AS highest,
      ROUND(AVG(glucose_value)::numeric, 1)::float AS average
    FROM readings
    WHERE user_id = $1 AND reading_date = $2;
  `;

  const readingsSql = `
    SELECT 
      id, 
      to_char(reading_date, 'YYYY-MM-DD') AS reading_date, 
      time_slot, 
      glucose_value, 
      created_at, 
      updated_at
    FROM readings
    WHERE user_id = $1 AND reading_date = $2
    ORDER BY 
      CASE time_slot
        WHEN 'Morning fasting' THEN 1
        WHEN 'After breakfast' THEN 2
        WHEN 'After lunch' THEN 3
        WHEN 'After dinner' THEN 4
        ELSE 5
      END ASC;
  `;

  const [summaryRes, readingsRes] = await Promise.all([
    query(summarySql, [userId, date]),
    query(readingsSql, [userId, date]),
  ]);

  const summary = summaryRes.rows[0];
  const readings = readingsRes.rows;

  return {
    date,
    totalReadings: summary.total_readings || 0,
    lowest: summary.lowest !== null ? summary.lowest : null,
    highest: summary.highest !== null ? summary.highest : null,
    average: summary.average !== null ? summary.average : null,
    slotAnalysis: computeSlotAnalysis(readings),
    readings,
  };
}

async function getRangeReportData({ userId, startDate, endDate }) {
  const summarySql = `
    SELECT 
      COUNT(*)::int AS total_readings,
      MIN(glucose_value) AS lowest,
      MAX(glucose_value) AS highest,
      ROUND(AVG(glucose_value)::numeric, 1)::float AS average
    FROM readings
    WHERE user_id = $1 AND reading_date >= $2 AND reading_date <= $3;
  `;

  const readingsSql = `
    SELECT 
      id, 
      to_char(reading_date, 'YYYY-MM-DD') AS reading_date, 
      time_slot, 
      glucose_value, 
      created_at, 
      updated_at
    FROM readings
    WHERE user_id = $1 AND reading_date >= $2 AND reading_date <= $3
    ORDER BY 
      reading_date ASC,
      CASE time_slot
        WHEN 'Morning fasting' THEN 1
        WHEN 'After breakfast' THEN 2
        WHEN 'After lunch' THEN 3
        WHEN 'After dinner' THEN 4
        ELSE 5
      END ASC;
  `;

  const [summaryRes, readingsRes] = await Promise.all([
    query(summarySql, [userId, startDate, endDate]),
    query(readingsSql, [userId, startDate, endDate]),
  ]);

  const summary = summaryRes.rows[0];
  const readings = readingsRes.rows;

  // Group readings by date to construct dailyBreakdown
  const breakdownMap = new Map();
  for (const r of readings) {
    if (!breakdownMap.has(r.reading_date)) {
      breakdownMap.set(r.reading_date, {
        date: r.reading_date,
        readings: [],
      });
    }
    breakdownMap.get(r.reading_date).readings.push(r);
  }

  const dailyBreakdown = Array.from(breakdownMap.values()).map((dayGroup) => {
    const values = dayGroup.readings.map((r) => r.glucose_value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const sum = values.reduce((acc, v) => acc + v, 0);
    const avg = parseFloat((sum / values.length).toFixed(1));

    return {
      date: dayGroup.date,
      totalReadings: dayGroup.readings.length,
      lowest: min,
      highest: max,
      average: avg,
      readings: dayGroup.readings,
    };
  });

  return {
    startDate,
    endDate,
    totalReadings: summary.total_readings || 0,
    lowest: summary.lowest !== null ? summary.lowest : null,
    highest: summary.highest !== null ? summary.highest : null,
    average: summary.average !== null ? summary.average : null,
    slotAnalysis: computeSlotAnalysis(readings),
    dailyBreakdown,
  };
}

module.exports = {
  getDailyReportData,
  getRangeReportData,
};
