# API Documentation - Sweety

All API requests and responses utilize standard JSON format. All protected endpoints require a valid HttpOnly session cookie and an Anti-CSRF token header (`X-CSRF-Token`).

## Base URL
`/api`

---

## 1. Authentication Endpoints

### Register User
- **POST** `/auth/register`
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `201 Created`: User registered successfully. Set-Cookie header issued.
  - `400 Bad Request`: Validation failure (weak password, invalid email format, missing fields).
  - `409 Conflict`: Email already registered.

### Login User
- **POST** `/auth/login`
- **Request Body**:
  ```json
  {
    "email": "jane@example.com",
    "password": "Password123!"
  }
  ```
- **Responses**:
  - `200 OK`: Login successful. Set-Cookie header issued with HttpOnly session token.
  - `401 Unauthorized`: Invalid credentials.

### Logout User
- **POST** `/auth/logout`
- **Responses**:
  - `200 OK`: Session cookie cleared.

### Get Current User Profile
- **GET** `/auth/me`
- **Responses**:
  - `200 OK`: Returns authenticated user info `{ id, name, email }`.
  - `401 Unauthorized`: Unauthenticated.

### Get CSRF Token
- **GET** `/auth/csrf-token`
- **Responses**:
  - `200 OK`: Returns `{ csrfToken: "..." }` and sets anti-CSRF cookie.

---

## 2. Glucose Reading Endpoints

### Create Reading
- **POST** `/readings`
- **Request Body**:
  ```json
  {
    "reading_date": "2026-11-12",
    "time_slot": "Morning fasting",
    "glucose_value": 95
  }
  ```
- **Responses**:
  - `201 Created`: Reading recorded.
  - `400 Bad Request`: Validation failure (out of range, future date, invalid slot).
  - `409 Conflict`: Duplicate slot on date or maximum 4 readings reached for date.

### List Readings
- **GET** `/readings?page=1&limit=20&startDate=...&endDate=...`
- **Responses**:
  - `200 OK`: Returns `{ readings: [...], totalCount: 42, page: 1, limit: 20 }`.

### Get Single Reading
- **GET** `/readings/:id`
- **Responses**:
  - `200 OK`: Reading record.
  - `404 Not Found`: Reading does not exist or does not belong to the user.

### Update Reading
- **PUT** `/readings/:id`
- **Request Body**:
  ```json
  {
    "reading_date": "2026-11-12",
    "time_slot": "After breakfast",
    "glucose_value": 128
  }
  ```
- **Responses**:
  - `200 OK`: Updated reading record.
  - `400 Bad Request`: Invalid input or future date.
  - `409 Conflict`: Slot conflict.
  - `404 Not Found`: Reading not found / unauthorized.

### Delete Reading
- **DELETE** `/readings/:id`
- **Responses**:
  - `200 OK`: `{ message: "Reading deleted successfully" }`.
  - `404 Not Found`: Reading not found / unauthorized.

---

## 3. Reports Endpoints

### Daily Report
- **GET** `/reports/daily?date=YYYY-MM-DD`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "date": "2026-11-12",
      "highest": 140,
      "lowest": 88,
      "average": 112.5,
      "totalReadings": 4,
      "readings": [...]
    }
    ```

### Month-to-Date Report
- **GET** `/reports/month-to-date?date=YYYY-MM-DD`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "startDate": "2026-11-01",
      "endDate": "2026-11-12",
      "highest": 165,
      "lowest": 78,
      "average": 115.3,
      "totalReadings": 38,
      "dailyBreakdown": [...]
    }
    ```

### Previous-Month Report
- **GET** `/reports/monthly?date=YYYY-MM-DD`
- **Responses**:
  - `200 OK`:
    ```json
    {
      "month": "2026-10",
      "startDate": "2026-10-01",
      "endDate": "2026-10-31",
      "highest": 182,
      "lowest": 72,
      "average": 118.7,
      "totalReadings": 112,
      "dailyBreakdown": [...]
    }
    ```
