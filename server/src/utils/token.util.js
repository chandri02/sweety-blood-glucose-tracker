const jwt = require('jsonwebtoken');
const {
  COOKIE_NAME,
  SESSION_EXPIRY_MS,
  JWT_ISSUER,
  JWT_AUDIENCE,
} = require('../constants/auth.constants');

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production!');
    }
    return 'sweety_dev_fallback_secret_min32characters_2026';
  }
  return secret;
}

function generateToken(payload) {
  const secret = getJwtSecret();
  return jwt.sign(payload, secret, {
    expiresIn: '7d',
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function verifyToken(token) {
  const secret = getJwtSecret();
  return jwt.verify(token, secret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function getSessionCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'strict' : 'lax',
    maxAge: SESSION_EXPIRY_MS,
    path: '/',
  };
}

module.exports = {
  generateToken,
  verifyToken,
  getSessionCookieOptions,
};
