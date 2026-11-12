function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || (res.statusCode >= 400 ? res.statusCode : 500);

  // Default error response structure
  const response = {
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected internal error occurred',
    },
  };

  if (err.details) {
    response.error.details = err.details;
  }

  // Never leak internal stack traces or database connection details to clients
  if (process.env.NODE_ENV === 'development' && process.env.DEBUG_ERRORS === 'true') {
    response.error.stack = err.stack;
  }

  // Handle common database errors gracefully if uncaught
  if (err.code === '23505') {
    response.error.code = 'UNIQUE_VIOLATION';
    response.error.message = 'A record with this identifier already exists.';
    return res.status(409).json(response);
  }

  if (err.code === '23514') {
    response.error.code = 'CHECK_VIOLATION';
    response.error.message = 'The provided value violates system range constraints.';
    return res.status(400).json(response);
  }

  res.status(statusCode).json(response);
}

function notFoundHandler(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `The requested endpoint ${req.method} ${req.originalUrl} does not exist.`,
    },
  });
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
