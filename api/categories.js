import { statements } from '../server/database.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname; // e.g. /api/categories or /api/categories/1 or /api/categories/1/stats
    const parts = pathname.split('/').filter(Boolean); // ['api','categories', '1', 'stats']
    const method = req.method;

    // /api/categories
    if (parts.length === 2) {
      if (method === 'GET') {
        const categories = await statements.getAllCategories();
        return res.status(200).json(categories);
      }
      if (method === 'POST') {
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Category name is required' });
        try {
          const created = await statements.insertCategory(name);
          return res.status(201).json(created);
        } catch (error) {
          if (error.code === 'DUPLICATE' || error.code === '23505') {
            return res.status(409).json({ error: 'Category already exists' });
          }
          throw error;
        }
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/categories/:id
    if (parts.length === 3) {
      const id = parts[2];
      if (method === 'GET') {
        const cat = await statements.getCategoryById(id);
        if (!cat) return res.status(404).json({ error: 'Category not found' });
        return res.status(200).json(cat);
      }
      if (method === 'PUT') {
        const { name } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Category name is required' });
        try {
          const updated = await statements.updateCategory(id, name);
          if (!updated) return res.status(404).json({ error: 'Category not found' });
          return res.status(200).json(updated);
        } catch (error) {
          if (error.code === 'DUPLICATE' || error.code === '23505') {
            return res.status(409).json({ error: 'Category name already exists' });
          }
          throw error;
        }
      }
      if (method === 'DELETE') {
        const deleted = await statements.deleteCategory(id);
        if (!deleted) return res.status(404).json({ error: 'Category not found' });
        return res.status(204).send();
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/categories/:id/stats
    if (parts.length === 4 && parts[3] === 'stats' && method === 'GET') {
      const id = parts[2];
      const cat = await statements.getCategoryById(id);
      if (!cat) return res.status(404).json({ error: 'Category not found' });
      const count = await statements.countFlashcardsByCategory(id);
      return res.status(200).json({ ...cat, flashcard_count: count.count });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Categories API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
