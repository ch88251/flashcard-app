import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'server', 'flashcards.sqlite');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS flashcards (
    id INTEGER PRIMARY KEY,
    category_id INTEGER NOT NULL,
    front TEXT NOT NULL,
    back TEXT NOT NULL,
    back_format TEXT DEFAULT 'sentence' CHECK (back_format IN ('sentence', 'list', 'code')),
    code_language TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

function nowTS() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

const statements = {

  // Categories
  async insertCategory(name) {
    const ts = nowTS();
    try {
      const stmt = db.prepare('INSERT INTO categories (name, created_at, updated_at) VALUES (?, ?, ?)');
      const info = stmt.run(name, ts, ts);
      return { id: info.lastInsertRowid, name, created_at: ts, updated_at: ts };
    } catch (err) {
      if (String(err.message).includes('UNIQUE')) {
        const e = new Error('Category already exists');
        e.code = 'DUPLICATE';
        throw e;
      }
      throw err;
    }
  },
  async getAllCategories() {
    return db.prepare('SELECT id, name, created_at, updated_at FROM categories ORDER BY name').all();
  },
  async getCategoryById(id) {
    return db.prepare('SELECT id, name, created_at, updated_at FROM categories WHERE id = ?').get(id) || null;
  },
  async getCategoryByName(name) {
    return db.prepare('SELECT id, name, created_at, updated_at FROM categories WHERE name = ?').get(name) || null;
  },
  async updateCategory(id, name) {
    const ts = nowTS();
    const existing = db.prepare('SELECT id FROM categories WHERE name = ? AND id <> ?').get(name, id);
    if (existing) {
      const err = new Error('Category name already exists');
      err.code = 'DUPLICATE';
      throw err;
    }
    const info = db.prepare('UPDATE categories SET name = ?, updated_at = ? WHERE id = ?').run(name, ts, id);
    if (info.changes === 0) return null;
    return db.prepare('SELECT id, name, created_at, updated_at FROM categories WHERE id = ?').get(id);
  },
  async deleteCategory(id) {
    const info = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    return info.changes > 0;
  },

  // Flashcards
  async insertFlashcard(category_id, front, back, back_format, code_language) {
    const ts = nowTS();
    try {
      const stmt = db.prepare(`
        INSERT INTO flashcards (category_id, front, back, back_format, code_language, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(Number(category_id), front, back, back_format, code_language || null, ts, ts);
      const row = db.prepare('SELECT id, category_id, front, back, back_format, code_language, created_at, updated_at FROM flashcards WHERE id = ?').get(info.lastInsertRowid);
      return row;
    } catch (err) {
      if (String(err.message).includes('FOREIGN KEY')) {
        const e = new Error('Invalid category ID');
        e.code = 'FOREIGN_KEY';
        throw e;
      }
      throw err;
    }
  },
  async getAllFlashcards() {
    const rows = db.prepare(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      ORDER BY c.name ASC, f.id ASC
    `).all();
    return rows;
  },
  async getFlashcardsByCategory(categoryId) {
    const rows = db.prepare(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.category_id = ?
      ORDER BY f.id ASC
    `).all(categoryId);
    return rows;
  },
  async getFlashcardsByCategoryName(categoryName) {
    const cat = db.prepare('SELECT id FROM categories WHERE name = ?').get(categoryName);
    if (!cat) return [];
    return statements.getFlashcardsByCategory(cat.id);
  },
  async getFlashcardById(id) {
    return db.prepare(`
      SELECT f.id, f.category_id, f.front, f.back, f.back_format, f.code_language, f.created_at, f.updated_at,
             c.name AS category_name
      FROM flashcards f
      LEFT JOIN categories c ON c.id = f.category_id
      WHERE f.id = ?
    `).get(id) || null;
  },
  async updateFlashcard(id, front, back, back_format, code_language) {
    const ts = nowTS();
    const info = db.prepare(`
      UPDATE flashcards
      SET front = ?, back = ?, back_format = ?, code_language = ?, updated_at = ?
      WHERE id = ?
    `).run(front, back, back_format, code_language || null, ts, id);
    if (info.changes === 0) return null;
    return statements.getFlashcardById(id);
  },
  async deleteFlashcard(id) {
    const info = db.prepare('DELETE FROM flashcards WHERE id = ?').run(id);
    return info.changes > 0;
  },
  async countFlashcardsByCategory(categoryId) {
    const row = db.prepare('SELECT COUNT(*) as count FROM flashcards WHERE category_id = ?').get(categoryId);
    return { count: row.count };
  }
};

export { statements };
