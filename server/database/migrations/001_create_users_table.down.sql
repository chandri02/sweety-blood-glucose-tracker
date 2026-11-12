-- Down Migration: 001_create_users_table.down.sql

DROP INDEX IF EXISTS idx_users_email_lower;
DROP TABLE IF EXISTS users CASCADE;
