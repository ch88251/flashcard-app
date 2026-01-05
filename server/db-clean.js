#!/usr/bin/env node
import path from 'path';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dbPath = path.join(repoRoot, 'server', 'flashcards.sqlite');

async function cleanDatabase() {
  console.log('Cleaning SQLite database...');
  
  try {
    const db = new Database(dbPath);
    
    // Get counts before deletion
    const flashcardCount = db.prepare('SELECT COUNT(*) as count FROM flashcards').get();
    const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
    
    console.log(`Found ${flashcardCount.count} flashcards and ${categoryCount.count} categories`);
    
    // Delete all data (flashcards will be cascade deleted when categories are deleted)
    db.prepare('DELETE FROM flashcards').run();
    db.prepare('DELETE FROM categories').run();
    
    // Reset the auto-increment counters (only if sqlite_sequence exists)
    try {
      db.prepare('DELETE FROM sqlite_sequence WHERE name IN (?, ?)').run('flashcards', 'categories');
    } catch (e) {
      // sqlite_sequence may not exist if no auto-increment tables have been used
    }
    
    db.close();
    
    console.log('✅ Database cleaned successfully!');
    console.log('   - All flashcards removed');
    console.log('   - All categories removed');
    console.log('   - ID counters reset');
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  }
}

cleanDatabase();
