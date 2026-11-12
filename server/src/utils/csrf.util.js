const crypto = require('crypto');
const { CSRF_COOKIE_NAME, SESSION_EXPIRY_MS } = require('../constants/auth.constants');

function getCsrfSecret() {
  const secret = process.env.CSRF_SECRET;
  if (!secret) {
    if (['production', 'staging'].includes(process.env.NODE_ENV)) {
      throw new Error('CSRF_SECRET environment variable is strictly required in production and staging environments!');
    }
    return 'sweety_dev_fallback_csrf_secret_min32chars_2026';
  }
  return secret;
}

function generateCsrfToken() {
  const secret = getCsrfSecret();
  const nonce = crypto.randomBytes(32).toString('hex');
  const signature = crypto.createHmac('sha256', secret).update(nonce).digest('hex');
  return `${nonce}.${signature}`;
}

function verifyCsrfTokenSignature(token) {
  if (!token || typeof token !== 'string') {
    return false;
  }
  const parts = token.split('.');
  if (parts.length !== 2) {
    return false;
  }
  const [nonce, signature] = parts;
  if (!nonce || !signature || nonce.length !== 64 || signature.length !== 64) {
    return false;
  }

  const secret = getCsrfSecret();
  const expectedSignature = crypto.createHmac('sha256', secret).update(nonce).digest('hex');

  const bufA = Buffer.from(signature, 'hex');
  const bufB = Buffer.from(expectedSignature, 'hex');
  if (bufA.length !== bufB.length) {
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function getCsrfCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: false, // Accessible by frontend JavaScript to pass in X-CSRF-Token header
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: SESSION_EXPIRY_MS,
    path: '/',
  };
}

function verifyCsrfTokens(cookieToken, headerToken) {
  if (!cookieToken || !headerToken) {
    return false;
  }
  if (typeof cookieToken !== 'string' || typeof headerToken !== 'string') {
    return false;
  }

  // 1. Verify that the header token has a valid HMAC signature generated with our server secret
  if (!verifyCsrfTokenSignature(headerToken)) {
    return false;
  }

  // 2. Verify that the cookie token has a valid HMAC signature
  if (!verifyCsrfTokenSignature(cookieToken)) {
    return false;
  }

  // 3. Verify timing-safe equality between cookie token and header token
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  const bufA = Buffer.from(cookieToken);
  const bufB = Buffer.from(headerToken);
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  getCsrfSecret,
  generateCsrfToken,
  verifyCsrfTokenSignature,
  getCsrfCookieOptions,
  verifyCsrfTokens,
};
