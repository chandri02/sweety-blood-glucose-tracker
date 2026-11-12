const { query } = require('../config/db');

async function findByEmail(email) {
  const sql = `
    SELECT id, name, email, password_hash, token_version, created_at, updated_at
    FROM users
    WHERE LOWER(email) = LOWER($1);
  `;
  const result = await query(sql, [email]);
  return result.rows[0] || null;
}

async function findById(id) {
  const sql = `
    SELECT id, name, email, token_version, created_at, updated_at
    FROM users
    WHERE id = $1;
  `;
  const result = await query(sql, [id]);
  return result.rows[0] || null;
}

async function create({ name, email, passwordHash }) {
  const sql = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, token_version, created_at, updated_at;
  `;
  const result = await query(sql, [name, email, passwordHash]);
  return result.rows[0];
}

async function incrementTokenVersion(id) {
  const sql = `
    UPDATE users
    SET token_version = token_version + 1, updated_at = CURRENT_TIMESTAMP
    WHERE id = $1
    RETURNING token_version;
  `;
  const result = await query(sql, [id]);
  return result.rows[0]?.token_version;
}

module.exports = {
  findByEmail,
  findById,
  create,
  incrementTokenVersion,
};
