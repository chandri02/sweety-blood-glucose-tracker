const { Pool } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

// Load .env from server directory or project root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const isProduction = process.env.NODE_ENV === 'production';

function getPoolConfig(overrideDatabase) {
  // If discrete parameters are provided, prioritize them
  if (process.env.DB_PASSWORD) {
    return {
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      database: overrideDatabase || process.env.DB_NAME || 'blood_glucose_tracker_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL);
    return {
      connectionString: overrideDatabase 
        ? `${url.protocol}//${url.username}:${url.password}@${url.host}${overrideDatabase.startsWith('/') ? overrideDatabase : '/' + overrideDatabase}`
        : process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    };
  }

  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: overrideDatabase || process.env.DB_NAME || 'blood_glucose_tracker_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    ssl: isProduction ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  };
}

const pool = new Pool(getPoolConfig());

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client pool:', err.message);
});

async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && process.env.DEBUG_SQL === 'true') {
      console.log(`Executed query in ${duration}ms:`, { text, rows: res.rowCount });
    }
    return res;
  } catch (error) {
    console.error('Database query error:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
    });
    throw error;
  }
}

async function getClient() {
  const client = await pool.connect();
  const originalQuery = client.query.bind(client);
  const release = client.release.bind(client);

  // Set timeout to catch leaks
  const timeout = setTimeout(() => {
    console.error('A client has been checked out for more than 5 seconds!');
  }, 5000);

  client.release = () => {
    clearTimeout(timeout);
    return release();
  };

  return client;
}

async function closePool() {
  await pool.end();
}

module.exports = {
  pool,
  query,
  getClient,
  closePool,
  getPoolConfig,
};
