const { CSRF_COOKIE_NAME } = require('../constants/auth.constants');
const { verifyCsrfTokens, generateCsrfToken, getCsrfCookieOptions } = require('../utils/csrf.util');

const STATE_CHANGING_METHODS = new Set(['POST', 'PUT', 'DELETE', 'PATCH']);

function csrfProtection(req, res, next) {
  // Ensure every response has a CSRF cookie if not present
  if (!req.cookies || !req.cookies[CSRF_COOKIE_NAME]) {
    const newToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, newToken, getCsrfCookieOptions());
    req.csrfToken = newToken;
  } else {
    req.csrfToken = req.cookies[CSRF_COOKIE_NAME];
  }

  // Safe HTTP methods do not mutate state
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) {
    return next();
  }

  // Optional test bypass for isolated internal unit tests
  if (process.env.NODE_ENV === 'test' && req.headers['x-test-bypass-csrf'] === 'true') {
    return next();
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (!cookieToken || !headerToken) {
    return res.status(403).json({
      error: {
        code: 'CSRF_MISSING',
        message: 'CSRF token is missing from request header or cookie.',
      },
    });
  }

  const isValid = verifyCsrfTokens(cookieToken, headerToken);
  if (!isValid) {
    return res.status(403).json({
      error: {
        code: 'CSRF_INVALID',
        message: 'Invalid CSRF token.',
      },
    });
  }

  next();
}

module.exports = {
  csrfProtection,
};
