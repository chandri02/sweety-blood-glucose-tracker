# System Architecture - Sweety

## 1. High-Level Architecture Overview
Sweety is built following a clean, modular **three-tier architecture**:

```
[ Presentation Layer ]  React 18 + Vite (SPA)
         │  ▲
         │  │ HTTPS + RESTful JSON
         ▼  │ HttpOnly Cookie Auth + Anti-CSRF Header
[ Application Layer ]   Node.js + Express.js API
         │  ▲
         │  │ Parameterized SQL + Connection Pooling (pg)
         ▼  │ Transaction Locks (SELECT ... FOR UPDATE)
[ Data Storage Layer ]  PostgreSQL 18 (blood_glucose_tracker_db)
```

## 2. Key Architecture Principles

1. **Separation of Concerns**:
   - **Routes**: Expose API endpoints and bind middlewares.
   - **Middlewares**: Enforce authentication session verification, CSRF token validation, request payload schema validation, rate-limiting, and error handling.
   - **Controllers**: Parse input, invoke service routines, map response schemas with HTTP status codes.
   - **Services**: Coordinate business operations, calculate reporting intervals, and enforce multi-step business policies.
   - **Repositories**: Encapsulate all direct database queries using parameterized SQL statements.

2. **Security by Design**:
   - **Authentication**: JWT tokens stored in signed, `HttpOnly`, `SameSite=Lax` (or `Strict`), `Secure` cookies. JavaScript running on the client cannot access the session token, defending against XSS credential theft.
   - **CSRF Defense**: Double-submit cookie / custom Anti-CSRF token verified on state-changing requests (`POST`, `PUT`, `DELETE`).
   - **Data Isolation**: The user identity is extracted purely from the verified server-side session. No client-supplied `user_id` is trusted.
   - **SQL Injection Prevention**: 100% parameterized queries via `node-postgres` (`pg`).
   - **Defense in Depth**: Database constraints combined with backend validation.

3. **Concurrency & Data Integrity**:
   - Max 4 readings per user per day is enforced via transactional concurrency control (`BEGIN ... SELECT count ... FOR UPDATE ... INSERT ... COMMIT`) ensuring parallel submissions cannot violate the business threshold.
   - Unique composite constraint `(user_id, reading_date, time_slot)` guarantees slot uniqueness at the storage engine level.
   - Future date restriction enforced dynamically in backend service logic relative to current date and timezone.

4. **Frontend Architecture**:
   - Component-driven design using React 18 and Vite.
   - Centralized API client (Axios) with automatic cookie transmission (`withCredentials: true`) and CSRF header attachment.
   - Protected route guards redirect unauthenticated users to `/login`.
   - Recharts library for health data visualization.
