const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, closePool } = require('../src/config/db');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../src/constants/auth.constants');

describe('Reports Module Integration Tests (Daily, MTD, Monthly, Custom)', () => {
  const user1 = {
    name: 'Report User One',
    email: 'report_user1@sweetytest.local',
    password: 'Password123!',
  };

  const user2 = {
    name: 'Report User Two',
    email: 'report_user2@sweetytest.local',
    password: 'Password123!',
  };

  let sessionCookie1;
  let userId1;
  let sessionCookie2;
  let userId2;

  before(async () => {
    // Clean up test users from any previous runs
    await query('DELETE FROM users WHERE email IN ($1, $2);', [user1.email, user2.email]);

    // Setup User 1
    const csrfRes1 = await request(app).get('/api/auth/csrf-token');
    const csrfToken1 = csrfRes1.body.csrfToken;
    const csrfCookie1 = csrfRes1.headers['set-cookie']
      .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
      .split(';')[0];

    const regRes1 = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send(user1);

    userId1 = regRes1.body.user.id;
    sessionCookie1 = regRes1.headers['set-cookie']
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      .split(';')[0];

    // Setup User 2
    const csrfRes2 = await request(app).get('/api/auth/csrf-token');
    const csrfToken2 = csrfRes2.body.csrfToken;
    const csrfCookie2 = csrfRes2.headers['set-cookie']
      .find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))
      .split(';')[0];

    const regRes2 = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie2])
      .set('X-CSRF-Token', csrfToken2)
      .send(user2);

    userId2 = regRes2.body.user.id;
    sessionCookie2 = regRes2.headers['set-cookie']
      .find((c) => c.startsWith(`${COOKIE_NAME}=`))
      .split(';')[0];

    // Seed test readings for User 1:
    // October 2026:
    // Day 1: 2026-10-15 (3 readings: 90, 130, 110) -> min: 90, max: 130, avg: 110.0
    await query(`
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES
      ($1, '2026-10-15', 'Morning fasting', 90),
      ($1, '2026-10-15', 'After breakfast', 130),
      ($1, '2026-10-15', 'After lunch', 110);
    `, [userId1]);

    // Day 2: 2026-10-16 (2 readings: 100, 140) -> min: 100, max: 140, avg: 120.0
    await query(`
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES
      ($1, '2026-10-16', 'Morning fasting', 100),
      ($1, '2026-10-16', 'After lunch', 140);
    `, [userId1]);

    // November 2026:
    // Day 3: 2026-11-01 (4 readings: 85, 125, 115, 135) -> min: 85, max: 135, avg: 115.0
    await query(`
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES
      ($1, '2026-11-01', 'Morning fasting', 85),
      ($1, '2026-11-01', 'After breakfast', 125),
      ($1, '2026-11-01', 'After lunch', 115),
      ($1, '2026-11-01', 'After dinner', 135);
    `, [userId1]);

    // Day 4: 2026-11-02 (4 readings: 95, 145, 120, 140) -> min: 95, max: 145, avg: 125.0
    await query(`
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES
      ($1, '2026-11-02', 'Morning fasting', 95),
      ($1, '2026-11-02', 'After breakfast', 145),
      ($1, '2026-11-02', 'After lunch', 120),
      ($1, '2026-11-02', 'After dinner', 140);
    `, [userId1]);

    // Seed User 2 reading on 2026-11-01 (value 300) to test isolation
    await query(`
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value) VALUES
      ($1, '2026-11-01', 'Morning fasting', 300);
    `, [userId2]);
  });

  after(async () => {
    await query('DELETE FROM users WHERE email IN ($1, $2);', [user1.email, user2.email]);
    await closePool();
  });

  // --- 1. AUTHENTICATION GUARDS ---
  test('Auth Guard: GET /api/reports/daily rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/reports/daily');
    assert.strictEqual(res.status, 401);
  });

  test('Auth Guard: GET /api/reports/month-to-date rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/reports/month-to-date');
    assert.strictEqual(res.status, 401);
  });

  test('Auth Guard: GET /api/reports/monthly rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/reports/monthly');
    assert.strictEqual(res.status, 401);
  });

  test('Auth Guard: GET /api/reports/custom rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/reports/custom');
    assert.strictEqual(res.status, 401);
  });

  // --- 2. VALIDATION CHECKS ---
  test('Validation: Rejects malformed calendar date in daily report with 400', async () => {
    const res = await request(app)
      .get('/api/reports/daily?date=2026-02-31')
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('Validation: Rejects future date in daily report with 400', async () => {
    const future = '2099-01-01';
    const res = await request(app)
      .get(`/api/reports/daily?date=${future}`)
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error.message, /cannot be in the future/);
  });

  test('Validation: Rejects future month in monthly report with 400', async () => {
    const res = await request(app)
      .get('/api/reports/monthly?year=2099&month=12')
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error.message, /future month/);
  });

  test('Validation: Rejects invalid month value (13) in monthly report with 400', async () => {
    const res = await request(app)
      .get('/api/reports/monthly?year=2026&month=13')
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
  });

  test('Validation: Custom report requires both startDate and endDate', async () => {
    const res = await request(app)
      .get('/api/reports/custom?startDate=2026-10-01')
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('Validation: Custom report rejects startDate after endDate with 400', async () => {
    const res = await request(app)
      .get('/api/reports/custom?startDate=2026-11-05&endDate=2026-11-01')
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(res.status, 400);
    assert.match(res.body.error.message, /cannot be after/);
  });

  // --- 3. DAILY REPORT (GET /api/reports/daily) ---
  test('GET /api/reports/daily: Computes accurate clinical metrics and slot ordering', async () => {
    const res = await request(app)
      .get('/api/reports/daily?date=2026-11-01')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reportType, 'daily');
    assert.strictEqual(res.body.date, '2026-11-01');
    assert.strictEqual(res.body.totalReadings, 4);
    assert.strictEqual(res.body.lowest, 85);
    assert.strictEqual(res.body.highest, 135);
    assert.strictEqual(res.body.average, 115.0);
    assert.strictEqual(res.body.readings.length, 4);

    // Verify slots are ordered chronologically
    const slotOrder = res.body.readings.map((r) => r.time_slot);
    assert.deepStrictEqual(slotOrder, [
      'Morning fasting',
      'After breakfast',
      'After lunch',
      'After dinner',
    ]);
  });

  test('GET /api/reports/daily: Returns proper empty state when no readings exist for date', async () => {
    const res = await request(app)
      .get('/api/reports/daily?date=2026-11-05')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reportType, 'daily');
    assert.strictEqual(res.body.date, '2026-11-05');
    assert.strictEqual(res.body.totalReadings, 0);
    assert.strictEqual(res.body.lowest, null);
    assert.strictEqual(res.body.highest, null);
    assert.strictEqual(res.body.average, null);
    assert.deepStrictEqual(res.body.readings, []);
  });

  // --- 4. MONTH-TO-DATE REPORT (GET /api/reports/month-to-date) ---
  test('GET /api/reports/month-to-date: Calculates interval from 1st of month to reference date', async () => {
    const res = await request(app)
      .get('/api/reports/month-to-date?date=2026-11-02')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reportType, 'month-to-date');
    assert.strictEqual(res.body.startDate, '2026-11-01');
    assert.strictEqual(res.body.endDate, '2026-11-02');
    assert.strictEqual(res.body.totalReadings, 8);
    assert.strictEqual(res.body.lowest, 85);
    assert.strictEqual(res.body.highest, 145);
    assert.strictEqual(res.body.average, 120.0);
    assert.strictEqual(res.body.dailyBreakdown.length, 2);

    assert.strictEqual(res.body.dailyBreakdown[0].date, '2026-11-01');
    assert.strictEqual(res.body.dailyBreakdown[0].totalReadings, 4);
    assert.strictEqual(res.body.dailyBreakdown[1].date, '2026-11-02');
    assert.strictEqual(res.body.dailyBreakdown[1].totalReadings, 4);
  });

  test('GET /api/reports/month-to-date: Returns empty state for month with zero readings', async () => {
    const res = await request(app)
      .get('/api/reports/month-to-date?date=2026-08-15')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalReadings, 0);
    assert.strictEqual(res.body.lowest, null);
    assert.strictEqual(res.body.highest, null);
    assert.strictEqual(res.body.average, null);
    assert.deepStrictEqual(res.body.dailyBreakdown, []);
  });

  // --- 5. FULL MONTHLY REPORT (GET /api/reports/monthly) ---
  test('GET /api/reports/monthly: Computes full calendar month report (e.g. October with 31 days)', async () => {
    const res = await request(app)
      .get('/api/reports/monthly?year=2026&month=10')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reportType, 'monthly');
    assert.strictEqual(res.body.year, 2026);
    assert.strictEqual(res.body.month, 10);
    assert.strictEqual(res.body.startDate, '2026-10-01');
    assert.strictEqual(res.body.endDate, '2026-10-31');
    assert.strictEqual(res.body.totalReadings, 5); // 3 from Oct 15 + 2 from Oct 16
    assert.strictEqual(res.body.lowest, 90);
    assert.strictEqual(res.body.highest, 140);
    // (90 + 130 + 110 + 100 + 140) / 5 = 570 / 5 = 114.0
    assert.strictEqual(res.body.average, 114.0);
    assert.strictEqual(res.body.dailyBreakdown.length, 2);
  });

  // --- 6. CUSTOM DATE RANGE REPORT (GET /api/reports/custom) ---
  test('GET /api/reports/custom: Computes cross-month custom range metrics and breakdown', async () => {
    const res = await request(app)
      .get('/api/reports/custom?startDate=2026-10-16&endDate=2026-11-01')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.reportType, 'custom');
    assert.strictEqual(res.body.startDate, '2026-10-16');
    assert.strictEqual(res.body.endDate, '2026-11-01');
    // Includes Oct 16 (2 readings: 100, 140) and Nov 01 (4 readings: 85, 125, 115, 135) = 6 readings
    assert.strictEqual(res.body.totalReadings, 6);
    assert.strictEqual(res.body.lowest, 85);
    assert.strictEqual(res.body.highest, 140);
    // (100 + 140 + 85 + 125 + 115 + 135) / 6 = 700 / 6 = 116.666... -> 116.7
    assert.strictEqual(res.body.average, 116.7);
    assert.strictEqual(res.body.dailyBreakdown.length, 2);
  });

  // --- 7. MULTI-TENANT ISOLATION ---
  test('Multi-tenant Isolation: User 1 reports never leak User 2 readings', async () => {
    // User 2 has a reading on 2026-11-01 of 300 mg/dL
    // User 1 on 2026-11-01 has max 135 mg/dL
    const user1DailyRes = await request(app)
      .get('/api/reports/daily?date=2026-11-01')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(user1DailyRes.body.highest, 135, 'User 1 highest must NOT reflect User 2 value');
    assert.strictEqual(user1DailyRes.body.totalReadings, 4);

    // User 2 sees only their reading
    const user2DailyRes = await request(app)
      .get('/api/reports/daily?date=2026-11-01')
      .set('Cookie', [sessionCookie2]);

    assert.strictEqual(user2DailyRes.body.highest, 300);
    assert.strictEqual(user2DailyRes.body.lowest, 300);
    assert.strictEqual(user2DailyRes.body.average, 300.0);
    assert.strictEqual(user2DailyRes.body.totalReadings, 1);
  });
});
