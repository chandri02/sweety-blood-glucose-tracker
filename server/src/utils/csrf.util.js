const crypto = require('crypto');
const { CSRF_COOKIE_NAME, SESSION_EXPIRY_MS } = require('../constants/auth.constants');

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex');
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
  if (cookieToken.length !== headerToken.length) {
    return false;
  }

  const bufA = Buffer.from(cookieToken);
  const bufB = Buffer.from(headerToken);
  return crypto.timingSafeEqual(bufA, bufB);
}

module.exports = {
  generateCsrfToken,
  getCsrfCookieOptions,
  verifyCsrfTokens,
};
