const app = require('./app');
const { closePool } = require('./config/db');

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`Sweety Blood Glucose Tracker server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

async function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Gracefully closing HTTP server and database pool...`);
  server.close(async () => {
    try {
      await closePool();
      console.log('PostgreSQL client pool closed cleanly. Process exit.');
      process.exit(0);
    } catch (err) {
      console.error('Error closing database pool during shutdown:', err);
      process.exit(1);
    }
  });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = server;
