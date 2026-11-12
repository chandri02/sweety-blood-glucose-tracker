const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, closePool } = require('../src/config/db');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../src/constants/auth.constants');

describe('Phase 9: End-to-End Journeys, Concurrency & Security Hardening', () => {
  const patientA = {
    name: 'E2E Patient Alpha',
    email: 'e2e_patient_alpha@sweetytest.local',
    password: 'SecurePassword123!',
  };

  const patientB = {
    name: 'E2E Patient Beta',
    email: 'e2e_patient_beta@sweetytest.local',
    password: 'SecurePassword123!',
  };

  let csrfTokenA;
  let csrfCookieA;
  let sessionCookieA;
  let userIdA;

  let csrfTokenB;
  let csrfCookieB;
  let sessionCookieB;
  let userIdB;

  const DEMO_USER_ID = '6413d065-1918-47ac-a582-7127674a015a';
  const DEMO_READINGS_COUNT = 104;

  const testDate1 = '2026-11-01';
  const testDate2 = '2026-11-02';
  const testDateConcurrency = '2026-11-05';

  async function getCsrfAndCookies(agent) {
    const res = await agent.get('/api/auth/csrf-token');
    const token = res.body.csrfToken;
    const cookies = res.headers['set-cookie'] || [];
    const csrfCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))?.split(';')[0];
    return { token, csrfCookie };
  }

  before(async () => {
    // 1. Verify seeded database records remain untouched
    const seedCheck = await query('SELECT count(*)::int AS count FROM readings WHERE user_id = $1;', [DEMO_USER_ID]);
    assert.strictEqual(
      seedCheck.rows[0].count,
      DEMO_READINGS_COUNT,
      `Pre-condition failed: Expected ${DEMO_READINGS_COUNT} seeded readings for demo user`
    );

    // 2. Clean up test users from any previous runs
    await query('DELETE FROM users WHERE email IN ($1, $2);', [patientA.email, patientB.email]);

    // 3. Register and authenticate Patient A
    const { token: tA, csrfCookie: cA } = await getCsrfAndCookies(request(app));
    const regResA = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [cA])
      .set('X-CSRF-Token', tA)
      .send(patientA);

    assert.strictEqual(regResA.status, 201);
    userIdA = regResA.body.user.id;
    const cookiesA = regResA.headers['set-cookie'] || [];
    sessionCookieA = cookiesA.find((c) => c.startsWith(`${COOKIE_NAME}=`))?.split(';')[0];
    csrfCookieA = cookiesA.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))?.split(';')[0];
    csrfTokenA = regResA.body.csrfToken;

    // 4. Register and authenticate Patient B (for isolation tests)
    const { token: tB, csrfCookie: cB } = await getCsrfAndCookies(request(app));
    const regResB = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [cB])
      .set('X-CSRF-Token', tB)
      .send(patientB);

    assert.strictEqual(regResB.status, 201);
    userIdB = regResB.body.user.id;
    const cookiesB = regResB.headers['set-cookie'] || [];
    sessionCookieB = cookiesB.find((c) => c.startsWith(`${COOKIE_NAME}=`))?.split(';')[0];
    csrfCookieB = cookiesB.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`))?.split(';')[0];
    csrfTokenB = regResB.body.csrfToken;
  });

  after(async () => {
    // Clean up test records (CASCADE deletes test readings)
    await query('DELETE FROM users WHERE email IN ($1, $2);', [patientA.email, patientB.email]);

    // Verify seeded database records remain exactly 104
    const postCheck = await query('SELECT count(*)::int AS count FROM readings WHERE user_id = $1;', [DEMO_USER_ID]);
    assert.strictEqual(
      postCheck.rows[0].count,
      DEMO_READINGS_COUNT,
      `Post-condition failed: Demo seeded readings modified!`
    );

    await closePool();
  });

  // =========================================================================
  // SECTION 1: END-TO-END USER JOURNEYS
  // =========================================================================
  test('E2E Flow: Complete user lifecycle from login to multi-reading logging, reporting, and logout', async () => {
    // 1. Fetch current profile
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(meRes.status, 200);
    assert.strictEqual(meRes.body.user.email, patientA.email);

    // 2. Log 4 readings across clinical slots on testDate1
    const slots = [
      { slot: 'Morning fasting', val: 92 },
      { slot: 'After breakfast', val: 125 },
      { slot: 'After lunch', val: 142 },
      { slot: 'After dinner', val: 118 },
    ];

    let createdId;
    for (const item of slots) {
      const res = await request(app)
        .post('/api/readings')
        .set('Cookie', [sessionCookieA, csrfCookieA])
        .set('X-CSRF-Token', csrfTokenA)
        .send({
          reading_date: testDate1,
          time_slot: item.slot,
          glucose_value: item.val,
        });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.body.reading.glucose_value, item.val);
      if (item.slot === 'Morning fasting') createdId = res.body.reading.id;
    }

    // 3. Log 2 readings on testDate2
    const res2a = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: testDate2, time_slot: 'Morning fasting', glucose_value: 88 });
    assert.strictEqual(res2a.status, 201);

    const res2b = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: testDate2, time_slot: 'After lunch', glucose_value: 130 });
    assert.strictEqual(res2b.status, 201);

    // 4. Query readings list with pagination and verify count
    const listRes = await request(app)
      .get('/api/readings?page=1&limit=10')
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(listRes.status, 200);
    assert.strictEqual(listRes.body.totalCount, 6);

    // 5. Verify Daily Report for testDate1
    // Values: 92, 125, 142, 118. Sum = 477. Avg = 477 / 4 = 119.25 -> rounded 119.3. Min = 92. Max = 142.
    const dailyRes = await request(app)
      .get(`/api/reports/daily?date=${testDate1}`)
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(dailyRes.status, 200);
    assert.strictEqual(dailyRes.body.totalReadings, 4);
    assert.strictEqual(dailyRes.body.lowest, 92);
    assert.strictEqual(dailyRes.body.highest, 142);
    assert.strictEqual(dailyRes.body.average, 119.3);
    assert.strictEqual(dailyRes.body.slotAnalysis.highestAverageSlot, 'After lunch');

    // 6. Verify Custom Range Report across testDate1 and testDate2
    // Total readings = 6. Values: 92, 125, 142, 118, 88, 130. Sum = 695. Avg = 695 / 6 = 115.83 -> rounded 115.8.
    const customRes = await request(app)
      .get(`/api/reports/custom?startDate=${testDate1}&endDate=${testDate2}`)
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(customRes.status, 200);
    assert.strictEqual(customRes.body.totalReadings, 6);
    assert.strictEqual(customRes.body.lowest, 88);
    assert.strictEqual(customRes.body.highest, 142);
    assert.strictEqual(customRes.body.average, 115.8);
    assert.strictEqual(customRes.body.dailyBreakdown.length, 2);

    // 7. Update created reading (change glucose value 92 -> 96)
    const updateRes = await request(app)
      .put(`/api/readings/${createdId}`)
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({
        reading_date: testDate1,
        time_slot: 'Morning fasting',
        glucose_value: 96,
      });
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updateRes.body.reading.glucose_value, 96);

    // 8. Delete reading and confirm deletion
    const delRes = await request(app)
      .delete(`/api/readings/${createdId}`)
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA);
    assert.strictEqual(delRes.status, 200);

    // 9. Re-check daily report to ensure metric dynamically updated (total now 3)
    const dailyAfterDel = await request(app)
      .get(`/api/reports/daily?date=${testDate1}`)
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(dailyAfterDel.body.totalReadings, 3);
  });

  // =========================================================================
  // SECTION 2: CONCURRENCY & RACE-CONDITION HARDENING
  // =========================================================================
  test('Concurrency: Simultaneous submissions strictly enforce maximum 4 readings per day limit', async () => {
    // Concurrently send 6 requests for testDateConcurrency across different time slots (with duplicates)
    const slotsToTry = [
      'Morning fasting',
      'After breakfast',
      'After lunch',
      'After dinner',
      'Morning fasting', // Duplicate slot attempt
      'After breakfast', // 6th reading attempt
    ];

    const promises = slotsToTry.map((slot, index) =>
      request(app)
        .post('/api/readings')
        .set('Cookie', [sessionCookieA, csrfCookieA])
        .set('X-CSRF-Token', csrfTokenA)
        .send({
          reading_date: testDateConcurrency,
          time_slot: slot,
          glucose_value: 100 + index * 5,
        })
    );

    const results = await Promise.all(promises);

    const successes = results.filter((r) => r.status === 201);
    const failures = results.filter((r) => r.status >= 400);

    // Exactly 4 should succeed, exactly 2 should fail
    assert.strictEqual(successes.length, 4, 'Exactly 4 clinical slots should succeed');
    assert.strictEqual(failures.length, 2, 'Exceeded attempts should be rejected');

    // Confirm in DB that exactly 4 readings exist for testDateConcurrency
    const countRes = await query(
      'SELECT count(*)::int AS count FROM readings WHERE user_id = $1 AND reading_date = $2;',
      [userIdA, testDateConcurrency]
    );
    assert.strictEqual(countRes.rows[0].count, 4);
  });

  test('Concurrency: 5 simultaneous submissions for the identical slot allow exactly 1 and reject 4', async () => {
    const conflictDate = '2026-11-06';
    const promises = Array.from({ length: 5 }).map((_, i) =>
      request(app)
        .post('/api/readings')
        .set('Cookie', [sessionCookieA, csrfCookieA])
        .set('X-CSRF-Token', csrfTokenA)
        .send({
          reading_date: conflictDate,
          time_slot: 'Morning fasting',
          glucose_value: 90 + i,
        })
    );

    const results = await Promise.all(promises);
    const successes = results.filter((r) => r.status === 201);
    const conflicts = results.filter((r) => r.status === 409 || r.status === 400);

    assert.strictEqual(successes.length, 1, 'Only 1 request must win the slot lock');
    assert.strictEqual(conflicts.length, 4, '4 duplicate requests must be rejected');
  });

  test('Concurrency: Multiple users posting readings simultaneously operate independently without deadlocks', async () => {
    const multiUserDate = '2026-11-07';

    // Simultaneously send 4 requests for Patient A and 4 for Patient B
    const promisesA = ['Morning fasting', 'After breakfast', 'After lunch', 'After dinner'].map((slot, i) =>
      request(app)
        .post('/api/readings')
        .set('Cookie', [sessionCookieA, csrfCookieA])
        .set('X-CSRF-Token', csrfTokenA)
        .send({ reading_date: multiUserDate, time_slot: slot, glucose_value: 100 + i })
    );

    const promisesB = ['Morning fasting', 'After breakfast', 'After lunch', 'After dinner'].map((slot, i) =>
      request(app)
        .post('/api/readings')
        .set('Cookie', [sessionCookieB, csrfCookieB])
        .set('X-CSRF-Token', csrfTokenB)
        .send({ reading_date: multiUserDate, time_slot: slot, glucose_value: 120 + i })
    );

    const [resultsA, resultsB] = await Promise.all([Promise.all(promisesA), Promise.all(promisesB)]);

    assert.strictEqual(resultsA.every((r) => r.status === 201), true);
    assert.strictEqual(resultsB.every((r) => r.status === 201), true);

    // Verify Patient A cannot see Patient B's readings in daily report
    const reportA = await request(app)
      .get(`/api/reports/daily?date=${multiUserDate}`)
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(reportA.body.totalReadings, 4);
    assert.strictEqual(reportA.body.readings.every((r) => r.glucose_value < 120), true);
  });

  // =========================================================================
  // SECTION 3: SECURITY & MULTI-TENANT ISOLATION HARDENING
  // =========================================================================
  test('Security: User A cannot read, update, or delete User B readings (strict 404 isolation)', async () => {
    // Create a reading for User B
    const createResB = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieB, csrfCookieB])
      .set('X-CSRF-Token', csrfTokenB)
      .send({
        reading_date: '2026-11-08',
        time_slot: 'Morning fasting',
        glucose_value: 145,
      });
    assert.strictEqual(createResB.status, 201);
    const readingIdB = createResB.body.reading.id;

    // 1. User A tries to GET User B's reading -> 404 NOT_FOUND
    const getRes = await request(app)
      .get(`/api/readings/${readingIdB}`)
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(getRes.status, 404);
    assert.strictEqual(getRes.body.error.code, 'NOT_FOUND');

    // 2. User A tries to PUT User B's reading -> 404 NOT_FOUND
    const putRes = await request(app)
      .put(`/api/readings/${readingIdB}`)
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({
        reading_date: '2026-11-08',
        time_slot: 'Morning fasting',
        glucose_value: 200,
      });
    assert.strictEqual(putRes.status, 404);
    assert.strictEqual(putRes.body.error.code, 'NOT_FOUND');

    // 3. User A tries to DELETE User B's reading -> 404 NOT_FOUND
    const delRes = await request(app)
      .delete(`/api/readings/${readingIdB}`)
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA);
    assert.strictEqual(delRes.status, 404);
    assert.strictEqual(delRes.body.error.code, 'NOT_FOUND');

    // Verify User B's reading is still completely intact in database
    const verifyB = await request(app)
      .get(`/api/readings/${readingIdB}`)
      .set('Cookie', [sessionCookieB]);
    assert.strictEqual(verifyB.status, 200);
    assert.strictEqual(verifyB.body.reading.glucose_value, 145);
  });

  test('Security: SQL injection vectors in query parameters are strictly neutralized by validator', async () => {
    // 1. SQL injection in startDate
    const sqlInj1 = await request(app)
      .get("/api/reports/custom?startDate=2026-01-01' OR 1=1 --&endDate=2026-01-02")
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(sqlInj1.status, 400);
    assert.strictEqual(sqlInj1.body.error.code, 'VALIDATION_ERROR');

    // 2. SQL injection in timeSlot filter
    const sqlInj2 = await request(app)
      .get("/api/readings?timeSlot=' UNION SELECT * FROM users --")
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(sqlInj2.status, 400);
    assert.strictEqual(sqlInj2.body.error.code, 'VALIDATION_ERROR');

    // 3. Malformed UUID in reading route
    const sqlInj3 = await request(app)
      .get("/api/readings/00000000-0000-0000-0000-000000000000' OR '1'='1")
      .set('Cookie', [sessionCookieA]);
    assert.strictEqual(sqlInj3.status, 400);
    assert.strictEqual(sqlInj3.body.error.code, 'INVALID_ID');
  });

  test('Security: CSRF protection rejects mismatched and tampered tokens', async () => {
    // Attempt with tampered CSRF header
    const forgeRes = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', `${csrfTokenA}_tampered_value`)
      .send({
        reading_date: '2026-11-09',
        time_slot: 'Morning fasting',
        glucose_value: 100,
      });
    assert.strictEqual(forgeRes.status, 403);
    assert.strictEqual(forgeRes.body.error.code, 'CSRF_INVALID');
  });

  // =========================================================================
  // SECTION 4: EDGE CASES & BOUNDARY CONDITIONS
  // =========================================================================
  test('Edge Cases: Validates clinical glucose limits (strictly 40 to 600 mg/dL)', async () => {
    const boundaryDate = '2026-11-12';

    // 1. Below minimum (39) -> 400
    const resLow = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: boundaryDate, time_slot: 'Morning fasting', glucose_value: 39 });
    assert.strictEqual(resLow.status, 400);
    assert.strictEqual(resLow.body.error.code, 'VALIDATION_ERROR');

    // 2. Exact minimum boundary (40) -> 201
    const resMin = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: boundaryDate, time_slot: 'Morning fasting', glucose_value: 40 });
    assert.strictEqual(resMin.status, 201);

    // 3. Exact maximum boundary (600) -> 201
    const resMax = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: boundaryDate, time_slot: 'After breakfast', glucose_value: 600 });
    assert.strictEqual(resMax.status, 201);

    // 4. Above maximum (601) -> 400
    const resHigh = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: boundaryDate, time_slot: 'After lunch', glucose_value: 601 });
    assert.strictEqual(resHigh.status, 400);
    assert.strictEqual(resHigh.body.error.code, 'VALIDATION_ERROR');
  });

  test('Edge Cases: Calendar date validation correctly handles non-existent dates and future dates', async () => {
    // 1. Invalid calendar date: February 30th -> 400
    const feb30 = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: '2026-02-30', time_slot: 'Morning fasting', glucose_value: 100 });
    assert.strictEqual(feb30.status, 400);

    // 2. Invalid calendar date: April 31st -> 400
    const apr31 = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: '2026-04-31', time_slot: 'Morning fasting', glucose_value: 100 });
    assert.strictEqual(apr31.status, 400);

    // 3. Far future date -> 400
    const futureDate = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookieA, csrfCookieA])
      .set('X-CSRF-Token', csrfTokenA)
      .send({ reading_date: '2099-12-31', time_slot: 'Morning fasting', glucose_value: 100 });
    assert.strictEqual(futureDate.status, 400);
    assert.ok(futureDate.body.error.details.reading_date.includes('future'));
  });

  test('Edge Cases: Empty report datasets return structured zero/null statistics without crashing', async () => {
    const emptyDate = '2025-01-01'; // Date with zero readings for Patient A
    const res = await request(app)
      .get(`/api/reports/daily?date=${emptyDate}`)
      .set('Cookie', [sessionCookieA]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalReadings, 0);
    assert.strictEqual(res.body.lowest, null);
    assert.strictEqual(res.body.highest, null);
    assert.strictEqual(res.body.average, null);
    assert.deepEqual(res.body.readings, []);
    assert.strictEqual(res.body.slotAnalysis.highestAverageSlot, null);
  });
});
