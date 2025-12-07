import { statements } from '../server/database.js';

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
    const pathname = url.pathname; // /api/flashcards/category/:categoryName
    const parts = pathname.split('/').filter(Boolean);
    const method = req.method;

    if (method !== 'GET') {
      return res.status(405).json({ error: 'Method not allowed' });
    }

    // Expect ['api','flashcards','category',':categoryName']
    if (parts.length === 4 && parts[2] === 'category') {
      const categoryName = decodeURIComponent(parts[3]);
      const isProd = process.env.NODE_ENV === 'production';
      const host = req.headers?.host || '';
      const isLocal = host.includes('localhost') || host.startsWith('127.');
      if (isProd && !isLocal) {
        try {
          const data = await readStaticData(req);
          const categories = Array.isArray(data.categories) ? data.categories : [];
          const flashcards = Array.isArray(data.flashcards) ? data.flashcards : [];
          const cat = categories.find(c => c.name === categoryName);
          const list = !cat ? [] : flashcards
            .filter(f => String(f.category_id) === String(cat.id))
            .map(f => ({ ...f, category_name: cat.name }))
            .sort((a, b) => a.id - b.id);
          return res.status(200).json(list);
        } catch (_) {
          // Fallback
        }
      }
      const list = await statements.getFlashcardsByCategoryName(categoryName);
      return res.status(200).json(list);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('FlashcardsByCategory API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
