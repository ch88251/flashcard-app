#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { statements } from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const seedDataPath = path.join(__dirname, 'seed-data.json');

async function seedDatabase() {
  console.log('Seeding database...');
  
  // Read seed data
  if (!fs.existsSync(seedDataPath)) {
    console.error(`❌ Error: seed-data.json not found at: ${seedDataPath}`);
    process.exit(1);
  }

  const rawData = fs.readFileSync(seedDataPath, 'utf-8');
  let seedData;
  
  try {
    seedData = JSON.parse(rawData);
  } catch (error) {
    console.error('❌ Error parsing seed-data.json:', error.message);
    process.exit(1);
  }

  if (!seedData.subjects || !Array.isArray(seedData.subjects)) {
    console.error('❌ Error: Invalid seed-data.json format - missing subjects array');
    process.exit(1);
  }

  console.log(`Found ${seedData.subjects.length} subjects to seed`);

  let categoriesAdded = 0;
  let categoriesSkipped = 0;
  let flashcardsAdded = 0;
  let flashcardsSkipped = 0;

  // Process each subject (category)
  for (const subject of seedData.subjects) {
    if (!subject.name) {
      console.warn('⚠️  Skipping subject without name');
      continue;
    }

    let category;
    
    // Try to get existing category or create new one
    try {
      category = await statements.getCategoryByName(subject.name);
      
      if (category) {
        console.log(`Category "${subject.name}" already exists (id: ${category.id})`);
        categoriesSkipped++;
      } else {
        category = await statements.insertCategory(subject.name);
        console.log(`✅ Added category: "${subject.name}" (id: ${category.id})`);
        categoriesAdded++;
      }
    } catch (error) {
      console.error(`❌ Failed to add category "${subject.name}":`, error.message);
      continue;
    }

    // Process flashcards for this category
    if (!subject.cards || !Array.isArray(subject.cards)) {
      console.warn(`⚠️  No cards found for subject "${subject.name}"`);
      continue;
    }

    for (const card of subject.cards) {
      if (!card.front || !card.back) {
        console.warn(`⚠️  Skipping card with missing front or back in "${subject.name}"`);
        flashcardsSkipped++;
        continue;
      }

      try {
        // Check if flashcard already exists (by matching front and category)
        const existingCards = await statements.getFlashcardsByCategory(category.id);
        const duplicate = existingCards.find(f => f.front === card.front);
        
        if (duplicate) {
          flashcardsSkipped++;
          continue;
        }

        const backFormat = card.format || 'sentence';
        const codeLanguage = card.code_language || null;
        
        await statements.insertFlashcard(
          category.id,
          card.front,
          card.back,
          backFormat,
          codeLanguage
        );
        flashcardsAdded++;
      } catch (error) {
        console.error(`❌ Failed to add flashcard "${card.front.substring(0, 40)}...":`, error.message);
        flashcardsSkipped++;
      }
    }
  }

  console.log('\n✅ Seeding completed!');
  console.log(`\nSummary:`);
  console.log(`  Categories: ${categoriesAdded} added, ${categoriesSkipped} skipped`);
  console.log(`  Flashcards: ${flashcardsAdded} added, ${flashcardsSkipped} skipped`);

  // Show final database state
  const finalCategories = await statements.getAllCategories();
  const finalFlashcards = await statements.getAllFlashcards();
  console.log(`\nFinal database state:`);
  console.log(`  Total categories: ${finalCategories.length}`);
  console.log(`  Total flashcards: ${finalFlashcards.length}`);
}

seedDatabase().catch((error) => {
  console.error('\n❌ Seeding failed:', error);
  process.exit(1);
});
