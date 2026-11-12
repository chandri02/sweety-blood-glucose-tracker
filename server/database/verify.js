const { query, closePool } = require('../src/config/db');

async function verify() {
  console.log('=== TABLES IN blood_glucose_tracker_db ===');
  const tables = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.table(tables.rows);

  console.log('=== CONSTRAINTS ===');
  const constraints = await query(`
    SELECT conname, contype, conrelid::regclass AS table_name, pg_get_constraintdef(c.oid) AS definition
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
    ORDER BY table_name, conname;
  `);
  console.table(constraints.rows);

  console.log('=== INDEXES ===');
  const indexes = await query(`
    SELECT indexname, tablename, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  `);
  console.table(indexes.rows);

  console.log('=== ROW COUNTS ===');
  const migCount = await query('SELECT count(*) FROM schema_migrations;');
  const userCount = await query('SELECT count(*) FROM users;');
  const readCount = await query('SELECT count(*) FROM readings;');
  console.log({
    schema_migrations: parseInt(migCount.rows[0].count, 10),
    users: parseInt(userCount.rows[0].count, 10),
    readings: parseInt(readCount.rows[0].count, 10),
  });

  console.log('=== DEMO USER RECORD ===');
  const user = await query('SELECT id, name, email, created_at FROM users WHERE email = $1;', ['demo@sweetyapp.local']);
  console.log(user.rows[0]);

  console.log('=== RECENT READINGS SAMPLE ===');
  const sampleReadings = await query(
    'SELECT id, reading_date::text, time_slot, glucose_value FROM readings ORDER BY reading_date DESC, time_slot LIMIT 5;'
  );
  console.table(sampleReadings.rows);

  await closePool();
}

verify().catch((err) => {
  console.error(err);
  process.exit(1);
});
