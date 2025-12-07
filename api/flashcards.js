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
    const pathname = url.pathname; // /api/flashcards or /api/flashcards/123
    const parts = pathname.split('/').filter(Boolean);
    const method = req.method;

    // /api/flashcards
    if (parts.length === 2) {
      if (method === 'GET') {
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          try {
            const data = await readStaticData(req);
            const categories = Array.isArray(data.categories) ? data.categories : [];
            const flashcards = (Array.isArray(data.flashcards) ? data.flashcards : []).map(f => ({
              ...f,
              category_name: (categories.find(c => String(c.id) === String(f.category_id)) || {}).name,
            })).sort((a, b) => {
              const an = a.category_name || '';
              const bn = b.category_name || '';
              return an.localeCompare(bn) || a.id - b.id;
            });
            return res.status(200).json(flashcards);
          } catch (_) {
            // Fallback to statements if static fetch fails
          }
        }
        const flashcards = await statements.getAllFlashcards();
        return res.status(200).json(flashcards);
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
        const body = (req.body && typeof req.body === 'object') ? req.body : await readJsonBody(req);
        const { category_id, front, back } = body || {};
        const back_format = body?.back_format ?? 'sentence';
        if (!category_id || !front || !back) {
          return res.status(400).json({ error: 'Category ID, front, and back are required' });
        }
        if (!['sentence', 'list', 'code'].includes(back_format)) {
          return res.status(400).json({ error: 'back_format must be either "sentence" or "list"' });
        }
        try {
          const created = await statements.insertFlashcard(category_id, front, back, back_format);
          return res.status(201).json(created);
        } catch (error) {
          if (error.code === 'FOREIGN_KEY' || error.code === '23503') {
            return res.status(400).json({ error: 'Invalid category ID' });
          }
          throw error;
        }
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // /api/flashcards/:id
    if (parts.length === 3) {
      const id = parts[2];
      if (method === 'GET') {
        const isProd = process.env.NODE_ENV === 'production';
        const host = req.headers?.host || '';
        const isLocal = host.includes('localhost') || host.startsWith('127.');
        if (isProd && !isLocal) {
          try {
            const data = await readStaticData(req);
            const categories = Array.isArray(data.categories) ? data.categories : [];
            const f = (Array.isArray(data.flashcards) ? data.flashcards : []).find(fc => String(fc.id) === String(id));
            if (!f) return res.status(404).json({ error: 'Flashcard not found' });
            const category_name = (categories.find(c => String(c.id) === String(f.category_id)) || {}).name;
            return res.status(200).json({ ...f, category_name });
          } catch (_) {
            // Fallback
          }
        }
        const card = await statements.getFlashcardById(id);
        if (!card) return res.status(404).json({ error: 'Flashcard not found' });
        return res.status(200).json(card);
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
        const body = (req.body && typeof req.body === 'object') ? req.body : await readJsonBody(req);
        const { front, back } = body || {};
        const back_format = body?.back_format ?? 'sentence';
        if (!front || !back) {
          return res.status(400).json({ error: 'Front and back are required' });
        }
        if (!['sentence', 'list', 'code'].includes(back_format)) {
          return res.status(400).json({ error: 'back_format must be either "sentence" or "list"' });
        }
        const updated = await statements.updateFlashcard(id, front, back, back_format);
        if (!updated) return res.status(404).json({ error: 'Flashcard not found' });
        return res.status(200).json(updated);
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
        const deleted = await statements.deleteFlashcard(id);
        if (!deleted) return res.status(404).json({ error: 'Flashcard not found' });
        return res.status(204).send();
      }
      return res.status(405).json({ error: 'Method not allowed' });
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('Flashcards API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
