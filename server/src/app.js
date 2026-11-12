const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { csrfProtection } = require('./middleware/csrf.middleware');
const { errorHandler, notFoundHandler } = require('./middleware/error.middleware');
const authRoutes = require('./routes/auth.routes');
const readingRoutes = require('./routes/reading.routes');

const app = express();

// Security HTTP headers with Helmet
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration supporting credentials and strict origin whitelisting
const allowedOrigin = process.env.CLIENT_URL || 'http://localhost:5173';
app.use(
  cors({
    origin: function (requestOrigin, callback) {
      // Allow requests with no origin (like server-to-server, mobile or curl)
      if (!requestOrigin) {
        return callback(null, true);
      }
      if (requestOrigin === allowedOrigin) {
        return callback(null, true);
      }
      // Do not allow unauthorized origins (omits Access-Control-Allow-Origin)
      return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-test-bypass-csrf'],
  })
);

function getCookieSecret() {
  const secret = process.env.COOKIE_SECRET;
  if (!secret) {
    if (['production', 'staging'].includes(process.env.NODE_ENV)) {
      throw new Error('COOKIE_SECRET environment variable is strictly required in production and staging environments!');
    }
    return 'sweety_cookie_fallback_secret_dev_2026';
  }
  return secret;
}

// Parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(getCookieSecret()));

// Anti-CSRF protection across all state mutations
app.use(csrfProtection);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/readings', readingRoutes);

// Fallback handlers
app.use(notFoundHandler);
app.use(errorHandler);

app.getCookieSecret = getCookieSecret;

module.exports = app;
