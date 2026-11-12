# Changelog

All notable changes to the **Sweety** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 4: Secure Authentication & Authorization (`feature/secure-authentication`)
- Secure registration (`POST /api/auth/register`) with input validation, password complexity enforcement, duplicate email check, and password hashing (`bcryptjs` 12 salt rounds).
- Secure login (`POST /api/auth/login`) with credential verification and brute-force rate limiting (`express-rate-limit`).
- Secure logout (`POST /api/auth/logout`) with cookie clearing and server-side token invalidation via `token_version`.
- Current user profile endpoint (`GET /api/auth/me`) requiring valid session cookie.
- Cryptographically signed HMAC-SHA256 anti-CSRF token architecture (`csrf.util.js` & `csrfProtection` middleware) preventing cookie injection or cross-domain forgery attacks.
- Strict CORS configuration supporting whitelisted client origin with credentials and `PATCH` method support.
- RFC 5322 email validation rejecting consecutive domain dots, invalid TLDs, and malformed structures.
- Secure session storage via signed, HttpOnly, SameSite, Secure cookies (`sweety_session`).
- Migration `003_add_user_token_version.sql` to support server-side token revocation without external session stores.
- Centralized error handling (`error.middleware.js`) and 404 handler (`notFoundHandler`) preventing credential and stack trace leakage.
- Security headers with Helmet.
- Comprehensive automated integration test suite (`server/tests/auth.test.js`) with 23 tests covering registration, login, logout, session verification, tampered tokens, CSRF HMAC enforcement, CORS origin rejection, email validation matrix, and rate limiting.

### Added - Phase 3: PostgreSQL Database Schema & Migration Architecture
- Dedicated PostgreSQL database initialization script (`server/database/create-db.js`) creating `blood_glucose_tracker_db`.
- Migration engine (`server/database/migrate.js`) with transactional up/down execution and `schema_migrations` tracking.
- Schema migration `001_create_users_table.sql`:
  - `users` table with native `gen_random_uuid()` PK.
  - Unique case-insensitive index on `lower(email)`.
- Schema migration `002_create_readings_table.sql`:
  - Custom `reading_time_slot` ENUM (`Morning fasting`, `After breakfast`, `After lunch`, `After dinner`).
  - `readings` table with native `gen_random_uuid()`.
  - Clinical range constraint: `CHECK (glucose_value >= 40 AND glucose_value <= 600)`.
  - Deduplication constraint: `UNIQUE (user_id, reading_date, time_slot)`.
  - Foreign key with `ON DELETE CASCADE` referencing `users(id)`.
  - Composite indexes: `idx_readings_user_date` and `idx_readings_user_date_slot`.
  - Zero `CURRENT_DATE` database check constraint (future-date checks moved dynamically to backend).
- Database client configuration with connection pool (`server/src/config/db.js`).
- Repeatable, idempotent seed script (`server/database/seeds/seed.js`) seeding demo user (`demo@sweetyapp.local`) and 104 realistic readings.
- Comprehensive automated test suite (`server/tests/db.test.js`) with 13 tests verifying connectivity, UUID generation, range constraints, slot uniqueness, cascade deletions, and parallel concurrency locking with `pg_advisory_xact_lock`.
- Database schema verification utility (`server/database/verify.js`).

### Added - Phase 2: Project Setup Foundation
- Initial monorepo directory layout for client, server, and docs.
- Configuration templates: `.env.example`, `.gitignore`, `.github/PULL_REQUEST_TEMPLATE.md`.
- Architectural specifications and documentation: `docs/architecture.md`, `docs/database-design.md`, `docs/api-documentation.md`.
- Project progress log (`PROGRESS.md`) and changelog (`CHANGELOG.md`).
- Root `package.json` with convenience workspace scripts.
