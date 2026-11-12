const authService = require('../services/auth.service');
const { getSessionCookieOptions } = require('../utils/token.util');
const { getCsrfCookieOptions, generateCsrfToken } = require('../utils/csrf.util');
const { COOKIE_NAME, CSRF_COOKIE_NAME } = require('../constants/auth.constants');

async function register(req, res, next) {
  try {
    const { name, email, password } = req.body;
    const { user, token } = await authService.register({ name, email, password });

    // Set secure HttpOnly session cookie
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions());

    // Issue anti-CSRF token
    const csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    res.status(201).json({
      message: 'Registration successful',
      user,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login({ email, password });

    // Set secure HttpOnly session cookie
    res.cookie(COOKIE_NAME, token, getSessionCookieOptions());

    // Issue new anti-CSRF token on successful login
    const csrfToken = generateCsrfToken();
    res.cookie(CSRF_COOKIE_NAME, csrfToken, getCsrfCookieOptions());

    res.status(200).json({
      message: 'Login successful',
      user,
      csrfToken,
    });
  } catch (error) {
    next(error);
  }
}

async function logout(req, res, next) {
  try {
    const userId = req.user?.id;
    await authService.logout(userId);

    // Clear session and CSRF cookies
    res.clearCookie(COOKIE_NAME, { path: '/' });
    res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

    res.status(200).json({
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

async function getMe(req, res) {
  res.status(200).json({
    user: req.user,
  });
}

async function getCsrfToken(req, res) {
  const token = req.csrfToken || generateCsrfToken();
  res.cookie(CSRF_COOKIE_NAME, token, getCsrfCookieOptions());
  res.status(200).json({
    csrfToken: token,
  });
}

module.exports = {
  register,
  login,
  logout,
  getMe,
  getCsrfToken,
};
