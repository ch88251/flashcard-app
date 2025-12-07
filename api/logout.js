export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  // Clear cookie by setting expired
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = [
    'auth=;',
    'HttpOnly',
    'SameSite=Strict',
    isProd ? 'Secure' : '',
    'Path=/',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT'
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
