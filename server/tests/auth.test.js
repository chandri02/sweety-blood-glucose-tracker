const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const { query, closePool } = require('../src/config/db');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../src/constants/auth.constants');

describe('Authentication & Authorization Integration Tests', () => {
  const testUser = {
    name: 'Alice Springs',
    email: 'alice.auth.test@sweetyapp.local',
    password: 'SecurePassword123!',
  };

  let csrfToken;
  let csrfCookie;
  let sessionCookie;

  before(async () => {
    // Clean up test user if previously left over
    await query('DELETE FROM users WHERE email = $1;', [testUser.email]);
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = $1;', [testUser.email]);
    await closePool();
  });

  test('GET /api/health should return 200 and system status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });

  test('GET /api/auth/csrf-token should issue a valid anti-CSRF token and cookie', async () => {
    const res = await request(app).get('/api/auth/csrf-token');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.csrfToken);

    csrfToken = res.body.csrfToken;
    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Response should contain Set-Cookie header');

    const csrfSetCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    assert.ok(csrfSetCookie, 'Should set the sweety_csrf cookie');
    csrfCookie = csrfSetCookie.split(';')[0];
  });

  test('POST /api/auth/register should reject requests lacking CSRF token with 403', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_MISSING');
  });

  test('POST /api/auth/register should reject invalid email format with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Invalid Email User',
        email: 'not-an-email',
        password: 'ValidPass123!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
  });

  test('POST /api/auth/register should reject weak password with 400', async () => {
    const weakPasswords = [
      'short1!', // < 8 chars
      'nouppercase123!', // no uppercase
      'NOLOWERCASE123!', // no lowercase
      'NoDigitsHere!', // no number
      'NoSpecialChars123', // no symbol
    ];

    for (const pwd of weakPasswords) {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Weak Pass User',
          email: 'weak.pass@test.local',
          password: pwd,
        });

      assert.strictEqual(res.status, 400);
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  test('POST /api/auth/register should succeed with valid credentials and return 201', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send(testUser);

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.email, testUser.email);
    assert.strictEqual(res.body.user.name, testUser.name);
    assert.ok(res.body.user.id);
    assert.strictEqual(res.body.user.password_hash, undefined, 'Password hash must never be returned');

    const cookies = res.headers['set-cookie'];
    const sessionCookieHeader = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    assert.ok(sessionCookieHeader, 'Must issue sweety_session cookie');
    assert.ok(sessionCookieHeader.includes('HttpOnly'), 'Session cookie must be HttpOnly');

    sessionCookie = sessionCookieHeader.split(';')[0];
  });

  test('POST /api/auth/register should reject duplicate email with 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Another User',
        email: testUser.email.toUpperCase(), // Test case-insensitive duplicate check
        password: 'ValidPassword123!',
      });

    assert.strictEqual(res.status, 409);
    assert.strictEqual(res.body.error.code, 'EMAIL_EXISTS');
  });

  test('GET /api/auth/me should return authenticated user profile when session cookie is provided', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.user);
    assert.strictEqual(res.body.user.email, testUser.email);
    assert.strictEqual(res.body.user.name, testUser.name);
  });

  test('GET /api/auth/me should return 401 Unauthorized when session cookie is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
  });

  test('GET /api/auth/me should return 401 Unauthorized when session cookie is tampered with', async () => {
    const tamperedCookie = `${COOKIE_NAME}=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tamperedPayload.signature`;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [tamperedCookie]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_TOKEN');
  });

  test('POST /api/auth/login should reject incorrect password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testUser.email,
        password: 'WrongPassword999!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('POST /api/auth/login should reject non-existent user with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: 'ghost.user.does.not.exist@test.local',
        password: 'SomePassword123!',
      });

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('POST /api/auth/login should authenticate successfully with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.user.email, testUser.email);

    const cookies = res.headers['set-cookie'];
    const sessionCookieHeader = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    assert.ok(sessionCookieHeader);
    sessionCookie = sessionCookieHeader.split(';')[0];
  });

  test('POST /api/auth/logout should clear cookies and invalidate server-side token version', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [sessionCookie, csrfCookie])
      .set('X-CSRF-Token', csrfToken);

    assert.strictEqual(logoutRes.status, 200);

    const cookies = logoutRes.headers['set-cookie'];
    const clearedSession = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=;`));
    assert.ok(clearedSession, 'Session cookie must be cleared on logout');

    // Attempting to use the old session cookie after logout must be rejected because token_version was incremented
    const afterLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);

    assert.strictEqual(afterLogoutRes.status, 401);
    assert.strictEqual(afterLogoutRes.body.error.code, 'SESSION_REVOKED');
  });
});
