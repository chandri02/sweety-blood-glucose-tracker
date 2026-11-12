const { Client } = require('pg');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { getPoolConfig } = require('../src/config/db');

async function createDatabase() {
  const targetDb = process.env.DB_NAME || 'blood_glucose_tracker_db';
  console.log(`Checking if database '${targetDb}' exists...`);

  // Connect to default maintenance database 'postgres'
  const config = getPoolConfig('postgres');
  const client = new Client(config);

  try {
    await client.connect();
    const checkRes = await client.query(
      'SELECT 1 FROM pg_database WHERE datname = $1;',
      [targetDb]
    );

    if (checkRes.rowCount === 0) {
      console.log(`Database '${targetDb}' does not exist. Creating...`);
      // Database names cannot be parameterized in CREATE DATABASE
      await client.query(`CREATE DATABASE "${targetDb}" ENCODING 'UTF8';`);
      console.log(`Database '${targetDb}' created successfully.`);
    } else {
      console.log(`Database '${targetDb}' already exists.`);
    }
  } catch (error) {
    console.error('Failed to verify/create database:', error.message);
    throw error;
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  createDatabase()
    .then(() => {
      console.log('Database initialization check completed.');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal error during database creation check:', err);
      process.exit(1);
    });
}

module.exports = { createDatabase };
