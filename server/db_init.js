#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { Client } from 'pg';

// Load .env.local first for Neon, then .env
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

const ddl = `
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
`;

async function run() {
  const config = process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.PGHOST || 'localhost',
        port: Number(process.env.PGPORT || 5432),
        user: process.env.PGUSER || 'flashcards',
        password: process.env.PGPASSWORD || 'flashcards',
        database: process.env.PGDATABASE || 'flashcards',
      };

  const client = new Client(config);
  try {
    await client.connect();
    await client.query(ddl);
    console.log('Postgres schema initialized/verified.');
  } finally {
    await client.end();
  }
}

run().catch((e) => {
  console.error('db init failed:', e.message);
  process.exitCode = 1;
});
