import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CLINICAL_THRESHOLDS,
  CLINICAL_COLORS,
  TIME_SLOTS,
  getGlucoseStatus,
} from '../src/utils/clinical.js';

test('Clinical Constants & Thresholds', async (t) => {
  await t.test('Clinical target range is strictly 70 to 140 mg/dL', () => {
    assert.equal(CLINICAL_THRESHOLDS.LOW, 70);
    assert.equal(CLINICAL_THRESHOLDS.TARGET_MIN, 70);
    assert.equal(CLINICAL_THRESHOLDS.TARGET_MAX, 140);
    assert.equal(CLINICAL_THRESHOLDS.ELEVATED_MAX, 180);
  });

  await t.test('All 4 standard clinical daily time slots are configured in chronological order', () => {
    assert.deepEqual(TIME_SLOTS, [
      'Morning fasting',
      'After breakfast',
      'After lunch',
      'After dinner',
    ]);
  });
});

test('getGlucoseStatus Categorization', async (t) => {
  await t.test('Categorizes glucose < 70 as Low / Hypoglycemia', () => {
    const s55 = getGlucoseStatus(55);
    assert.equal(s55.label, 'Low');
    assert.equal(s55.className, 'badge-low');
    assert.equal(s55.color, CLINICAL_COLORS.LOW);

    const s69 = getGlucoseStatus(69);
    assert.equal(s69.label, 'Low');
  });

  await t.test('Categorizes glucose between 70 and 140 as Normal / In Target', () => {
    const s70 = getGlucoseStatus(70);
    assert.equal(s70.label, 'Normal');
    assert.equal(s70.className, 'badge-normal');
    assert.equal(s70.color, CLINICAL_COLORS.NORMAL);

    const s105 = getGlucoseStatus(105);
    assert.equal(s105.label, 'Normal');

    const s140 = getGlucoseStatus(140);
    assert.equal(s140.label, 'Normal');
  });

  await t.test('Categorizes glucose between 141 and 180 as Elevated', () => {
    const s141 = getGlucoseStatus(141);
    assert.equal(s141.label, 'Elevated');
    assert.equal(s141.className, 'badge-elevated');
    assert.equal(s141.color, CLINICAL_COLORS.ELEVATED);

    const s180 = getGlucoseStatus(180);
    assert.equal(s180.label, 'Elevated');
  });

  await t.test('Categorizes glucose > 180 as High', () => {
    const s181 = getGlucoseStatus(181);
    assert.equal(s181.label, 'High');
    assert.equal(s181.className, 'badge-high');
    assert.equal(s181.color, CLINICAL_COLORS.HIGH);

    const s250 = getGlucoseStatus(250);
    assert.equal(s250.label, 'High');
  });

  await t.test('Handles null, undefined, or invalid inputs safely without crashing', () => {
    const sNull = getGlucoseStatus(null);
    assert.equal(sNull.label, 'No Data');

    const sUndef = getGlucoseStatus(undefined);
    assert.equal(sUndef.label, 'No Data');

    const sNaN = getGlucoseStatus('not-a-number');
    assert.equal(sNaN.label, 'No Data');
  });
});

test('Slot Comparison Transformation & Missing Slot Handling', async (t) => {
  await t.test('Never plots missing slots as 0 mg/dL', () => {
    const mockReportData = {
      slotAnalysis: {
        slots: {
          'Morning fasting': { count: 3, average: 95.0, lowest: 90, highest: 100 },
          'After breakfast': { count: 0, average: null, lowest: null, highest: null },
          'After lunch': { count: 2, average: 135.5, lowest: 125, highest: 146 },
          'After dinner': { count: 0, average: null, lowest: null, highest: null },
        },
        highestAverageSlot: 'After lunch',
      },
    };

    const slotsMap = mockReportData.slotAnalysis.slots;
    const chartData = TIME_SLOTS.map((slotName) => {
      const s = slotsMap[slotName];
      const hasData = s && s.count > 0 && s.average !== null;
      return {
        slot: slotName,
        count: s?.count || 0,
        average: hasData ? s.average : null,
        isHighestAvg: slotName === mockReportData.slotAnalysis.highestAverageSlot,
      };
    });

    // Check that missing slots have null average (NOT 0)
    assert.equal(chartData[1].average, null);
    assert.equal(chartData[3].average, null);

    // Check that peak slot is accurately identified
    assert.equal(chartData[2].isHighestAvg, true);
    assert.equal(chartData[0].isHighestAvg, false);
  });
});
