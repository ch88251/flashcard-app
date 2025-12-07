import { statements } from '../server/database.js';
import { requireAuth } from './_auth.js';
import { readJsonBody } from './_utils.js';

async function readStaticData(req) {
  const host = req.headers?.host || '';
  const isLocal = host.includes('localhost') || host.startsWith('127.');
  const protocol = isLocal ? 'http' : 'https';
  const url = `${protocol}://${host}/data.json?ts=${Date.now()}`;
  const resp = await fetch(url, { cache: 'no-store' });
  if (!resp.ok) throw new Error('Failed to fetch static data.json');
  return resp.json();
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname; // e.g. /api/categories or /api/categories/1 or /api/categories/1/stats
    const parts = pathname.split('/').filter(Boolean); // ['api','categories', '1', 'stats']
    const method = req.method;

    // /api/categories
    if (parts.length === 2) {
      if (method === 'GET') {
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          try {
            const data = await readStaticData(req);
            const categories = Array.isArray(data.categories) ? data.categories : [];
            return res.status(200).json(categories.sort((a, b) => a.name.localeCompare(b.name)));
          } catch (_) {
            // Fallback to statements if static fetch fails
          }
        }
        const categories = await statements.getAllCategories();
        return res.status(200).json(categories);
      }
      if (method === 'POST') {
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          return res.status(405).json({ error: 'Mutations are disabled on production' });
        }
        const auth = requireAuth(req, res);
        if (!auth) return;
        const { name } = (req.body && typeof req.body === 'object') ? req.body : await readJsonBody(req);
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
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          return res.status(405).json({ error: 'Mutations are disabled on production' });
        }
        const auth = requireAuth(req, res);
        if (!auth) return;
        const { name } = (req.body && typeof req.body === 'object') ? req.body : await readJsonBody(req);
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
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          return res.status(405).json({ error: 'Mutations are disabled on production' });
        }
        const auth = requireAuth(req, res);
        if (!auth) return;
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
