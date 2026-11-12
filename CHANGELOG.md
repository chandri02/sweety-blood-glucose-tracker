# Changelog

All notable changes to the **Sweety** project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added - Phase 6: Complete Reporting Module (`feature/daily-reports`)
- **Backend Reporting APIs**:
  - Daily Report endpoint (`GET /api/reports/daily?date=YYYY-MM-DD`): Single-date clinical statistics (min, max, 1-decimal rounded average, total count) and chronological reading list.
  - Month-to-Date Report endpoint (`GET /api/reports/month-to-date?date=YYYY-MM-DD`): Aggregates readings from the 1st of the month through selected reference date, with daily breakdown groupings.
  - Full Monthly Report endpoint (`GET /api/reports/monthly?year=YYYY&month=MM`): Complete calendar month aggregation handling 28/29/30/31 days and leap years dynamically.
  - Custom Date Range Report endpoint (`GET /api/reports/custom?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`): Flexible cross-month custom date intervals up to 366 days with aggregate metrics and daily breakdowns.
  - Parameterized repository queries (`report.repository.js`) preventing SQL injection with 100% user data isolation (`WHERE user_id = $1`).
  - Validation middleware (`report.validator.js`) enforcing valid calendar formats, timezone-aware non-future checks, and range bounds.
  - Comprehensive automated test suite (`server/tests/reports.test.js`) with 17 integration tests verifying authentication, validations, metric calculations, empty states, and cross-user isolation.
- **Frontend React 18 Dashboard Integration**:
  - Authenticated user Dashboard (`DashboardPage.jsx`) integrating all four report types seamlessly.
  - Interactive report type switcher tabs (`ReportControls.jsx`) supporting Daily, Month-to-Date, Full Monthly, and Custom Range views.
  - Contextual calendar and date pickers for single dates, reference dates, month/year selectors, and custom date intervals.
  - Prominent KPI metric cards (`ReportSummaryCards.jsx`) for Total Readings, Highest Glucose, Lowest Glucose, and Average Glucose with clinical status color indicators.
  - Individual reading cards (`DailyReadingList.jsx`) with time-slot badges and timestamps.
  - Responsive daily breakdown table (`DailyBreakdownTable.jsx`) with expandable day details.
  - Patient-friendly empty states (`EmptyState.jsx`) when no readings exist for the selected timeframe.
  - Complete Vite build verified with zero errors or warnings.

### Added - Phase 5: Glucose Reading Management (CRUD) (`feature/reading-crud`)
- Reading creation endpoint (`POST /api/readings`) with input validation, future-date checks, clinical range enforcement (40–600 mg/dL), duplicate slot detection, and transaction-level advisory locking (`pg_advisory_xact_lock`) enforcing maximum 4 readings per day.
- Reading retrieval endpoint (`GET /api/readings`) with pagination (`page`, `limit`), date-range filtering (`startDate`, `endDate`), and time-slot filtering (`timeSlot`), ordered chronologically with newest first.
- Single reading retrieval (`GET /api/readings/:id`) with strict user data isolation (returns 404 for unauthorized cross-user access).
- Reading update endpoint (`PUT /api/readings/:id`) with validation, slot conflict checks, and cross-user isolation.
- Reading deletion endpoint (`DELETE /api/readings/:id`) with strict multi-tenant isolation.
- Repository layer (`reading.repository.js`) utilizing parameterized queries, atomic transactions, and row-level locking.
- Validation layer (`reading.validator.js`) ensuring valid calendar dates, UUID format, clinical value ranges, and time slot enum membership.
- Comprehensive automated integration test suite (`server/tests/readings.test.js`) with 28 tests covering authentication guards, CSRF enforcement, validation matrix, CRUD operations, concurrency limits, pagination, and multi-tenant isolation.

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
- Production and staging environment guards enforcing strict presence of `COOKIE_SECRET`, `JWT_SECRET`, and `CSRF_SECRET`.
- Documented migration 003 rollback behavior, token resurrection risks, and recommended JWT key rotation procedures in `docs/database-design.md` and migration SQL.
- Comprehensive automated integration test suite (`server/tests/auth.test.js`) with 26 tests covering registration, login, logout, session verification, tampered tokens, CSRF HMAC enforcement, CORS origin rejection, email validation matrix, rate limiting, and production/staging secret guards.

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
