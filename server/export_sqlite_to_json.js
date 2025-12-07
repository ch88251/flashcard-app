#!/usr/bin/env node
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Usage: node server/export_sqlite_to_json.js [sqlitePath] [outputJsonPath]
// Defaults: sqlitePath=/home/chayes/flashcards.db, outputJsonPath=./server/data.json

const sqlitePath = process.argv[2] || '/home/chayes/flashcards.db';
const outputJsonPath = process.argv[3] || path.join(process.cwd(), 'server', 'data.json');

function main() {
  console.log(`Reading SQLite DB from: ${sqlitePath}`);
  const db = new Database(sqlitePath, { readonly: true });

  const categories = db.prepare('SELECT id, name, created_at, updated_at FROM categories ORDER BY id').all();
  const flashcards = db.prepare('SELECT id, category_id, front, back, back_format, created_at, updated_at FROM flashcards ORDER BY id').all();

  const model = { categories, flashcards };

  fs.mkdirSync(path.dirname(outputJsonPath), { recursive: true });
  fs.writeFileSync(outputJsonPath, JSON.stringify(model, null, 2), 'utf8');
  console.log(`JSON data written to: ${outputJsonPath}`);
}

main();
