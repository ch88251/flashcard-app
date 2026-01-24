#!/usr/bin/env node
import dotenv from 'dotenv';
import path from 'path';
import { pool } from './database.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

async function cleanDatabase() {
  console.log('Cleaning PostgreSQL database...');
  
  const client = await pool.connect();
  try {
    // Get counts before deletion
    const flashcardResult = await client.query('SELECT COUNT(*) as count FROM flashcards');
    const categoryResult = await client.query('SELECT COUNT(*) as count FROM categories');
    
    console.log(`Found ${flashcardResult.rows[0].count} flashcards and ${categoryResult.rows[0].count} categories`);
    
    // Delete all data (flashcards will be cascade deleted when categories are deleted)
    await client.query('DELETE FROM flashcards');
    await client.query('DELETE FROM categories');
    
    // Reset the auto-increment sequences
    await client.query('ALTER SEQUENCE flashcards_id_seq RESTART WITH 1');
    await client.query('ALTER SEQUENCE categories_id_seq RESTART WITH 1');
    
    console.log('✅ Database cleaned successfully!');
    console.log('   - All flashcards removed');
    console.log('   - All categories removed');
    console.log('   - ID sequences reset');
  } catch (error) {
    console.error('❌ Error cleaning database:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDatabase();
