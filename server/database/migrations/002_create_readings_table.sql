-- Up Migration: 002_create_readings_table.sql

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'reading_time_slot') THEN
        CREATE TYPE reading_time_slot AS ENUM (
            'Morning fasting',
            'After breakfast',
            'After lunch',
            'After dinner'
        );
    END IF;
END$$;

CREATE TABLE IF NOT EXISTS readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    time_slot reading_time_slot NOT NULL,
    glucose_value INTEGER NOT NULL CHECK (glucose_value >= 40 AND glucose_value <= 600),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_date_slot UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_readings_user_date ON readings (user_id, reading_date DESC);
CREATE INDEX IF NOT EXISTS idx_readings_user_date_slot ON readings (user_id, reading_date, time_slot);
