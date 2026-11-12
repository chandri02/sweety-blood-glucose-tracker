const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, closePool } = require('../src/config/db');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../src/constants/auth.constants');

describe('Glucose Reading Management (CRUD) Integration Tests', () => {
  const user1 = {
    name: 'Crud User One',
    email: 'crud_user1@sweetytest.local',
    password: 'Password123!',
  };

  const user2 = {
    name: 'Crud User Two',
    email: 'crud_user2@sweetytest.local',
    password: 'Password123!',
  };

  let csrfToken1;
  let csrfCookie1;
  let sessionCookie1;
  let userId1;

  let csrfToken2;
  let csrfCookie2;
  let sessionCookie2;
  let userId2;

  let createdReadingId;
  const testDate = '2026-11-10';
  const testDate2 = '2026-11-11';

  before(async () => {
    // Clean up test users from any previous runs
    await query('DELETE FROM users WHERE email IN ($1, $2);', [user1.email, user2.email]);

    // Setup User 1
    const csrfRes1 = await request(app).get('/api/auth/csrf-token');
    csrfToken1 = csrfRes1.body.csrfToken;
    const cookies1 = csrfRes1.headers['set-cookie'];
    csrfCookie1 = cookies1.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`)).split(';')[0];

    const regRes1 = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send(user1);

    userId1 = regRes1.body.user.id;
    const regCookies1 = regRes1.headers['set-cookie'];
    sessionCookie1 = regCookies1.find((c) => c.startsWith(`${COOKIE_NAME}=`)).split(';')[0];
    csrfCookie1 = regCookies1.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`)).split(';')[0];
    csrfToken1 = regRes1.body.csrfToken;

    // Setup User 2 (for multi-tenant isolation tests)
    const csrfRes2 = await request(app).get('/api/auth/csrf-token');
    csrfToken2 = csrfRes2.body.csrfToken;
    const cookies2 = csrfRes2.headers['set-cookie'];
    csrfCookie2 = cookies2.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`)).split(';')[0];

    const regRes2 = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie2])
      .set('X-CSRF-Token', csrfToken2)
      .send(user2);

    userId2 = regRes2.body.user.id;
    const regCookies2 = regRes2.headers['set-cookie'];
    sessionCookie2 = regCookies2.find((c) => c.startsWith(`${COOKIE_NAME}=`)).split(';')[0];
    csrfCookie2 = regCookies2.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`)).split(';')[0];
    csrfToken2 = regRes2.body.csrfToken;
  });

  after(async () => {
    // Clean up test users (cascade deletes test readings)
    await query('DELETE FROM users WHERE email IN ($1, $2);', [user1.email, user2.email]);
    await closePool();
  });

  // --- 1. AUTHENTICATION & CSRF CHECKS ---
  test('Auth Guard: GET /api/readings rejects unauthenticated request with 401', async () => {
    const res = await request(app).get('/api/readings');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  test('Auth Guard: POST /api/readings rejects unauthenticated request with 401 when CSRF token is provided', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({ reading_date: testDate, time_slot: 'Morning fasting', glucose_value: 95 });
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  test('CSRF Guard: POST /api/readings rejects request lacking CSRF token with 403', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1])
      .send({ reading_date: testDate, time_slot: 'Morning fasting', glucose_value: 95 });
    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_MISSING');
  });

  // --- 2. VALIDATION CHECKS ---
  test('Validation: Rejects missing reading_date, time_slot, and glucose_value with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({});

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.reading_date);
    assert.ok(res.body.error.details.time_slot);
    assert.ok(res.body.error.details.glucose_value);
  });

  test('Validation: Rejects future date with 400', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    const futureDateStr = tomorrow.toISOString().split('T')[0];

    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: futureDateStr,
        time_slot: 'Morning fasting',
        glucose_value: 100,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.reading_date, /cannot be in the future/);
  });

  test('Validation: Rejects invalid calendar date (e.g. 2026-02-30) with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: '2026-02-30',
        time_slot: 'Morning fasting',
        glucose_value: 100,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.reading_date, /valid calendar date/);
  });

  test('Validation: Rejects invalid time slot with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Midnight snack',
        glucose_value: 100,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.time_slot, /Invalid time slot/);
  });

  test('Validation: Rejects glucose_value below 40 with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 39,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.glucose_value, /between 40 and 600/);
  });

  test('Validation: Rejects glucose_value above 600 with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 601,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.glucose_value, /between 40 and 600/);
  });

  test('Validation: Rejects non-integer glucose_value with 400', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 120.5,
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.match(res.body.error.details.glucose_value, /whole integer/);
  });

  test('Validation: Rejects invalid UUID in URL path with 400', async () => {
    const res = await request(app)
      .get('/api/readings/invalid-uuid-123')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'INVALID_ID');
  });

  // --- 3. CREATE READING (POST /api/readings) ---
  test('POST /api/readings: Successfully creates valid reading with 201 Created', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 92,
      });

    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.body.message, 'Reading recorded successfully');
    assert.ok(res.body.reading);
    assert.ok(res.body.reading.id);
    assert.strictEqual(res.body.reading.user_id, userId1);
    assert.strictEqual(res.body.reading.reading_date, testDate);
    assert.strictEqual(res.body.reading.time_slot, 'Morning fasting');
    assert.strictEqual(res.body.reading.glucose_value, 92);

    createdReadingId = res.body.reading.id;
  });

  test('POST /api/readings: Rejects duplicate time slot on the same date with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 105,
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'SLOT_ALREADY_EXISTS');
  });

  test('POST /api/readings: Rejects 5th reading on same date when 4 slots are full with 409', async () => {
    // Fill slots 2, 3, 4 for testDate
    await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({ reading_date: testDate, time_slot: 'After breakfast', glucose_value: 135 });

    await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({ reading_date: testDate, time_slot: 'After lunch', glucose_value: 120 });

    await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({ reading_date: testDate, time_slot: 'After dinner', glucose_value: 140 });

    // Try a 5th insert - even if slot differs, limit must reject
    // Note: Since all 4 slots are filled, any insert is blocked by 4-per-day limit
    const res = await request(app)
      .post('/api/readings')
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({ reading_date: testDate, time_slot: 'Morning fasting', glucose_value: 110 });

    assert.strictEqual(res.status, 409);
  });

  // --- 4. CONCURRENCY PROTECTION ---
  test('Concurrency: Parallel requests for the same date cannot exceed 4 readings', async () => {
    // On testDate2, user1 has 0 readings
    // Fire 6 parallel requests across distinct slots / attempts
    const attempts = [
      { reading_date: testDate2, time_slot: 'Morning fasting', glucose_value: 85 },
      { reading_date: testDate2, time_slot: 'After breakfast', glucose_value: 125 },
      { reading_date: testDate2, time_slot: 'After lunch', glucose_value: 115 },
      { reading_date: testDate2, time_slot: 'After dinner', glucose_value: 130 },
      { reading_date: testDate2, time_slot: 'Morning fasting', glucose_value: 90 }, // duplicate
      { reading_date: testDate2, time_slot: 'After lunch', glucose_value: 118 }, // duplicate
    ];

    const results = await Promise.all(
      attempts.map((payload) =>
        request(app)
          .post('/api/readings')
          .set('Cookie', [sessionCookie1, csrfCookie1])
          .set('X-CSRF-Token', csrfToken1)
          .send(payload)
      )
    );

    const successCount = results.filter((r) => r.status === 201).length;
    const conflictCount = results.filter((r) => r.status === 409).length;

    assert.strictEqual(successCount, 4, 'Exactly 4 readings must succeed');
    assert.strictEqual(conflictCount, 2, 'Excess / duplicate attempts must be rejected with 409');

    // Verify in database that testDate2 has exactly 4 readings
    const dbRes = await query(
      'SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2;',
      [userId1, testDate2]
    );
    assert.strictEqual(parseInt(dbRes.rows[0].count, 10), 4);
  });

  // --- 5. LIST READINGS (GET /api/readings) ---
  test('GET /api/readings: Returns paginated readings for authenticated user', async () => {
    const res = await request(app)
      .get('/api/readings?page=1&limit=5')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.readings));
    assert.strictEqual(res.body.readings.length, 5);
    assert.strictEqual(res.body.page, 1);
    assert.strictEqual(res.body.limit, 5);
    assert.strictEqual(res.body.totalCount, 8); // 4 from testDate + 4 from testDate2
    assert.strictEqual(res.body.totalPages, 2);

    // Verify all returned readings belong strictly to User 1
    for (const r of res.body.readings) {
      assert.strictEqual(r.user_id, userId1);
    }
  });

  test('GET /api/readings: Supports date range filtering', async () => {
    const res = await request(app)
      .get(`/api/readings?startDate=${testDate}&endDate=${testDate}`)
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalCount, 4);
    for (const r of res.body.readings) {
      assert.strictEqual(r.reading_date, testDate);
    }
  });

  test('GET /api/readings: Supports timeSlot filtering', async () => {
    const res = await request(app)
      .get('/api/readings?timeSlot=Morning fasting')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalCount, 2); // 1 from testDate + 1 from testDate2
    for (const r of res.body.readings) {
      assert.strictEqual(r.time_slot, 'Morning fasting');
    }
  });

  // --- 6. GET SINGLE READING (GET /api/readings/:id) ---
  test('GET /api/readings/:id: Returns reading record for valid ID', async () => {
    const res = await request(app)
      .get(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.reading);
    assert.strictEqual(res.body.reading.id, createdReadingId);
    assert.strictEqual(res.body.reading.user_id, userId1);
  });

  test('GET /api/readings/:id: Returns 404 for non-existent reading UUID', async () => {
    const res = await request(app)
      .get('/api/readings/00000000-0000-0000-0000-000000000000')
      .set('Cookie', [sessionCookie1]);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  test('Multi-tenant Isolation: User 2 cannot access User 1 reading (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie2]); // User 2 session

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  // --- 7. UPDATE READING (PUT /api/readings/:id) ---
  test('PUT /api/readings/:id: Successfully updates reading value', async () => {
    const res = await request(app)
      .put(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 98,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Reading updated successfully');
    assert.strictEqual(res.body.reading.glucose_value, 98);
  });

  test('PUT /api/readings/:id: Rejects update that creates duplicate slot conflict with 409', async () => {
    // Attempt to change slot to 'After breakfast' which already exists on testDate
    const res = await request(app)
      .put(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1)
      .send({
        reading_date: testDate,
        time_slot: 'After breakfast',
        glucose_value: 120,
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'SLOT_ALREADY_EXISTS');
  });

  test('Multi-tenant Isolation: User 2 cannot update User 1 reading (returns 404)', async () => {
    const res = await request(app)
      .put(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie2, csrfCookie2])
      .set('X-CSRF-Token', csrfToken2)
      .send({
        reading_date: testDate,
        time_slot: 'Morning fasting',
        glucose_value: 150,
      });

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  test('Timezone: getTodayString formats correctly for specified timezone', () => {
    const { getTodayString } = require('../src/validators/reading.validator');
    const kolkataDate = getTodayString('Asia/Kolkata');
    assert.match(kolkataDate, /^\d{4}-\d{2}-\d{2}$/);
    const utcDate = getTodayString('UTC');
    assert.match(utcDate, /^\d{4}-\d{2}-\d{2}$/);
  });

  // --- 8. DELETE READING (DELETE /api/readings/:id) ---
  test('Multi-tenant Isolation: User 2 cannot delete User 1 reading (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie2, csrfCookie2])
      .set('X-CSRF-Token', csrfToken2);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });

  test('DELETE /api/readings/:id: Successfully deletes reading', async () => {
    const res = await request(app)
      .delete(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.message, 'Reading deleted successfully');
    assert.strictEqual(res.body.id, createdReadingId);

    // Verify it is no longer retrievable
    const getRes = await request(app)
      .get(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1]);
    assert.strictEqual(getRes.status, 404);
  });

  test('DELETE /api/readings/:id: Returns 404 for already deleted reading', async () => {
    const res = await request(app)
      .delete(`/api/readings/${createdReadingId}`)
      .set('Cookie', [sessionCookie1, csrfCookie1])
      .set('X-CSRF-Token', csrfToken1);

    assert.strictEqual(res.status, 404);
    assert.strictEqual(res.body.error.code, 'NOT_FOUND');
  });
});
