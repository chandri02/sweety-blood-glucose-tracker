-- Down Migration: 002_create_readings_table.down.sql

DROP TABLE IF EXISTS readings CASCADE;
DROP TYPE IF EXISTS reading_time_slot CASCADE;
