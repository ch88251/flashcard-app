import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
const { Pool } = pg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL connection configuration
const config = process.env.DATABASE_URL
  ? { 
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'flashcards',
      password: process.env.PGPASSWORD || 'flashcards',
      database: process.env.PGDATABASE || 'flashcards',
    };

const pool = new Pool(config);

// Initialize database schema
async function initializeDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS flashcards (
        id SERIAL PRIMARY KEY,
        category_id INTEGER NOT NULL,
        front TEXT NOT NULL,
        back TEXT NOT NULL,
        back_format TEXT DEFAULT 'sentence' CHECK (back_format IN ('sentence', 'list', 'code')),
        code_language TEXT,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
      );
    `);
  } finally {
    client.release();
  }
}

// Initialize the database when module is loaded
await initializeDatabase();

function nowTS() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const statements = {

  // Categories
  async insertCategory(name) {
    const ts = nowTS();
    try {
      const result = await pool.query(
        'INSERT INTO categories (name, created_at, updated_at) VALUES ($1, $2, $3) RETURNING *',
        [name, ts, ts]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') { // PostgreSQL unique violation error code
        const e = new Error('Category already exists');
        e.code = 'DUPLICATE';
        throw e;
      }
      throw err;
    }
  },
  async getAllCategories() {
    const result = await pool.query('SELECT id, name, created_at, updated_at FROM categories ORDER BY name');
    return result.rows;
  },
  async getCategoryById(id) {
    const result = await pool.query('SELECT id, name, created_at, updated_at FROM categories WHERE id = $1', [id]);
    return result.rows[0] || null;
  },
  async getCategoryByName(name) {
    const result = await pool.query('SELECT id, name, created_at, updated_at FROM categories WHERE name = $1', [name]);
    return result.rows[0] || null;
  },
  async updateCategory(id, name) {
    const ts = nowTS();
    const existing = await pool.query('SELECT id FROM categories WHERE name = $1 AND id <> $2', [name, id]);
    if (existing.rows.length > 0) {
      const err = new Error('Category name already exists');
      err.code = 'DUPLICATE';
      throw err;
    }
    const result = await pool.query(
      'UPDATE categories SET name = $1, updated_at = $2 WHERE id = $3 RETURNING *',
      [name, ts, id]
    );
    return result.rows[0] || null;
  },
  async deleteCategory(id) {
    const result = await pool.query('DELETE FROM categories WHERE id = $1', [id]);
    return result.rowCount > 0;
  },

  // Flashcards
  async insertFlashcard(category_id, front, back, back_format, code_language) {
    const ts = nowTS();
    try {
      const result = await pool.query(
        `INSERT INTO flashcards (category_id, front, back, back_format, code_language, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [Number(category_id), front, back, back_format, code_language || null, ts, ts]
      );
      return result.rows[0];
    } catch (err) {
      if (err.code === '23503') { // PostgreSQL foreign key violation error code
        const e = new Error('Invalid category ID');
        e.code = 'FOREIGN_KEY';
        throw e;
      }
      throw err;
    }
  },
  async getAllFlashcards() {
    const result = await pool.query(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      ORDER BY c.name ASC, f.id ASC
    `);
    return result.rows;
  },
  async getFlashcardsByCategory(categoryId) {
    const result = await pool.query(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.category_id = $1
      ORDER BY f.id ASC
    `, [categoryId]);
    return result.rows;
  },
  async getFlashcardsByCategoryName(categoryName) {
    const catResult = await pool.query('SELECT id FROM categories WHERE name = $1', [categoryName]);
    if (catResult.rows.length === 0) return [];
    return statements.getFlashcardsByCategory(catResult.rows[0].id);
  },
  async getFlashcardById(id) {
    const result = await pool.query(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.id = $1
    `, [id]);
    return result.rows[0] || null;
  },
  async updateFlashcard(id, front, back, back_format, code_language) {
    const ts = nowTS();
    const result = await pool.query(
      `UPDATE flashcards
       SET front = $1, back = $2, back_format = $3, code_language = $4, updated_at = $5
       WHERE id = $6 RETURNING *`,
      [front, back, back_format, code_language || null, ts, id]
    );
    if (result.rowCount === 0) return null;
    return statements.getFlashcardById(id);
  },
  async deleteFlashcard(id) {
    const result = await pool.query('DELETE FROM flashcards WHERE id = $1', [id]);
    return result.rowCount > 0;
  },
  async countFlashcardsByCategory(categoryId) {
    const result = await pool.query('SELECT COUNT(*) as count FROM flashcards WHERE category_id = $1', [categoryId]);
    return { count: parseInt(result.rows[0].count) };
  }
};

export { statements, pool };
