const { COOKIE_NAME } = require('../constants/auth.constants');
const authService = require('../services/auth.service');

async function requireAuth(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required. Please log in to access this resource.',
        },
      });
    }

    const user = await authService.verifySession(token);
    req.user = user;
    next();
  } catch (error) {
    const statusCode = error.statusCode || 401;
    return res.status(statusCode).json({
      error: {
        code: error.code || 'UNAUTHORIZED',
        message: error.message || 'Authentication failed',
      },
    });
  }
}

module.exports = {
  requireAuth,
};
