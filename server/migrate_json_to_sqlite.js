#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { statements } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const dataJsonPath = path.join(repoRoot, 'public', 'data.json');

async function migrate() {
  console.log('Starting migration from data.json to database...');
  
  // Read data.json
  if (!fs.existsSync(dataJsonPath)) {
    console.error('Error: data.json not found at:', dataJsonPath);
    process.exit(1);
  }

  const rawData = fs.readFileSync(dataJsonPath, 'utf-8');
  const data = JSON.parse(rawData);

  if (!data.categories || !Array.isArray(data.categories)) {
    console.error('Error: Invalid data.json format - missing categories array');
    process.exit(1);
  }

  if (!data.flashcards || !Array.isArray(data.flashcards)) {
    console.error('Error: Invalid data.json format - missing flashcards array');
    process.exit(1);
  }

  console.log(`Found ${data.categories.length} categories and ${data.flashcards.length} flashcards`);

  // Get existing categories to avoid duplicates
  const existingCategories = await statements.getAllCategories();
  const existingCategoryMap = new Map(existingCategories.map(c => [c.name, c]));

  // Migrate categories
  const categoryIdMap = new Map(); // old ID -> new ID or existing ID
  let categoriesAdded = 0;
  let categoriesSkipped = 0;

  for (const category of data.categories) {
    const existing = existingCategoryMap.get(category.name);
    if (existing) {
      console.log(`Category "${category.name}" already exists (id: ${existing.id}), skipping...`);
      categoryIdMap.set(category.id, existing.id);
      categoriesSkipped++;
    } else {
      try {
        const newCat = await statements.insertCategory(category.name);
        categoryIdMap.set(category.id, newCat.id);
        console.log(`Added category: ${category.name} (id: ${newCat.id})`);
        categoriesAdded++;
      } catch (error) {
        console.error(`Failed to add category "${category.name}":`, error.message);
        // Try to get it again in case of race condition
        const retry = await statements.getCategoryByName(category.name);
        if (retry) {
          categoryIdMap.set(category.id, retry.id);
          categoriesSkipped++;
        }
      }
    }
  }

  console.log(`\nCategories: ${categoriesAdded} added, ${categoriesSkipped} skipped`);

  // Get existing flashcards to check for duplicates
  const existingFlashcards = await statements.getAllFlashcards();
  const existingFlashcardSet = new Set(
    existingFlashcards.map(f => `${f.category_id}:${f.front}:${f.back}`)
  );

  // Migrate flashcards
  let flashcardsAdded = 0;
  let flashcardsSkipped = 0;

  for (const flashcard of data.flashcards) {
    const newCategoryId = categoryIdMap.get(flashcard.category_id);
    
    if (!newCategoryId) {
      console.error(`Skipping flashcard - category_id ${flashcard.category_id} not found`);
      flashcardsSkipped++;
      continue;
    }

    // Check for duplicates based on category_id, front, and back
    const flashcardKey = `${newCategoryId}:${flashcard.front}:${flashcard.back}`;
    if (existingFlashcardSet.has(flashcardKey)) {
      flashcardsSkipped++;
      continue;
    }

    try {
      await statements.insertFlashcard(
        newCategoryId,
        flashcard.front,
        flashcard.back,
        flashcard.back_format || 'sentence',
        flashcard.code_language || null
      );
      existingFlashcardSet.add(flashcardKey);
      flashcardsAdded++;
    } catch (error) {
      console.error(`Failed to add flashcard "${flashcard.front.substring(0, 50)}...":`, error.message);
      flashcardsSkipped++;
    }
  }

  console.log(`\nFlashcards: ${flashcardsAdded} added, ${flashcardsSkipped} skipped`);
  console.log('\n✅ Migration completed successfully!');
  
  // Summary
  const finalCategories = await statements.getAllCategories();
  const finalFlashcards = await statements.getAllFlashcards();
  console.log(`\nFinal database state:`);
  console.log(`  Total categories: ${finalCategories.length}`);
  console.log(`  Total flashcards: ${finalFlashcards.length}`);
}

migrate().catch((error) => {
  console.error('\n❌ Migration failed:', error);
  process.exit(1);
});
