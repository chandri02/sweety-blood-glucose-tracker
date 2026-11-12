# Sweety – Blood Glucose Tracker

A professional, secure, full-stack blood glucose tracking and reporting web application designed for multi-user management, clinical range validation, interactive visualization, and comprehensive statistical analysis.

[![Tests](https://img.shields.io/badge/tests-119%20passing-brightgreen.svg)](#testing-suite)
[![Node](https://img.shields.io/badge/node-%3E%3D20.0.0-blue.svg)](https://nodejs.org)
[![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14-blue.svg)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/license-ISC-green.svg)](LICENSE)

---

## Table of Contents
- [Features](#features)
- [System Architecture](#system-architecture)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quickstart & Local Setup](#quickstart--local-setup)
- [Testing Suite](#testing-suite)
- [Production Deployment Guide](#production-deployment-guide)
- [API Reference](#api-reference)
- [Security Architecture](#security-architecture)
- [Notes](#notes)
- [License](#license)

---

## Features

- **Secure Authentication & Session Management**:
  - Secure patient sign-in and registration powered by `bcryptjs` (12 salt rounds).
  - Signed, `HttpOnly`, `SameSite=Strict`, `Secure` session cookies with server-side token versioning.
  - Double-submit HMAC-signed anti-CSRF token protection across all mutating endpoints (`POST`, `PUT`, `DELETE`).
- **Clinical Blood Glucose Tracking**:
  - Validated reading entry (clinical range: 40–600 mg/dL).
  - 4 standardized daily clinical time slots: `Morning fasting`, `After breakfast`, `After lunch`, `After dinner`.
  - Dynamic categorization: `Hypoglycemia / Low` (< 70 mg/dL), `In Target / Normal` (70–140 mg/dL), `Elevated` (141–180 mg/dL), and `High` (> 180 mg/dL).
- **Strict Concurrency & Data Integrity**:
  - Enforced 1 reading per date and time slot per patient.
  - Maximum 4 readings per calendar day.
  - Transactional PostgreSQL advisory locking (`pg_advisory_xact_lock`) preventing race conditions during concurrent submissions.
  - Timezone-aware date validation preventing future-dated entries.
- **Dynamic Dashboard & Data Visualization (Recharts)**:
  - Responsive period selector: `Daily`, `Month-to-Date`, `Full Monthly`, and `Custom Date Range`.
  - 4 Dynamic KPI summary cards: Total Readings, Highest Glucose, Lowest Glucose, and Average Glucose.
  - `GlucoseTrendChart`: Intraday chronological slots and multi-day trend line with min-max fluctuation spreads and interactive clinical target zone toggle (70–140 mg/dL).
  - `TimeSlotComparisonChart`: Slot-level averages with peak glucose period badge.
  - Recent readings log with live status badges.
- **Reporting Engine**:
  - **Daily Report**: Granular slot breakdown, statistics, and individual readings.
  - **Month-to-Date (MTD) Report**: Month start through selected reference date with expandable day details.
  - **Full Monthly Report**: Preceding calendar month aggregation with dynamic month lengths and leap-year calculations.
  - **Custom Range Report**: Arbitrary start and end dates up to 366 days.
- **Modern Responsive Healthcare UI**:
  - Built with React 18, Vite, and accessible CSS design tokens.
  - Multi-breakpoint tested: Mobile (375px), Tablet (768px), Desktop (1024px), and Wide Desktop (1440px).
  - Keyboard accessible dialogs (`Modal.jsx`) with focus trapping, focus restoration, and <kbd>Escape</kbd> dismissal.
  - Reusable toast notification system and clinical shimmer skeletons.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Client Layer                          │
│   React 18 + Vite SPA · Recharts · Accessible Dialogs       │
└──────────────┬──────────────────────────────▲───────────────┘
               │ HTTP / JSON                  │ HttpOnly Cookie +
               │ (with X-CSRF-Token)          │ CSRF Cookie
┌──────────────▼──────────────────────────────┴───────────────┐
│                    Express.js Backend                       │
│  Helmet Security · Strict CORS · Double-Submit CSRF Guard   │
│  Rate Limiters · Auth Middleware · Timezone Validators      │
└──────────────┬──────────────────────────────▲───────────────┘
               │ Parameterized Queries        │ Query Results
               │ Advisory Locks (Transactions)│
┌──────────────▼──────────────────────────────┴───────────────┐
│                    PostgreSQL 14+                           │
│  Tables: users (token_version), readings, schema_migrations │
│  UUID PKs · Advisory Locking · Multi-tenant Isolation       │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

- **Frontend**: React 18, Vite 5, Recharts 3, Axios, CSS3 Flexbox/Grid.
- **Backend**: Node.js 20+, Express.js 4, `pg` (node-postgres), `cookie-parser`, `helmet`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs`.
- **Database**: PostgreSQL 14+ (tested on PostgreSQL 18) with native `gen_random_uuid()` and transactional advisory locks.
- **Test Harness**: Node.js native test runner (`node:test`), `supertest`, Vite build pipeline.

---

## Project Structure

```
sweety-blood-glucose-tracker/
├── client/                     # React 18 frontend
│   ├── src/
│   │   ├── api/                # Axios client & CSRF sync interceptors
│   │   ├── components/         # Reusable UI (Navbar, Modal, Toasts, Skeletons)
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── pages/              # DashboardPage, ReportsPage, ReadingsPage
│   │   └── utils/              # Clinical constants & formatting helpers
│   ├── tests/                  # Frontend unit tests
│   └── vite.config.js          # Vite config & API dev proxy
├── server/                     # Express.js REST API
│   ├── src/
│   │   ├── config/             # Database pool & SSL config
│   │   ├── controllers/        # Auth, Reading, Report controllers
│   │   ├── middleware/         # Auth, CSRF, Rate-limit, Error handlers
│   │   ├── repositories/       # Parameterized SQL queries & advisory locks
│   │   ├── routes/             # Auth, Reading, Report express routes
│   │   ├── services/           # Business logic & report aggregation
│   │   ├── utils/              # JWT, CSRF, Date utilities
│   │   ├── validators/         # Input validators
│   │   ├── app.js              # Express app setup & production static serving
│   │   └── server.js           # Server listen & graceful shutdown
│   ├── database/
│   │   ├── migrations/         # Versioned schema migrations (001-003)
│   │   ├── seeds/              # Seed scripts (104 clinical readings)
│   │   ├── create-db.js        # Automated DB provisioning
│   │   └── verify.js           # Schema integrity checker
│   └── tests/                  # Backend integration tests & E2E suite
├── .env.example                # Local environment template
├── .env.production.example     # Production environment template
├── CHANGELOG.md                # Versioned release notes
└── PROGRESS.md                 # Roadmap tracking
```

---

## Quickstart & Local Setup

### 1. Clone the Repository
```bash
git clone https://github.com/chandri02/sweety-blood-glucose-tracker.git
cd sweety-blood-glucose-tracker
```

### 2. Prerequisites
- **Node.js**: `v20.0.0` or later
- **PostgreSQL**: `14.0` or later
- **Git**

### 3. Install Dependencies
```bash
# Install all dependencies (root, backend, and frontend) in one command:
npm run install:all

# Or install each package separately:
npm --prefix server install
npm --prefix client install
```

### 4. Environment Configuration
Copy `.env.example` to `.env`:
```bash
# Linux / macOS:
cp .env.example .env

# Windows (PowerShell):
Copy-Item .env.example .env
```
Update PostgreSQL connection settings in `.env`:
```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/blood_glucose_tracker_db
```

### 5. Database Initialization
```bash
# Provision database
npm run db:create

# Run versioned migrations (001, 002, 003)
npm run migrate

# (Optional) Seed realistic demo dataset (104 readings across 2 months: October & November 2026)
npm run seed

# Verify database schema and constraints
npm run db:verify
```

### 6. Running Locally
```bash
# Option A: Start backend and frontend concurrently in a single terminal
npm run dev

# Option B: Run in separate terminals (Recommended alternative)
# Terminal 1: Backend API (port 5000)
npm run server

# Terminal 2: Frontend Client (port 5173)
npm run client
```

- **Frontend Client**: `http://localhost:5173`
- **Backend API**: `http://localhost:5000`
- **Demo Account**: `demo@sweetyapp.local` / `DemoPassword123!` (contains 104 pre-seeded clinical readings across October and November 2026)
- **New Patient Registration**: Visitors can also click **"Create an Account"** on the Sign In page to register a new user account with strict multi-user data isolation. New accounts initialize with an empty dashboard (0 readings).

---

## Testing Suite

The repository features a 100% automated test suite across backend and frontend:

```bash
# Run backend integration & E2E tests (98 tests)
npm run test:server

# Run frontend clinical & responsive UI tests (21 tests)
npm run test:client

# Run complete monorepo suite (119 tests)
npm test
```

### Test Breakdown:
- **Authentication & Security** (`server/tests/auth.test.js` - 28 tests): CSRF verification, rate limiting, JWT lifecycle, password hashing, and CORS enforcement.
- **Database Layer** (`server/tests/db.test.js` - 13 tests): Connection pooling, SSL settings, constraints, and migration verification.
- **Reading CRUD & Concurrency** (`server/tests/readings.test.js` - 28 tests): Range limits, dual-date advisory locking, duplicate slot prevention, and pagination.
- **Reporting Engine** (`server/tests/reports.test.js` - 19 tests): Daily, MTD, Monthly, Custom Range aggregations, and multi-tenant isolation.
- **End-to-End User Lifecycle** (`server/tests/e2e.test.js` - 10 tests): Full patient journey from registration through reporting and logout.
- **Clinical & UI Unit Tests** (`client/tests/` - 21 tests): Clinical thresholds, Recharts missing-data transformations, modal focus traps, and responsive breakpoints.

---

## Production Deployment Guide

### Deployment Options

#### Option A: Unified Full-Stack Node.js Deployment (Render, Railway, Fly.io, Heroku, VPS)
In production (`NODE_ENV=production`), the Express backend automatically serves the compiled React client from `client/dist`.

1. **Build the Frontend**:
   ```bash
   npm run build
   ```
2. **Set Production Environment Variables**:
   Configure the following on your hosting dashboard (reference `.env.production.example`):
   ```env
   NODE_ENV=production
   PORT=5000
   DATABASE_URL=postgresql://user:password@host:port/dbname?sslmode=require
   JWT_SECRET=your-secure-random-64-character-hex-string
   COOKIE_SECRET=your-secure-random-64-character-hex-string
   CSRF_SECRET=your-secure-random-64-character-hex-string
   CLIENT_URL=https://your-domain.com
   APP_TIMEZONE=Asia/Kolkata
   ```
3. **Run Schema Migrations**:
   ```bash
   npm run migrate
   ```
4. **Start the Production Server**:
   ```bash
   npm start
   ```

#### Option B: Decoupled Frontend & Backend (e.g. Vercel/Netlify + AWS/Railway)
- Deploy `server/` to your Node.js platform with `DATABASE_URL` and `CLIENT_URL=https://your-frontend.vercel.app`.
- Deploy `client/` to Vercel/Netlify with API proxy or `VITE_API_URL` pointing to your backend API.

### Health Check Endpoint
A dedicated health endpoint is provided for container orchestrators and load balancers:
```http
GET /api/health
```
Response:
```json
{
  "status": "ok",
  "uptime": 128.45,
  "timestamp": "2026-11-12T11:45:00.000Z"
}
```

---

## API Reference

| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :---: |
| `GET` | `/api/health` | Service health status | No |
| `GET` | `/api/auth/csrf-token` | Issue signed anti-CSRF token | No |
| `POST` | `/api/auth/register` | Patient account creation | No |
| `POST` | `/api/auth/login` | Patient authentication & cookie issuance | No |
| `POST` | `/api/auth/logout` | Session invalidation & cookie clearance | Yes |
| `GET` | `/api/auth/me` | Current authenticated user profile | Yes |
| `GET` | `/api/readings` | Paginated readings list with date/slot filters | Yes |
| `POST` | `/api/readings` | Record new glucose reading (advisory locked) | Yes |
| `GET` | `/api/readings/:id` | Retrieve single reading | Yes |
| `PUT` | `/api/readings/:id` | Update reading (dual-date transaction locked) | Yes |
| `DELETE` | `/api/readings/:id` | Delete reading | Yes |
| `GET` | `/api/reports/daily` | Single-date summary & slot analysis | Yes |
| `GET` | `/api/reports/month-to-date` | MTD aggregation with day breakdowns | Yes |
| `GET` | `/api/reports/monthly` | Full calendar month statistical report | Yes |
| `GET` | `/api/reports/custom` | Custom date-range interval report | Yes |

---

## Security Architecture

1. **Authentication**:
   - `bcryptjs` with 12 salt rounds for password storage.
   - JWT tokens signed with SHA-256 and verified against database `token_version` to permit instant global session revocation.
2. **Cookie Security**:
   - `HttpOnly` flag prevents JavaScript access and XSS theft.
   - `SameSite=Strict` in production prevents cross-site request forgery.
   - `Secure` flag ensures cookies are only transmitted over HTTPS.
3. **CSRF Mitigation**:
   - Double-submit HMAC-signed CSRF tokens with cryptographic timing-safe validation.
   - Dynamic Axios interceptor synchronizes tokens across user sessions.
4. **Data Isolation (Multi-Tenancy)**:
   - All queries enforce `WHERE user_id = $1` at the repository layer using parameterized SQL statements, neutralizing SQL injection and cross-user data leakage.
5. **Concurrency Locks**:
   - Advisory locking (`pg_advisory_xact_lock`) eliminates race conditions during simultaneous reading submissions.
6. **Rate Limiting**:
   - Strict rate limiting on authentication routes (`/api/auth/login`, `/api/auth/register`) preventing brute-force attacks.

---

## Notes

### Assumptions
1. **Standardized Clinical Time Slots**: Blood glucose logging is structured around 4 standard daily clinical slots (`Morning fasting`, `After breakfast`, `After lunch`, and `After dinner`). Each slot allows at most 1 reading per calendar day per patient, with an invariant maximum of 4 readings per day, enforced at both the database schema level (`uq_user_date_slot`) and via transactional advisory locking (`pg_advisory_xact_lock`).
2. **Clinical Glucose Target Range**: In accordance with American Diabetes Association (ADA) clinical guidelines, target thresholds are established as: `Hypoglycemia / Low` (< 70 mg/dL), `In Target / Normal` (70–140 mg/dL), `Elevated` (141–180 mg/dL), and `High` (> 180 mg/dL).
3. **Timezone Awareness (`APP_TIMEZONE`)**: Calendar day boundaries, daily limits, and future-date validations are evaluated against the configured application timezone (defaulting to `Asia/Kolkata` or local system time), preventing client-side clock drift from bypassing daily boundaries.
4. **Monolithic Production Architecture**: In production mode (`NODE_ENV=production`), the Express backend serves compiled Vite static assets (`client/dist`) and handles client-side routing fallbacks from the same origin. This eliminates cross-origin CORS overhead and simplifies cloud hosting.
5. **Stateless JWT Sessions with Server-Side Revocation**: Authentication uses cryptographically signed `HttpOnly`, `SameSite=Strict`, `Secure` session cookies combined with a database `token_version` on the `users` table. This provides stateless token performance while enabling instantaneous global logout and token revocation without requiring an external Redis store.

### Known Limitations
1. **Single Application Timezone**: The system evaluates dates against a global `APP_TIMEZONE` environment setting rather than per-user dynamic timezones.
2. **Fixed Daily Time Slots**: The 4 clinical slots are standardized across the platform; ad-hoc or user-defined custom slot categories (e.g. "Bedtime snack", "Post-exercise") are not currently user-configurable.
3. **Email Verification & Password Reset**: Automated email delivery for email verification and self-service password reset is not included and requires integration with a verified SMTP or transactional email provider (e.g. SendGrid, AWS SES).

### Future Improvements
1. **Direct Clinical Export**: Generate downloadable, clinician-ready reports in PDF, CSV, and HL7/FHIR formats for direct sharing with healthcare providers.
2. **Continuous Glucose Monitor (CGM) Integration**: Webhook and OAuth integration with CGM hardware ecosystems (e.g., Dexcom, Abbott FreeStyle Libre) for automated streaming of real-time sensor glucose data.
3. **Medication & Nutrition Correlation**: Log carbohydrate intake, meals, and insulin dosages alongside glucose readings to provide correlative analytics and insulin sensitivity insights.
4. **Role-Based Provider Portal**: Multi-tenant role separation allowing endocrinologists, physicians, and caregivers to monitor assigned patient cohorts with read-only clinical access.

---

## License

This project is licensed under the [ISC License](LICENSE).
