import express from 'express';
import cors from 'cors';
import { statements } from './database.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
const handleError = (res, error, message = 'Internal server error') => {
  console.error('Database error:', error);
  res.status(500).json({ error: message });
};

// Routes

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// Get all categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await statements.getAllCategories();
    res.json(categories);
  } catch (error) {
    handleError(res, error, 'Failed to fetch categories');
  }
});

// Get category by ID
app.get('/api/categories/:id', async (req, res) => {
  try {
    const category = await statements.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    handleError(res, error, 'Failed to fetch category');
  }
});

// Create new category
app.post('/api/categories', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const newCategory = await statements.insertCategory(name);
    res.status(201).json(newCategory);
  } catch (error) {
    if (error.code === '23505' || error.code === 'DUPLICATE') {
      return res.status(409).json({ error: 'Category already exists' });
    }
    handleError(res, error, 'Failed to create category');
  }
});

// Update category
app.put('/api/categories/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    const updatedCategory = await statements.updateCategory(req.params.id, name);
    if (!updatedCategory) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.json(updatedCategory);
  } catch (error) {
    if (error.code === '23505' || error.code === 'DUPLICATE') {
      return res.status(409).json({ error: 'Category name already exists' });
    }
    handleError(res, error, 'Failed to update category');
  }
});

// Delete category
app.delete('/api/categories/:id', async (req, res) => {
  try {
    const deleted = await statements.deleteCategory(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Category not found' });
    }
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to delete category');
  }
});

// Get all flashcards
app.get('/api/flashcards', async (req, res) => {
  try {
    const flashcards = await statements.getAllFlashcards();
    res.json(flashcards);
  } catch (error) {
    handleError(res, error, 'Failed to fetch flashcards');
  }
});

// Get flashcards by category name (for backwards compatibility)
app.get('/api/flashcards/category/:categoryName', async (req, res) => {
  try {
    const flashcards = await statements.getFlashcardsByCategoryName(req.params.categoryName);
    res.json(flashcards);
  } catch (error) {
    handleError(res, error, 'Failed to fetch flashcards for category');
  }
});

// Get flashcards by category ID
app.get('/api/categories/:categoryId/flashcards', async (req, res) => {
  try {
    const flashcards = await statements.getFlashcardsByCategory(req.params.categoryId);
    res.json(flashcards);
  } catch (error) {
    handleError(res, error, 'Failed to fetch flashcards for category');
  }
});

// Get flashcard by ID
app.get('/api/flashcards/:id', async (req, res) => {
  try {
    const flashcard = await statements.getFlashcardById(req.params.id);
    if (!flashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    res.json(flashcard);
  } catch (error) {
    handleError(res, error, 'Failed to fetch flashcard');
  }
});

// Create new flashcard
app.post('/api/flashcards', async (req, res) => {
  try {
    const { category_id, front, back, back_format = 'sentence', code_language } = req.body;
    if (!category_id || !front || !back) {
      return res.status(400).json({ 
        error: 'Category ID, front, and back are required' 
      });
    }
    if (!['sentence', 'list', 'code'].includes(back_format)) {
      return res.status(400).json({ 
        error: 'back_format must be one of "sentence", "list", "code"' 
      });
    }
    const newFlashcard = await statements.insertFlashcard(category_id, front, back, back_format, code_language);
    res.status(201).json(newFlashcard);
  } catch (error) {
    if (error.code === '23503' || error.code === 'FOREIGN_KEY') {
      return res.status(400).json({ error: 'Invalid category ID' });
    }
    handleError(res, error, 'Failed to create flashcard');
  }
});

// Update flashcard
app.put('/api/flashcards/:id', async (req, res) => {
  try {
    const { front, back, back_format = 'sentence', code_language } = req.body;
    if (!front || !back) {
      return res.status(400).json({ error: 'Front and back are required' });
    }
    if (!['sentence', 'list', 'code'].includes(back_format)) {
      return res.status(400).json({ 
        error: 'back_format must be one of "sentence", "list", "code"' 
      });
    }
    const updatedFlashcard = await statements.updateFlashcard(req.params.id, front, back, back_format, code_language);
    if (!updatedFlashcard) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    res.json(updatedFlashcard);
  } catch (error) {
    handleError(res, error, 'Failed to update flashcard');
  }
});

// Delete flashcard
app.delete('/api/flashcards/:id', async (req, res) => {
  try {
    const deleted = await statements.deleteFlashcard(req.params.id);
    if (!deleted) {
      return res.status(404).json({ error: 'Flashcard not found' });
    }
    res.status(204).send();
  } catch (error) {
    handleError(res, error, 'Failed to delete flashcard');
  }
});

// Get category statistics
app.get('/api/categories/:id/stats', async (req, res) => {
  try {
    const category = await statements.getCategoryById(req.params.id);
    if (!category) {
      return res.status(404).json({ error: 'Category not found' });
    }
    const flashcardCount = await statements.countFlashcardsByCategory(req.params.id);
    res.json({
      ...category,
      flashcard_count: flashcardCount.count
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch category statistics');
  }
});

export default app;