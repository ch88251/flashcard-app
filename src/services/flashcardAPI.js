const DATA_URL = '/data.json';

let cachePromise;
async function loadData() {
  if (!cachePromise) {
    cachePromise = fetch(DATA_URL).then(async (res) => {
      if (!res.ok) throw new Error('Failed to load data.json');
      const data = await res.json();
      const base = {
        categories: Array.isArray(data.categories) ? data.categories : [],
        flashcards: Array.isArray(data.flashcards) ? data.flashcards : [],
      };
      // Merge overlay from localStorage if present
      let overCats = [];
      let overCards = [];
      try {
        const raw = localStorage.getItem('flashcards_overlay');
        if (raw) {
          const overlay = JSON.parse(raw);
          overCats = Array.isArray(overlay.categories) ? overlay.categories : [];
          overCards = Array.isArray(overlay.flashcards) ? overlay.flashcards : [];
        }
      } catch (_) {
        // Safari private mode or denied storage; ignore overlay
      }
      return {
        categories: base.categories.concat(overCats),
        flashcards: base.flashcards.concat(overCards),
      };
    });
  }
  return cachePromise;
}
class FlashcardAPI {
  
  async fetchCategories() {
    // Prefer backend if available
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        return (await response.json()).slice().sort((a, b) => a.name.localeCompare(b.name));
      }
    } catch (_) {}
    const { categories } = await loadData();
    return categories.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetchFlashcardsByCategory(categoryName) {
    // Prefer backend if available
    try {
      const response = await fetch(`/api/flashcards/category/${encodeURIComponent(categoryName)}`);
      if (response.ok) {
        return (await response.json()).sort((a, b) => a.id - b.id);
      }
    } catch (_) {}
    const { categories, flashcards } = await loadData();
    const cat = categories.find(c => c.name === categoryName);
    if (!cat) return [];
    return flashcards
      .filter(f => String(f.category_id) === String(cat.id))
      .map(f => ({ ...f, category_name: cat.name }))
      .sort((a, b) => a.id - b.id);
  }

  async fetchAllFlashcards() {
    // Prefer backend if available
    try {
      const response = await fetch('/api/flashcards');
      if (response.ok) {
        const list = await response.json();
        return list.sort((a, b) => {
          const an = a.category_name || '';
          const bn = b.category_name || '';
          return an.localeCompare(bn) || a.id - b.id;
        });
      }
    } catch (_) {}
    const { categories, flashcards } = await loadData();
    return flashcards
      .map(f => ({
        ...f,
        category_name: (categories.find(c => String(c.id) === String(f.category_id)) || {}).name,
      }))
      .sort((a, b) => {
        const an = a.category_name || '';
        const bn = b.category_name || '';
        return an.localeCompare(bn) || a.id - b.id;
      });
  }

  async createCategory(name) {
    // Try backend if available; otherwise fall back to localStorage overlay
    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (response.ok) {
        // Invalidate and refresh cache so reads include new category
        cachePromise = null;
        return response.json();
      }
      if (response.status === 401) throw new Error('Unauthorized');
    } catch (_) {
      // Ignore and use fallback
    }

    // Fallback: persist in localStorage overlay and update cache
    const overlayKey = 'flashcards_overlay';
    const overlay = JSON.parse(localStorage.getItem(overlayKey) || '{}');
    const { categories } = await loadData();
    const nextId = (categories.reduce((m, c) => Math.max(m, Number(c.id) || 0), 0) || 0) + 1;
    const newCat = { id: nextId, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
    overlay.categories = (overlay.categories || []).concat(newCat);
    localStorage.setItem(overlayKey, JSON.stringify(overlay));

    // Update cache to include overlay data
    const base = await loadData();
    cachePromise = Promise.resolve({
      categories: base.categories.concat(overlay.categories || []),
      flashcards: base.flashcards,
    });
    return newCat;
  }

  async createFlashcard(categoryId, front, back, backFormat = 'sentence') {
    // Try backend first
    try {
      const response = await fetch('/api/flashcards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          front,
          back,
          back_format: backFormat,
        }),
      });
      if (response.ok) {
        cachePromise = null;
        return response.json();
      }
      if (response.status === 401) throw new Error('Unauthorized');
    } catch (_) {
      // ignore and use fallback
    }

    // Fallback: localStorage overlay
    const overlayKey = 'flashcards_overlay';
    const overlay = JSON.parse(localStorage.getItem(overlayKey) || '{}');
    const { flashcards } = await loadData();
    const nextId = (flashcards.reduce((m, f) => Math.max(m, Number(f.id) || 0), 0) || 0) + 1;
    const now = new Date().toISOString();
    const newCard = { id: nextId, category_id: Number(categoryId), front, back, back_format: backFormat, created_at: now, updated_at: now };
    overlay.flashcards = (overlay.flashcards || []).concat(newCard);
    localStorage.setItem(overlayKey, JSON.stringify(overlay));

    // Update cache to include overlay
    const base = await loadData();
    cachePromise = Promise.resolve({
      categories: base.categories,
      flashcards: base.flashcards.concat(overlay.flashcards || []),
    });
    return newCard;
  }

  async updateFlashcard(id, front, back, backFormat = 'sentence') {
    try {
      const response = await fetch(`/api/flashcards/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ front, back, back_format: backFormat }),
      });
      if (response.ok) {
        cachePromise = null;
        return response.json();
      }
      if (response.status === 401) throw new Error('Unauthorized');
    } catch (_) {}
    throw new Error('updateFlashcard is not supported in static JSON mode');
  }

  // login moved to standalone function below to avoid parser issues

  async deleteFlashcard(id) {
    // Try backend first
    try {
      const response = await fetch(`/api/flashcards/${id}`, { method: 'DELETE' });
      if (response.ok) {
        cachePromise = null;
        return;
      }
      if (response.status === 401) throw new Error('Unauthorized');
    } catch (_) {}

    // Fallback: remove from localStorage overlay
    const overlayKey = 'flashcards_overlay';
    try {
      const raw = localStorage.getItem(overlayKey);
      if (raw) {
        const overlay = JSON.parse(raw);
        const before = Array.isArray(overlay.flashcards) ? overlay.flashcards.length : 0;
        overlay.flashcards = (overlay.flashcards || []).filter(fc => String(fc.id) !== String(id));
        if (Array.isArray(overlay.flashcards) && overlay.flashcards.length !== before) {
          localStorage.setItem(overlayKey, JSON.stringify(overlay));
          const base = await loadData();
          cachePromise = Promise.resolve({
            categories: base.categories,
            flashcards: base.flashcards.filter(fc => String(fc.id) !== String(id)),
          });
          return;
        }
      }
    } catch (_) {}
    throw new Error('Failed to delete flashcard');
  }

  async deleteCategory(id) {
    // Try backend first; cascades flashcards on server
    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' });
      if (response.ok) {
        cachePromise = null;
        return;
      }
      if (response.status === 401) throw new Error('Unauthorized');
    } catch (_) {}

    // Fallback: remove from localStorage overlay and filter reads
    const overlayKey = 'flashcards_overlay';
    try {
      const raw = localStorage.getItem(overlayKey);
      const overlay = raw ? JSON.parse(raw) : {};
      const beforeCats = Array.isArray(overlay.categories) ? overlay.categories.length : 0;
      overlay.categories = (overlay.categories || []).filter(c => String(c.id) !== String(id));
      // Also remove flashcards in that category from overlay
      const beforeCards = Array.isArray(overlay.flashcards) ? overlay.flashcards.length : 0;
      overlay.flashcards = (overlay.flashcards || []).filter(f => String(f.category_id) !== String(id));
      const changed = (Array.isArray(overlay.categories) && overlay.categories.length !== beforeCats) ||
                      (Array.isArray(overlay.flashcards) && overlay.flashcards.length !== beforeCards);
      if (changed) {
        localStorage.setItem(overlayKey, JSON.stringify(overlay));
        const base = await loadData();
        cachePromise = Promise.resolve({
          categories: base.categories.filter(c => String(c.id) !== String(id)),
          flashcards: base.flashcards.filter(f => String(f.category_id) !== String(id)),
        });
        return;
      }
    } catch (_) {}
    throw new Error('Failed to delete category');
  }

  async getCategoryStats(id) {
    const { flashcards } = await loadData();
    const count = flashcards.filter(f => String(f.category_id) === String(id)).length;
    return { id, flashcard_count: count };
  }

  // Helper method to convert old JSON format to new API format for backwards compatibility
  async getCategoriesAsJSON() {
    const { categories, flashcards } = await loadData();
    const result = {};
    for (const cat of categories) {
      result[cat.name] = flashcards
        .filter(f => String(f.category_id) === String(cat.id))
        .map(f => ({ front: f.front, back: f.back }));
    }
    return result;
  }
}

export const flashcardAPI = new FlashcardAPI();

export async function login(username, password) {
  const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  cachePromise = null;
  return true;
}

// Assign for backward compatibility with components calling flashcardAPI.login
flashcardAPI.login = login;