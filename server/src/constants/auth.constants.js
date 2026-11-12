module.exports = {
  COOKIE_NAME: 'sweety_session',
  CSRF_COOKIE_NAME: 'sweety_csrf',
  SESSION_EXPIRY_DAYS: 7,
  SESSION_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,
  BCRYPT_SALT_ROUNDS: 12,
  JWT_ISSUER: 'sweety-auth',
  JWT_AUDIENCE: 'sweety-app',
};
