import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

let useKV = false;
let kv = null;
try {
  // Detect Vercel KV environment
  if (process.env.KV_REST_API_URL || process.env.KV_URL) {
    // Lazy require to avoid bundling for local
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    kv = require('@vercel/kv');
    useKV = true;
  }
} catch (_) {
  useKV = false;
}

const dataPath = path.join(process.cwd(), 'server', 'data.json');
const publicDataPath = path.join(process.cwd(), 'public', 'data.json');

async function readData() {
  if (useKV && kv) {
    const categories = (await kv.get('categories')) || [];
    const flashcards = (await kv.get('flashcards')) || [];
    // If KV empty, seed from public/data.json (read-only)
    if ((!categories || categories.length === 0) && (!flashcards || flashcards.length === 0)) {
      try {
        const raw = fs.readFileSync(publicDataPath, 'utf8');
        const parsed = JSON.parse(raw);
        await kv.set('categories', parsed.categories || []);
        await kv.set('flashcards', parsed.flashcards || []);
        return { categories: parsed.categories || [], flashcards: parsed.flashcards || [] };
      } catch (_) {
        return { categories: [], flashcards: [] };
      }
    }
    return { categories, flashcards };
  }
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
}

async function writeData(model) {
  if (useKV && kv) {
    await kv.set('categories', model.categories || []);
    await kv.set('flashcards', model.flashcards || []);
    return;
  }
  fs.writeFileSync(dataPath, JSON.stringify(model, null, 2), 'utf8');
}

function nextId(items) {
  return (items.length ? Math.max(...items.map(i => Number(i.id) || 0)) : 0) + 1;
}

const statements = {

  // Categories
  async insertCategory(name) {
    const model = await readData();
    if (model.categories.some(c => c.name === name)) {
      const err = new Error('Category already exists');
      err.code = 'DUPLICATE';
      throw err;
    }
    const id = nextId(model.categories);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newCategory = { id, name, created_at: now, updated_at: now };
    model.categories.push(newCategory);
    await writeData(model);
    return newCategory;
  },
  async getAllCategories() {
    const model = await readData();
    return model.categories.sort((a, b) => a.name.localeCompare(b.name));
  },
  async getCategoryById(id) {
    const model = await readData();
    return model.categories.find(c => String(c.id) === String(id)) || null;
  },
  async getCategoryByName(name) {
    const model = await readData();
    return model.categories.find(c => c.name === name) || null;
  },
  async updateCategory(id, name) {
    const model = await readData();
    const cat = model.categories.find(c => String(c.id) === String(id));
    if (!cat) return null;
    if (model.categories.some(c => c.name === name && String(c.id) !== String(id))) {
      const err = new Error('Category name already exists');
      err.code = 'DUPLICATE';
      throw err;
    }
    cat.name = name;
    cat.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await writeData(model);
    return cat;
  },
  async deleteCategory(id) {
    const model = await readData();
    const before = model.categories.length;
    model.categories = model.categories.filter(c => String(c.id) !== String(id));
    // Cascade delete flashcards
    model.flashcards = model.flashcards.filter(f => String(f.category_id) !== String(id));
    const changed = before !== model.categories.length;
    if (changed) await writeData(model);
    return changed;
  },

  // Flashcards
  async insertFlashcard(category_id, front, back, back_format) {
    const model = await readData();
    const cat = model.categories.find(c => String(c.id) === String(category_id));
    if (!cat) {
      const err = new Error('Invalid category ID');
      err.code = 'FOREIGN_KEY';
      throw err;
    }
    const id = nextId(model.flashcards);
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const newCard = { id, category_id: Number(category_id), front, back, back_format, created_at: now, updated_at: now };
    model.flashcards.push(newCard);
    await writeData(model);
    return newCard;
  },
  async getAllFlashcards() {
    const model = await readData();
    // attach category_name
    return model.flashcards
      .map(f => ({
        ...f,
        category_name: (model.categories.find(c => c.id === f.category_id) || {}).name
      }))
      .sort((a, b) => {
        const an = a.category_name || '';
        const bn = b.category_name || '';
        return an.localeCompare(bn) || a.id - b.id;
      });
  },
  async getFlashcardsByCategory(categoryId) {
    const model = await readData();
    return model.flashcards
      .filter(f => String(f.category_id) === String(categoryId))
      .map(f => ({
        ...f,
        category_name: (model.categories.find(c => c.id === f.category_id) || {}).name
      }))
      .sort((a, b) => a.id - b.id);
  },
  async getFlashcardsByCategoryName(categoryName) {
    const model = await readData();
    const cat = model.categories.find(c => c.name === categoryName);
    if (!cat) return [];
    return statements.getFlashcardsByCategory(cat.id);
  },
  async getFlashcardById(id) {
    const model = await readData();
    const f = model.flashcards.find(fc => String(fc.id) === String(id));
    if (!f) return null;
    const category_name = (model.categories.find(c => c.id === f.category_id) || {}).name;
    return { ...f, category_name };
  },
  async updateFlashcard(id, front, back, back_format) {
    const model = await readData();
    const f = model.flashcards.find(fc => String(fc.id) === String(id));
    if (!f) return null;
    f.front = front;
    f.back = back;
    f.back_format = back_format;
    f.updated_at = new Date().toISOString().replace('T', ' ').slice(0, 19);
    await writeData(model);
    const category_name = (model.categories.find(c => c.id === f.category_id) || {}).name;
    return { ...f, category_name };
  },
  async deleteFlashcard(id) {
    const model = await readData();
    const before = model.flashcards.length;
    model.flashcards = model.flashcards.filter(fc => String(fc.id) !== String(id));
    const changed = before !== model.flashcards.length;
    if (changed) await writeData(model);
    return changed;
  },
  async countFlashcardsByCategory(categoryId) {
    const model = await readData();
    const count = model.flashcards.filter(f => String(f.category_id) === String(categoryId)).length;
    return { count };
  }
};

export { statements };
