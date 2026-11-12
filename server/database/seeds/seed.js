const bcrypt = require('bcryptjs');
const { query, getClient } = require('../../src/config/db');

async function seed() {
  console.log('Starting database seeding...');
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // 1. Seed Demo User
    const demoEmail = 'demo@sweetyapp.local';
    const demoPassword = 'DemoPassword123!';
    const passwordHash = await bcrypt.hash(demoPassword, 12);

    let userRes = await client.query(
      'SELECT id, name, email FROM users WHERE email = $1;',
      [demoEmail]
    );

    let userId;
    if (userRes.rowCount === 0) {
      const insertUserRes = await client.query(
        `INSERT INTO users (name, email, password_hash)
         VALUES ($1, $2, $3)
         RETURNING id, name, email;`,
        ['Demo Patient', demoEmail, passwordHash]
      );
      userId = insertUserRes.rows[0].id;
      console.log(`Created demo user: ${demoEmail} (ID: ${userId})`);
    } else {
      userId = userRes.rows[0].id;
      console.log(`Demo user already exists: ${demoEmail} (ID: ${userId})`);
    }

    // 2. Generate Realistic Sample Readings
    // Slots: 'Morning fasting', 'After breakfast', 'After lunch', 'After dinner'
    const slots = [
      'Morning fasting',
      'After breakfast',
      'After lunch',
      'After dinner',
    ];

    const sampleData = [];

    // Helper to format YYYY-MM-DD
    const formatDate = (d) => d.toISOString().split('T')[0];

    // Month-to-date readings (November 1 to November 12, 2026)
    const baseDate = new Date(2026, 10, 12); // Nov 12, 2026
    for (let day = 1; day <= 12; day++) {
      const d = new Date(2026, 10, day);
      const dateStr = formatDate(d);

      // Morning fasting: typically 75 - 105 mg/dL
      sampleData.push({
        date: dateStr,
        slot: 'Morning fasting',
        value: 80 + (day % 7) * 3 + (day % 2 === 0 ? 5 : -4),
      });

      // After breakfast: typically 110 - 145 mg/dL
      sampleData.push({
        date: dateStr,
        slot: 'After breakfast',
        value: 120 + (day % 5) * 4 + (day % 3 === 0 ? 8 : -5),
      });

      // After lunch: typically 115 - 150 mg/dL
      sampleData.push({
        date: dateStr,
        slot: 'After lunch',
        value: 125 + (day % 6) * 3 + (day % 2 === 0 ? -6 : 7),
      });

      // After dinner: typically 120 - 155 mg/dL
      sampleData.push({
        date: dateStr,
        slot: 'After dinner',
        value: 130 + (day % 4) * 5 + (day % 2 === 0 ? 4 : -8),
      });
    }

    // Previous month readings (Entire month of October 2026: 31 days)
    for (let day = 1; day <= 31; day++) {
      const d = new Date(2026, 9, day);
      const dateStr = formatDate(d);

      sampleData.push({
        date: dateStr,
        slot: 'Morning fasting',
        value: 85 + (day % 8) * 3,
      });

      if (day % 2 === 0) {
        sampleData.push({
          date: dateStr,
          slot: 'After lunch',
          value: 130 + (day % 7) * 4,
        });
      }

      if (day % 3 === 0) {
        sampleData.push({
          date: dateStr,
          slot: 'After dinner',
          value: 135 + (day % 5) * 3,
        });
      }
    }

    let insertedCount = 0;
    for (const item of sampleData) {
      const res = await client.query(
        `INSERT INTO readings (user_id, reading_date, time_slot, glucose_value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id, reading_date, time_slot) DO NOTHING;`,
        [userId, item.date, item.slot, item.value]
      );
      if (res.rowCount > 0) {
        insertedCount++;
      }
    }

    await client.query('COMMIT');
    console.log(`Seeding complete. Inserted ${insertedCount} new readings for demo user.`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Seeding error:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Fatal seed failure:', err);
      process.exit(1);
    });
}

module.exports = { seed };
