import { statements } from '../server/database.js';

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
      const list = await statements.getFlashcardsByCategoryName(categoryName);
      return res.status(200).json(list);
    }

    return res.status(404).json({ error: 'Not found' });
  } catch (error) {
    console.error('FlashcardsByCategory API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
