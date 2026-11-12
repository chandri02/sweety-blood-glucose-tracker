-- Up Migration: 003_add_user_token_version.sql

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS token_version INTEGER NOT NULL DEFAULT 1;
