const fs = require('fs');
const path = require('path');
const { getClient } = require('../src/config/db');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      version VARCHAR(50) NOT NULL UNIQUE,
      name VARCHAR(255) NOT NULL,
      applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function runUpMigrations() {
  const client = await getClient();
  try {
    await ensureMigrationTable(client);

    const appliedRes = await client.query('SELECT version FROM schema_migrations ORDER BY version ASC;');
    const appliedVersions = new Set(appliedRes.rows.map((r) => r.version));

    const files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith('.sql') && !f.endsWith('.down.sql'))
      .sort();

    let migrationCount = 0;

    for (const file of files) {
      const version = file.split('_')[0];
      if (!appliedVersions.has(version)) {
        console.log(`Applying migration: ${file}...`);
        const filePath = path.join(MIGRATIONS_DIR, file);
        const sql = fs.readFileSync(filePath, 'utf8');

        await client.query('BEGIN');
        try {
          await client.query(sql);
          await client.query(
            'INSERT INTO schema_migrations (version, name) VALUES ($1, $2);',
            [version, file]
          );
          await client.query('COMMIT');
          console.log(`Successfully applied: ${file}`);
          migrationCount++;
        } catch (err) {
          await client.query('ROLLBACK');
          console.error(`Error applying migration ${file}:`, err.message);
          throw err;
        }
      }
    }

    if (migrationCount === 0) {
      console.log('Database schema is already up to date. No new migrations applied.');
    } else {
      console.log(`Applied ${migrationCount} migration(s) successfully.`);
    }
  } finally {
    client.release();
  }
}

async function runDownMigrations() {
  const client = await getClient();
  try {
    await ensureMigrationTable(client);

    const appliedRes = await client.query('SELECT version, name FROM schema_migrations ORDER BY version DESC;');
    if (appliedRes.rows.length === 0) {
      console.log('No applied migrations found to roll back.');
      return;
    }

    const latest = appliedRes.rows[0];
    const downFile = `${latest.version}_${latest.name.replace(`${latest.version}_`, '').replace('.sql', '')}.down.sql`;
    const downFilePath = path.join(MIGRATIONS_DIR, downFile);

    if (!fs.existsSync(downFilePath)) {
      throw new Error(`Down migration file not found: ${downFile}`);
    }

    console.log(`Rolling back migration: ${latest.name} using ${downFile}...`);
    const sql = fs.readFileSync(downFilePath, 'utf8');

    await client.query('BEGIN');
    try {
      await client.query(sql);
      await client.query('DELETE FROM schema_migrations WHERE version = $1;', [latest.version]);
      await client.query('COMMIT');
      console.log(`Successfully rolled back: ${latest.name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Error rolling back migration ${latest.name}:`, err.message);
      throw err;
    }
  } finally {
    client.release();
  }
}

if (require.main === module) {
  const direction = process.argv[2] || 'up';
  const runner = direction === 'down' ? runDownMigrations : runUpMigrations;

  runner()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = {
  runUpMigrations,
  runDownMigrations,
};
