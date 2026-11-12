const { query, getClient } = require('../config/db');

async function createReading({ userId, readingDate, timeSlot, glucoseValue }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Transaction-scoped advisory lock for (user_id, reading_date)
    // Prevents concurrent requests from exceeding 4 readings per day limit
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext('reading_limit:' || $1::text || ':' || $2::text));",
      [userId, readingDate]
    );

    // 2. Enforce max 4 readings per day
    const countRes = await client.query(
      'SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2;',
      [userId, readingDate]
    );
    const count = parseInt(countRes.rows[0].count, 10);
    if (count >= 4) {
      const error = new Error('Maximum limit of 4 readings per day reached for this date');
      error.statusCode = 409;
      error.code = 'DAILY_LIMIT_EXCEEDED';
      throw error;
    }

    // 3. Insert reading
    const insertSql = `
      INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
      VALUES ($1, $2, $3, $4)
      RETURNING id, user_id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, time_slot, glucose_value, created_at, updated_at;
    `;
    const res = await client.query(insertSql, [userId, readingDate, timeSlot, glucoseValue]);

    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflictError = new Error(`A reading for '${timeSlot}' on ${readingDate} already exists`);
      conflictError.statusCode = 409;
      conflictError.code = 'SLOT_ALREADY_EXISTS';
      throw conflictError;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function findReadings({ userId, page = 1, limit = 20, startDate, endDate, timeSlot }) {
  const conditions = ['user_id = $1'];
  const values = [userId];
  let paramIdx = 2;

  if (startDate) {
    conditions.push(`reading_date >= $${paramIdx}`);
    values.push(startDate);
    paramIdx++;
  }

  if (endDate) {
    conditions.push(`reading_date <= $${paramIdx}`);
    values.push(endDate);
    paramIdx++;
  }

  if (timeSlot) {
    conditions.push(`time_slot = $${paramIdx}`);
    values.push(timeSlot);
    paramIdx++;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  // 1. Get total count
  const countSql = `SELECT COUNT(*) FROM readings ${whereClause};`;
  const countRes = await query(countSql, values);
  const totalCount = parseInt(countRes.rows[0].count, 10);

  // 2. Get paginated results
  const offset = (page - 1) * limit;
  const selectValues = [...values, limit, offset];
  const selectSql = `
    SELECT 
      id, 
      user_id, 
      to_char(reading_date, 'YYYY-MM-DD') AS reading_date, 
      time_slot, 
      glucose_value, 
      created_at, 
      updated_at
    FROM readings
    ${whereClause}
    ORDER BY 
      reading_date DESC,
      CASE time_slot
        WHEN 'After dinner' THEN 4
        WHEN 'After lunch' THEN 3
        WHEN 'After breakfast' THEN 2
        WHEN 'Morning fasting' THEN 1
        ELSE 0
      END DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1};
  `;

  const rowsRes = await query(selectSql, selectValues);

  return {
    readings: rowsRes.rows,
    totalCount,
    page,
    limit,
    totalPages: Math.ceil(totalCount / limit) || (totalCount === 0 ? 0 : 1),
  };
}

async function findReadingById({ id, userId }) {
  const sql = `
    SELECT 
      id, 
      user_id, 
      to_char(reading_date, 'YYYY-MM-DD') AS reading_date, 
      time_slot, 
      glucose_value, 
      created_at, 
      updated_at
    FROM readings
    WHERE id = $1 AND user_id = $2;
  `;
  const res = await query(sql, [id, userId]);
  return res.rows[0] || null;
}

async function updateReading({ id, userId, readingDate, timeSlot, glucoseValue }) {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // 1. Lock existing reading row
    const checkSql = `
      SELECT id, user_id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, time_slot
      FROM readings
      WHERE id = $1 AND user_id = $2
      FOR UPDATE;
    `;
    const existingRes = await client.query(checkSql, [id, userId]);
    if (existingRes.rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const existing = existingRes.rows[0];

    // 2. If reading_date changed, enforce daily limit of 4 on target date
    if (existing.reading_date !== readingDate) {
      await client.query(
        "SELECT pg_advisory_xact_lock(hashtext('reading_limit:' || $1::text || ':' || $2::text));",
        [userId, readingDate]
      );
      const countRes = await client.query(
        'SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2;',
        [userId, readingDate]
      );
      const count = parseInt(countRes.rows[0].count, 10);
      if (count >= 4) {
        const error = new Error('Maximum limit of 4 readings per day reached for target date');
        error.statusCode = 409;
        error.code = 'DAILY_LIMIT_EXCEEDED';
        throw error;
      }
    }

    // 3. Update row
    const updateSql = `
      UPDATE readings
      SET 
        reading_date = $1, 
        time_slot = $2, 
        glucose_value = $3, 
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $4 AND user_id = $5
      RETURNING id, user_id, to_char(reading_date, 'YYYY-MM-DD') AS reading_date, time_slot, glucose_value, created_at, updated_at;
    `;
    const res = await client.query(updateSql, [readingDate, timeSlot, glucoseValue, id, userId]);

    await client.query('COMMIT');
    return res.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') {
      const conflictError = new Error(`A reading for '${timeSlot}' on ${readingDate} already exists`);
      conflictError.statusCode = 409;
      conflictError.code = 'SLOT_ALREADY_EXISTS';
      throw conflictError;
    }
    throw error;
  } finally {
    client.release();
  }
}

async function deleteReading({ id, userId }) {
  const sql = `
    DELETE FROM readings
    WHERE id = $1 AND user_id = $2
    RETURNING id;
  `;
  const res = await query(sql, [id, userId]);
  return res.rows[0] ? res.rows[0].id : null;
}

module.exports = {
  createReading,
  findReadings,
  findReadingById,
  updateReading,
  deleteReading,
};
