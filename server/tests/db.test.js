const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { pool, query, getClient, closePool } = require('../src/config/db');
const { runUpMigrations } = require('../database/migrate');

describe('PostgreSQL Database Schema & Constraint Verification', () => {
  let testUserId1;
  let testUserId2;

  before(async () => {
    // Ensure migrations are applied
    await runUpMigrations();

    // Clean up any existing test user accounts
    await query("DELETE FROM users WHERE email IN ('test1@sweetytest.local', 'test2@sweetytest.local');");

    // Insert test user 1
    const res1 = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email;`,
      ['Test User 1', 'test1@sweetytest.local', '$2a$12$fakeHashForDbSchemaTestingOnly001']
    );
    testUserId1 = res1.rows[0].id;

    // Insert test user 2
    const res2 = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, name, email;`,
      ['Test User 2', 'test2@sweetytest.local', '$2a$12$fakeHashForDbSchemaTestingOnly002']
    );
    testUserId2 = res2.rows[0].id;
  });

  after(async () => {
    if (testUserId1 || testUserId2) {
      await query("DELETE FROM users WHERE email IN ('test1@sweetytest.local', 'test2@sweetytest.local');");
    }
    await closePool();
  });

  test('Database connection pool is active and operational', async () => {
    const res = await query('SELECT 1 + 1 AS sum;');
    assert.strictEqual(res.rows[0].sum, 2);
  });

  test('Primary keys use PostgreSQL native gen_random_uuid()', async () => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    assert.match(testUserId1, uuidRegex, 'User 1 ID should be a valid RFC 4122 UUID');
    assert.match(testUserId2, uuidRegex, 'User 2 ID should be a valid RFC 4122 UUID');
  });

  test('Users table enforces unique email constraint', async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO users (name, email, password_hash)
           VALUES ($1, $2, $3);`,
          ['Duplicate User', 'test1@sweetytest.local', 'hash']
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23505', 'Should throw unique_violation error');
        return true;
      }
    );
  });

  test('Users table enforces case-insensitive unique email index', async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO users (name, email, password_hash)
           VALUES ($1, $2, $3);`,
          ['Upper Duplicate User', 'TEST1@SWEETYTEST.LOCAL', 'hash']
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23505', 'Should throw unique_violation for case-insensitive duplicate');
        return true;
      }
    );
  });

  test('Readings table successfully inserts valid readings across all 4 time slots', async () => {
    const slots = ['Morning fasting', 'After breakfast', 'After lunch', 'After dinner'];
    const date = '2026-11-10';

    for (const [index, slot] of slots.entries()) {
      const res = await query(
        `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
         VALUES ($1, $2, $3, $4)
         RETURNING id, time_slot, glucose_value;`,
        [testUserId1, date, slot, 90 + index * 15]
      );
      assert.strictEqual(res.rows[0].time_slot, slot);
      assert.strictEqual(res.rows[0].glucose_value, 90 + index * 15);
    }

    const countRes = await query(
      'SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2;',
      [testUserId1, date]
    );
    assert.strictEqual(parseInt(countRes.rows[0].count, 10), 4);
  });

  test('Readings table enforces clinical range: rejects glucose_value < 40', async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, '2026-11-11', 'Morning fasting', 39);`,
          [testUserId1]
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23514', 'Should throw check_violation error for value < 40');
        return true;
      }
    );
  });

  test('Readings table enforces clinical range: rejects glucose_value > 600', async () => {
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, '2026-11-11', 'Morning fasting', 601);`,
          [testUserId1]
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23514', 'Should throw check_violation error for value > 600');
        return true;
      }
    );
  });

  test('Readings table enforces unique slot per date constraint: rejects duplicate slot', async () => {
    const date = '2026-11-09';
    await query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, 'Morning fasting', 100);`,
      [testUserId1, date]
    );

    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, $2, 'Morning fasting', 110);`,
          [testUserId1, date]
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23505', 'Should throw unique_violation error on duplicate slot');
        return true;
      }
    );
  });

  test('Multi-tenant isolation: different users can record readings for the same date and slot', async () => {
    const date = '2026-11-08';
    const res1 = await query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, 'Morning fasting', 95) RETURNING id;`,
      [testUserId1, date]
    );
    const res2 = await query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, $2, 'Morning fasting', 105) RETURNING id;`,
      [testUserId2, date]
    );

    assert.ok(res1.rows[0].id);
    assert.ok(res2.rows[0].id);
    assert.notStrictEqual(res1.rows[0].id, res2.rows[0].id);
  });

  test('Referential integrity: rejects readings for non-existent users', async () => {
    const fakeUserId = '00000000-0000-0000-0000-000000000000';
    await assert.rejects(
      async () => {
        await query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, '2026-11-07', 'Morning fasting', 100);`,
          [fakeUserId]
        );
      },
      (err) => {
        assert.strictEqual(err.code, '23503', 'Should throw foreign_key_violation error');
        return true;
      }
    );
  });

  test('Referential integrity: ON DELETE CASCADE removes associated readings when user is deleted', async () => {
    const tempUserRes = await query(
      `INSERT INTO users (name, email, password_hash)
       VALUES ('Temp User', 'temp@sweetytest.local', 'hash')
       RETURNING id;`
    );
    const tempUserId = tempUserRes.rows[0].id;

    await query(
      `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
       VALUES ($1, '2026-11-06', 'Morning fasting', 98);`,
      [tempUserId]
    );

    const beforeDelete = await query('SELECT COUNT(*) FROM readings WHERE user_id = $1;', [tempUserId]);
    assert.strictEqual(parseInt(beforeDelete.rows[0].count, 10), 1);

    await query('DELETE FROM users WHERE id = $1;', [tempUserId]);

    const afterDelete = await query('SELECT COUNT(*) FROM readings WHERE user_id = $1;', [tempUserId]);
    assert.strictEqual(parseInt(afterDelete.rows[0].count, 10), 0);
  });

  test('Concurrency protection: transactional lock prevents race condition beyond 4 readings/day', async () => {
    const date = '2026-11-05';

    // Helper simulating atomic transactional insertion with advisory xact lock
    async function insertReadingWithLock(userId, readingDate, slot, value) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Acquire transaction-scoped advisory lock for (user_id, reading_date)
        // Automatically released on COMMIT or ROLLBACK
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
          await client.query('ROLLBACK');
          const err = new Error('Daily limit of 4 readings reached');
          err.code = 'LIMIT_REACHED';
          throw err;
        }

        const insertRes = await client.query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, $2, $3, $4)
           RETURNING id;`,
          [userId, readingDate, slot, value]
        );

        await client.query('COMMIT');
        return insertRes.rows[0].id;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    // Insert 4 readings
    await insertReadingWithLock(testUserId1, date, 'Morning fasting', 90);
    await insertReadingWithLock(testUserId1, date, 'After breakfast', 130);
    await insertReadingWithLock(testUserId1, date, 'After lunch', 125);
    await insertReadingWithLock(testUserId1, date, 'After dinner', 135);

    // Attempting a 5th insertion with concurrency lock must be rejected
    await assert.rejects(
      async () => {
        await insertReadingWithLock(testUserId1, date, 'Morning fasting', 100);
      },
      (err) => {
        assert.strictEqual(err.code, 'LIMIT_REACHED', 'Should safely reject 5th reading under transaction lock');
        return true;
      }
    );
  });

  test('Concurrency protection under parallel race conditions: Promise.all rejects excess insertions', async () => {
    const raceDate = '2026-11-04';
    const slots = ['Morning fasting', 'After breakfast', 'After lunch', 'After dinner'];

    async function insertReadingWithLock(userId, readingDate, slot, value) {
      const client = await getClient();
      try {
        await client.query('BEGIN');

        // Transaction-scoped advisory lock serializes parallel transactions for this (userId, readingDate)
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
          await client.query('ROLLBACK');
          const err = new Error('Daily limit of 4 readings reached');
          err.code = 'LIMIT_REACHED';
          throw err;
        }

        const insertRes = await client.query(
          `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
           VALUES ($1, $2, $3, $4)
           RETURNING id;`,
          [userId, readingDate, slot, value]
        );

        await client.query('COMMIT');
        return insertRes.rows[0].id;
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    // Launch 6 simultaneous parallel insert requests for the same user and date
    // 4 use distinct valid slots (Morning fasting, After breakfast, After lunch, After dinner)
    // 2 are extra attempts competing at the same instant
    const parallelRequests = [
      insertReadingWithLock(testUserId2, raceDate, slots[0], 95),
      insertReadingWithLock(testUserId2, raceDate, slots[1], 120),
      insertReadingWithLock(testUserId2, raceDate, slots[2], 130),
      insertReadingWithLock(testUserId2, raceDate, slots[3], 140),
      insertReadingWithLock(testUserId2, raceDate, slots[0], 150), // 5th attempt
      insertReadingWithLock(testUserId2, raceDate, slots[1], 160), // 6th attempt
    ];

    const results = await Promise.allSettled(parallelRequests);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter((r) => r.status === 'rejected');

    assert.strictEqual(fulfilled.length, 4, 'Exactly 4 parallel requests must succeed');
    assert.strictEqual(rejected.length, 2, 'Exactly 2 excess parallel requests must be rejected');

    for (const rej of rejected) {
      assert.ok(
        rej.reason.code === 'LIMIT_REACHED' || rej.reason.code === '23505',
        `Rejection reason must be LIMIT_REACHED or unique constraint violation, got ${rej.reason.code}`
      );
    }

    // Verify DB count
    const finalCountRes = await query(
      'SELECT COUNT(*) FROM readings WHERE user_id = $1 AND reading_date = $2;',
      [testUserId2, raceDate]
    );
    assert.strictEqual(
      parseInt(finalCountRes.rows[0].count, 10),
      4,
      'Final count in database must strictly be 4'
    );
  });
});
