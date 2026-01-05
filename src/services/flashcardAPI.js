const API_BASE_URL = '/api';

// Cache for API responses
let categoriesCache = null;
let flashcardsCache = null;
class FlashcardAPI {
  
  async fetchCategories() {
    const response = await fetch(`${API_BASE_URL}/categories`);
    if (!response.ok) {
      throw new Error(`Failed to fetch categories: ${response.statusText}`);
    }
    const categories = await response.json();
    categoriesCache = categories;
    return categories.slice().sort((a, b) => a.name.localeCompare(b.name));
  }

  async fetchFlashcardsByCategory(categoryName) {
    const response = await fetch(`${API_BASE_URL}/flashcards/category/${encodeURIComponent(categoryName)}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch flashcards: ${response.statusText}`);
    }
    return (await response.json()).sort((a, b) => a.id - b.id);
  }

  async fetchAllFlashcards() {
    const response = await fetch(`${API_BASE_URL}/flashcards`);
    if (!response.ok) {
      throw new Error(`Failed to fetch flashcards: ${response.statusText}`);
    }
    const list = await response.json();
    flashcardsCache = list;
    return list.sort((a, b) => {
      const an = a.category_name || '';
      const bn = b.category_name || '';
      return an.localeCompare(bn) || a.id - b.id;
    });
  }

  async createCategory(name) {
    const response = await fetch(`${API_BASE_URL}/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    
    if (!response.ok) {
      if (response.status === 409) {
        throw new Error('Category already exists');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || 'Failed to create category');
    }
    
    categoriesCache = null; // Invalidate cache
    return response.json();
  }

  async createFlashcard(categoryId, front, back, backFormat = 'sentence', codeLanguage) {
    const response = await fetch(`${API_BASE_URL}/flashcards`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        category_id: categoryId,
        front,
        back,
        back_format: backFormat,
        code_language: codeLanguage,
      }),
    });
    
    if (!response.ok) {
      if (response.status === 400) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || 'Invalid flashcard data');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to create flashcard');
    }
    
    flashcardsCache = null; // Invalidate cache
    return response.json();
  }

  async updateFlashcard(id, front, back, backFormat = 'sentence', codeLanguage) {
    const response = await fetch(`${API_BASE_URL}/flashcards/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ front, back, back_format: backFormat, code_language: codeLanguage }),
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Flashcard not found');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to update flashcard');
    }
    
    flashcardsCache = null; // Invalidate cache
    return response.json();
  }

  // login moved to standalone function below to avoid parser issues

  async deleteFlashcard(id) {
    const response = await fetch(`${API_BASE_URL}/flashcards/${id}`, { method: 'DELETE' });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Flashcard not found');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to delete flashcard');
    }
    
    flashcardsCache = null; // Invalidate cache
  }

  async deleteCategory(id) {
    const response = await fetch(`${API_BASE_URL}/categories/${id}`, { method: 'DELETE' });
    
    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Category not found');
      }
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      throw new Error('Failed to delete category');
    }
    
    categoriesCache = null; // Invalidate cache
    flashcardsCache = null; // Flashcards cascade deleted
  }

  async getCategoryStats(id) {
    const response = await fetch(`${API_BASE_URL}/categories/${id}/stats`);
    if (!response.ok) {
      throw new Error('Failed to fetch category statistics');
    }
    return response.json();
  }

  // Helper method to convert database format to old JSON format for backwards compatibility
  async getCategoriesAsJSON() {
    const categories = await this.fetchCategories();
    const flashcards = await this.fetchAllFlashcards();
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
  const response = await fetch(`${API_BASE_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Login failed');
  }
  categoriesCache = null;
  flashcardsCache = null;
  return true;
}

// Assign for backward compatibility with components calling flashcardAPI.login
flashcardAPI.login = login;

export async function logout() {
  const response = await fetch(`${API_BASE_URL}/logout`, {
    method: 'POST'
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || 'Logout failed');
  }
  categoriesCache = null;
  flashcardsCache = null;
  return true;
}

flashcardAPI.logout = logout;