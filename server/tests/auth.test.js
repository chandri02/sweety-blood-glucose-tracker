const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const { query, closePool } = require('../src/config/db');
const { COOKIE_NAME, CSRF_COOKIE_NAME, JWT_ISSUER, JWT_AUDIENCE } = require('../src/constants/auth.constants');
const { generateCsrfToken } = require('../src/utils/csrf.util');

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
    // Clean up test user if left over from previous runs
    await query('DELETE FROM users WHERE email = $1;', [testUser.email]);
  });

  after(async () => {
    await query('DELETE FROM users WHERE email = $1;', [testUser.email]);
    await closePool();
  });

  // --- 1. HEALTH & BASELINE CHECKS ---
  test('GET /api/health should return 200 and system status', async () => {
    const res = await request(app).get('/api/health');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.status, 'ok');
    assert.ok(res.body.timestamp);
  });

  // --- 2. CSRF SUITE (HMAC SIGNED TOKENS) ---
  test('GET /api/auth/csrf-token should issue a valid HMAC-signed anti-CSRF token and cookie', async () => {
    const res = await request(app).get('/api/auth/csrf-token');
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.csrfToken);

    csrfToken = res.body.csrfToken;
    assert.ok(csrfToken.includes('.'), 'CSRF token must contain nonce.signature delimiter');

    const cookies = res.headers['set-cookie'];
    assert.ok(cookies, 'Response should contain Set-Cookie header');

    const csrfSetCookie = cookies.find((c) => c.startsWith(`${CSRF_COOKIE_NAME}=`));
    assert.ok(csrfSetCookie, 'Should set the sweety_csrf cookie');
    csrfCookie = csrfSetCookie.split(';')[0];
  });

  test('CSRF: POST request missing X-CSRF-Token header is rejected with 403', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .send(testUser);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_MISSING');
  });

  test('CSRF: POST request missing CSRF cookie is rejected with 403', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('X-CSRF-Token', csrfToken)
      .send(testUser);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_MISSING');
  });

  test('CSRF: Mismatched token between cookie and header is rejected with 403', async () => {
    const differentValidToken = generateCsrfToken();
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', differentValidToken)
      .send(testUser);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_INVALID');
  });

  test('CSRF: Forged token with invalid HMAC signature is rejected with 403', async () => {
    const forgedToken = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef.fakeSignature0123456789abcdef0123456789abcdef0123456789abcdef01234';
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [`${CSRF_COOKIE_NAME}=${forgedToken}`])
      .set('X-CSRF-Token', forgedToken)
      .send(testUser);

    assert.strictEqual(res.status, 403);
    assert.strictEqual(res.body.error.code, 'CSRF_INVALID');
  });

  // --- 3. CORS SECURITY ---
  test('CORS: Unauthorized origins do not receive Access-Control-Allow-Origin', async () => {
    const res = await request(app)
      .get('/api/health')
      .set('Origin', 'http://unauthorized-malicious-site.com');

    assert.strictEqual(res.status, 200);
    assert.strictEqual(
      res.headers['access-control-allow-origin'],
      undefined,
      'Access-Control-Allow-Origin must not be set for unauthorized origins'
    );
  });

  test('CORS: Configured client origin receives Access-Control-Allow-Origin and allows credentials', async () => {
    const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
    const res = await request(app)
      .get('/api/health')
      .set('Origin', allowedOrigin);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.headers['access-control-allow-origin'], allowedOrigin);
    assert.strictEqual(res.headers['access-control-allow-credentials'], 'true');
  });

  // --- 4. EMAIL VALIDATION ---
  test('Validation: Rejects malformed email variations with 400', async () => {
    const malformedEmails = [
      'missingatsign.com',
      'user@',
      '@domain.com',
      'user@domain',          // missing TLD dot
      'user@domain..com',      // consecutive dots
      'user@.com',             // domain starts with dot
      'user @domain.com',      // space in local part
      'user@domain .com',      // space in domain part
    ];

    for (const badEmail of malformedEmails) {
      const res = await request(app)
        .post('/api/auth/register')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          name: 'Invalid Email User',
          email: badEmail,
          password: 'ValidPassword123!',
        });

      assert.strictEqual(
        res.status,
        400,
        `Email '${badEmail}' should be rejected with 400, got ${res.status}`
      );
      assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    }
  });

  test('Validation: Rejects weak passwords with 400', async () => {
    const weakPasswords = [
      'short1!',           // < 8 chars
      'nouppercase123!',   // no uppercase
      'NOLOWERCASE123!',   // no lowercase
      'NoDigitsHere!',     // no number
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

  test('Validation: Rejects password and confirmPassword mismatch with 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .set('Cookie', [csrfCookie])
      .set('X-CSRF-Token', csrfToken)
      .send({
        name: 'Mismatch User',
        email: 'mismatch.pass@test.local',
        password: 'ValidPassword123!',
        confirmPassword: 'DifferentPassword999!',
      });

    assert.strictEqual(res.status, 400);
    assert.strictEqual(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.includes('Password and Confirm Password do not match'));
  });

  // --- 5. REGISTRATION & LOGIN LIFECYCLE ---
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
    assert.strictEqual(res.body.user.password_hash, undefined);
  });

  test('Multi-User Isolation: Newly registered user starts with 0 readings, not demo readings', async () => {
    const res = await request(app)
      .get('/api/readings')
      .set('Cookie', [sessionCookie]);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.totalCount, 0);
    assert.strictEqual(res.body.readings.length, 0);
  });

  test('GET /api/auth/me should return 401 Unauthorized when session cookie is missing', async () => {
    const res = await request(app).get('/api/auth/me');
    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'UNAUTHORIZED');
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
    assert.strictEqual(res.body.user.password_hash, undefined);

    const cookies = res.headers['set-cookie'];
    const sessionCookieHeader = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    assert.ok(sessionCookieHeader);
    sessionCookie = sessionCookieHeader.split(';')[0];
  });

  // --- 6. JWT CLAIMS & SECURITY VERIFICATION ---
  test('JWT: Rejects token with invalid/tampered signature with 401', async () => {
    const tamperedCookie = `${COOKIE_NAME}=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxMjM0In0.fakeSignature`;
    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [tamperedCookie]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_TOKEN');
  });

  test('JWT: Rejects token with incorrect issuer with 401', async () => {
    const secret = process.env.JWT_SECRET || 'sweety_dev_fallback_secret_min32characters_2026';
    const badIssuerToken = jwt.sign(
      { userId: 'fake-id', tokenVersion: 1 },
      secret,
      { expiresIn: '1h', issuer: 'untrusted-issuer', audience: JWT_AUDIENCE }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${COOKIE_NAME}=${badIssuerToken}`]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_TOKEN');
  });

  test('JWT: Rejects token with incorrect audience with 401', async () => {
    const secret = process.env.JWT_SECRET || 'sweety_dev_fallback_secret_min32characters_2026';
    const badAudienceToken = jwt.sign(
      { userId: 'fake-id', tokenVersion: 1 },
      secret,
      { expiresIn: '1h', issuer: JWT_ISSUER, audience: 'untrusted-audience' }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${COOKIE_NAME}=${badAudienceToken}`]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'INVALID_TOKEN');
  });

  test('JWT: Rejects expired token with 401 TOKEN_EXPIRED', async () => {
    const secret = process.env.JWT_SECRET || 'sweety_dev_fallback_secret_min32characters_2026';
    const expiredToken = jwt.sign(
      { userId: 'fake-id', tokenVersion: 1 },
      secret,
      { expiresIn: '-1s', issuer: JWT_ISSUER, audience: JWT_AUDIENCE }
    );

    const res = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [`${COOKIE_NAME}=${expiredToken}`]);

    assert.strictEqual(res.status, 401);
    assert.strictEqual(res.body.error.code, 'TOKEN_EXPIRED');
  });

  // --- 7. LOGOUT & SERVER-SIDE TOKEN REVOCATION ---
  test('POST /api/auth/logout should clear cookies and invalidate server-side token version', async () => {
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [sessionCookie, csrfCookie])
      .set('X-CSRF-Token', csrfToken);

    assert.strictEqual(logoutRes.status, 200);

    const cookies = logoutRes.headers['set-cookie'];
    const clearedSession = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=;`));
    assert.ok(clearedSession, 'Session cookie must be cleared on logout');

    // Attempting to use the previous session token after logout must be rejected because token_version was incremented
    const afterLogoutRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [sessionCookie]);

    assert.strictEqual(afterLogoutRes.status, 401);
    assert.strictEqual(afterLogoutRes.body.error.code, 'SESSION_REVOKED');
  });

  // --- 8. RATE LIMITING TEST ---
  test('Rate Limiter: Repeated rapid login attempts trigger 429 Too Many Requests', async () => {
    // In our loginLimiter, max is set to 5 requests per 15 min
    // Send repeated rapid requests to exceed the limit
    let hitRateLimit = false;
    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post('/api/auth/login')
        .set('Cookie', [csrfCookie])
        .set('X-CSRF-Token', csrfToken)
        .send({
          email: 'ratelimit.probe@test.local',
          password: 'WrongPassword123!',
        });

      if (res.status === 429) {
        hitRateLimit = true;
        assert.strictEqual(res.body.error.code, 'TOO_MANY_LOGIN_ATTEMPTS');
        break;
      }
    }

    assert.ok(hitRateLimit, 'Rate limiter must trigger HTTP 429 when max attempts are exceeded');
  });

  // --- 9. PRODUCTION & STAGING SECRET GUARDS ---
  test('Secret Guard: Missing COOKIE_SECRET throws in production and staging, but allows fallback in development', () => {
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.COOKIE_SECRET;

    try {
      delete process.env.COOKIE_SECRET;

      // In production -> must throw
      process.env.NODE_ENV = 'production';
      assert.throws(() => app.getCookieSecret(), /COOKIE_SECRET environment variable is strictly required/);

      // In staging -> must throw
      process.env.NODE_ENV = 'staging';
      assert.throws(() => app.getCookieSecret(), /COOKIE_SECRET environment variable is strictly required/);

      // In development -> must allow fallback
      process.env.NODE_ENV = 'development';
      const fallback = app.getCookieSecret();
      assert.ok(fallback, 'Development mode should provide safe fallback for COOKIE_SECRET');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret !== undefined) process.env.COOKIE_SECRET = originalSecret;
    }
  });

  test('Secret Guard: Missing JWT_SECRET throws in production and staging, but allows fallback in development', () => {
    const { getJwtSecret } = require('../src/utils/token.util');
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.JWT_SECRET;

    try {
      delete process.env.JWT_SECRET;

      // In production -> must throw
      process.env.NODE_ENV = 'production';
      assert.throws(() => getJwtSecret(), /JWT_SECRET environment variable is strictly required/);

      // In staging -> must throw
      process.env.NODE_ENV = 'staging';
      assert.throws(() => getJwtSecret(), /JWT_SECRET environment variable is strictly required/);

      // In development -> must allow fallback
      process.env.NODE_ENV = 'development';
      const fallback = getJwtSecret();
      assert.ok(fallback, 'Development mode should provide safe fallback for JWT_SECRET');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret !== undefined) process.env.JWT_SECRET = originalSecret;
    }
  });

  test('Secret Guard: Missing CSRF_SECRET throws in production and staging, but allows fallback in development', () => {
    const { getCsrfSecret } = require('../src/utils/csrf.util');
    const originalEnv = process.env.NODE_ENV;
    const originalSecret = process.env.CSRF_SECRET;

    try {
      delete process.env.CSRF_SECRET;

      // In production -> must throw
      process.env.NODE_ENV = 'production';
      assert.throws(() => getCsrfSecret(), /CSRF_SECRET environment variable is strictly required/);

      // In staging -> must throw
      process.env.NODE_ENV = 'staging';
      assert.throws(() => getCsrfSecret(), /CSRF_SECRET environment variable is strictly required/);

      // In development -> must allow fallback
      process.env.NODE_ENV = 'development';
      const fallback = getCsrfSecret();
      assert.ok(fallback, 'Development mode should provide safe fallback for CSRF_SECRET');
    } finally {
      process.env.NODE_ENV = originalEnv;
      if (originalSecret !== undefined) process.env.CSRF_SECRET = originalSecret;
    }
  });
});
