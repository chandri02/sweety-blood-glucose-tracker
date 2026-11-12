# Database Design - Sweety

## Target Database
- **Engine**: PostgreSQL 18.x
- **Database Name**: `blood_glucose_tracker_db`
- **Primary Key Strategy**: Native PostgreSQL `gen_random_uuid()`

---

## Entity Relationship Diagram

```
┌──────────────────────────────────────────────┐
│                    users                     │
├──────────────────────────────────────────────┤
│ id: UUID (PK, gen_random_uuid())             │
│ name: VARCHAR(100) NOT NULL                  │
│ email: VARCHAR(255) NOT NULL UNIQUE          │
│ password_hash: VARCHAR(255) NOT NULL         │
│ created_at: TIMESTAMPTZ DEFAULT NOW()        │
│ updated_at: TIMESTAMPTZ DEFAULT NOW()        │
└──────────────────────┬───────────────────────┘
                       │ 1
                       │
                       │ 0..*
                       ▼
┌──────────────────────────────────────────────┐
│                   readings                   │
├──────────────────────────────────────────────┤
│ id: UUID (PK, gen_random_uuid())             │
│ user_id: UUID NOT NULL (FK -> users.id)      │
│ reading_date: DATE NOT NULL                  │
│ time_slot: reading_time_slot NOT NULL        │
│ glucose_value: INTEGER NOT NULL              │
│ created_at: TIMESTAMPTZ DEFAULT NOW()        │
│ updated_at: TIMESTAMPTZ DEFAULT NOW()        │
└──────────────────────────────────────────────┘
```

---

## Tables & Schema Definition

### 1. `users` Table
Stores authenticated user accounts.

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(LOWER(email));
```

### 2. `readings` Table
Stores glucose measurements for users.

```sql
CREATE TYPE reading_time_slot AS ENUM (
    'Morning fasting',
    'After breakfast',
    'After lunch',
    'After dinner'
);

CREATE TABLE readings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reading_date DATE NOT NULL,
    time_slot reading_time_slot NOT NULL,
    glucose_value INTEGER NOT NULL CHECK (glucose_value >= 40 AND glucose_value <= 600),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_user_date_slot UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX idx_readings_user_date ON readings(user_id, reading_date DESC);
CREATE INDEX idx_readings_user_slot ON readings(user_id, reading_date, time_slot);
```

---

## Constraints & Concurrency Guarantees

1. **Primary Key Generation**:
   - PostgreSQL 13+ standard native `gen_random_uuid()` avoids dependencies on legacy external modules.
2. **Referential Integrity**:
   - `ON DELETE CASCADE` ensures that deleting a user account safely removes all associated readings without orphan rows.
3. **Slot Uniqueness**:
   - `CONSTRAINT uq_user_date_slot UNIQUE (user_id, reading_date, time_slot)` guarantees that a user cannot submit duplicate readings for the same slot on a single date.
4. **Glucose Range**:
   - `CHECK (glucose_value >= 40 AND glucose_value <= 600)` prevents out-of-range clinical readings.
5. **Future Date Validation**:
   - Per requirements, future-date checks are handled explicitly in the backend application layer against the user/server timezone to prevent database clock drift issues and allow clean validation messages.
6. **Maximum 4 Readings Per Day Concurrency Guard**:
   - An explicit database transaction locking mechanism (`pg_advisory_xact_lock` or row-level locking) prevents race conditions from exceeding the 4 readings limit.

---

## Migration 003: Token Revocation & Rollback Considerations

Migration `003_add_user_token_version.sql` adds `token_version INTEGER NOT NULL DEFAULT 1` to `users`.

### Critical Operational Considerations:
1. **Rollback Behavior**:
   - Rolling back `003_add_user_token_version.down.sql` drops the `token_version` column (`ALTER TABLE users DROP COLUMN IF EXISTS token_version;`).
   - This removes the server-side revocation tracking state for all users.
2. **Potential Token Resurrection Risk**:
   - If migration 003 is rolled back and subsequently reapplied on a live database, all users will be re-initialized with `token_version = 1`.
   - Any previously revoked JWT token with `tokenVersion: 1` that has not yet reached its expiration timestamp (`exp`) would become valid again.
3. **Recommended Production Mitigation**:
   - In production or staging environments, if an operational rollback of migration 003 is ever performed, **JWT signing-key rotation (`JWT_SECRET`) must be executed simultaneously**.
   - Rotating `JWT_SECRET` immediately invalidates all previously issued JWT tokens by breaking cryptographic signature verification, preventing any resurrected session vulnerabilities.
