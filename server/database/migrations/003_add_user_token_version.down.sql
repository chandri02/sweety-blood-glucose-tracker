-- Down Migration: 003_add_user_token_version.down.sql
-- WARNING: Dropping token_version removes server-side JWT revocation state.
-- If reapplied, token_version defaults to 1. To prevent revoked token resurrection,
-- rotate JWT_SECRET immediately whenever this migration is rolled back in production.

ALTER TABLE users 
DROP COLUMN IF EXISTS token_version;
