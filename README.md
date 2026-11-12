# Sweety – Blood Glucose Tracker

A professional, secure, full-stack blood glucose tracking and reporting web application designed for multi-user management, clinical range validation, and comprehensive statistical analysis.

---

## Features
- **Secure Authentication**: Registration and login using `bcrypt` (12 rounds) with signed, `HttpOnly`, `SameSite` cookies and CSRF protection.
- **Glucose Reading CRUD**: Real-time logging of daily glucose readings with clinical constraints (40–600 mg/dL).
- **Time Slots**: Fasting, After Breakfast, After Lunch, After Dinner.
- **Strict Data Integrity**:
  - Enforced 1 reading per date and time slot.
  - Concurrency-safe limit of 4 readings per day using transactional database locks.
  - Dynamic backend future-date validation.
- **Multi-Period Analytics & Reports**:
  - **Daily Report**: Granular slot breakdown, min, max, average (1 decimal), and count.
  - **Month-to-Date (MTD) Report**: 1st of month to selected date inclusive.
  - **Previous-Month Report**: Complete preceding calendar month with automatic leap-year and variable-month boundary handling.
- **Interactive Visualizations**: Health analytics charts powered by Recharts.
- **Multi-Device Responsive**: Clean healthcare UI tested across mobile (375px), tablet (768px), laptop (1024px), and desktop (1440px).

---

## Tech Stack
- **Frontend**: React 18, Vite, React Router 6, Axios, Recharts, Lucide Icons, CSS3.
- **Backend**: Node.js, Express.js, `node-postgres` (`pg`), `cookie-parser`, `helmet`, `express-rate-limit`.
- **Database**: PostgreSQL 18 with native `gen_random_uuid()` and parameterized queries.
- **Testing**: Vitest / Jest, Supertest, React Testing Library.

---

## Project Structure
```
sweety-blood-glucose-tracker/
├── client/                 # React 18 frontend with Vite
│   ├── src/
│   │   ├── api/            # Centralized Axios client & auth interceptor
│   │   ├── components/     # Reusable UI components & layouts
│   │   ├── context/        # Auth & App context providers
│   │   ├── pages/          # All 12 application pages and views
│   │   └── utils/          # Formatting and date helpers
├── server/                 # Express.js REST API
│   ├── src/
│   │   ├── config/         # Database and environment configurations
│   │   ├── controllers/    # Request/response handlers
│   │   ├── middleware/     # Auth, CSRF, rate-limit, and validation middlewares
│   │   ├── repositories/   # Parameterized SQL database queries
│   │   ├── routes/         # Express API routes
│   │   ├── services/       # Business logic & report calculators
│   │   ├── validators/     # Schema validators
│   │   └── app.js          # Express app entry
│   └── database/
│       ├── migrations/     # Versioned SQL migrations
│       └── seeds/          # Demo seed scripts
├── docs/                   # Architectural & API specifications
├── .github/                # PR templates and workflows
├── .env.example            # Environment template
└── PROGRESS.md             # Development tracking
```

---

## Quickstart & Local Setup

### 1. Prerequisites
- Node.js `v20+` and `npm`
- PostgreSQL `14+` (verified on PostgreSQL 18)
- Git

### 2. Environment Setup
Copy the template to create your local `.env`:
```bash
cp .env.example .env
```
Update `.env` with your local PostgreSQL credentials:
```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/blood_glucose_tracker_db
```

### 3. Database Initialization & Migration
Create the dedicated `blood_glucose_tracker_db` database, apply migrations, and verify schema:
```bash
# Create database (if not already existing)
npm run db:create

# Run versioned schema migrations
npm run migrate

# (Optional) Seed realistic demo records across 3 months
npm run seed

# Verify database tables, constraints, and indexes
npm run db:verify
```

### 4. Demo Account Credentials (Development)
The seed script generates a ready-to-test demo patient:
- **Email**: `demo@sweetyapp.local`
- **Password**: `DemoPassword123!`
- **Sample Data**: 104 readings spanning current month, previous month, and previous year across all 4 time slots.

### 5. Running the Application
```bash
# Install dependencies
npm install
npm --prefix server install
npm --prefix client install

# Start both backend and frontend concurrently
npm run dev
```
- Client runs on `http://localhost:5173`
- Server API runs on `http://localhost:5000`

---

## Testing
```bash
# Run server integration tests
npm run test:server

# Run frontend unit & component tests
npm run test:client

# Run all tests
npm test
```

---

## License
ISC
