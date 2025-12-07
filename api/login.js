import { signToken } from './_auth.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  const { username, password } = req.body || {};
  const expectedUser = process.env.ADMIN_USERNAME || 'admin';
  const expectedPass = process.env.ADMIN_PASSWORD || 'password';
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (username !== expectedUser || password !== expectedPass) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const secret = process.env.AUTH_SECRET || 'dev-secret';
  const token = signToken({ sub: username, exp: Date.now() + 24 * 60 * 60 * 1000 }, secret);
  const isProd = process.env.NODE_ENV === 'production';
  const cookie = [
    `auth=${token}`,
    'HttpOnly',
    'SameSite=Strict',
    isProd ? 'Secure' : '',
    'Path=/'
  ].filter(Boolean).join('; ');
  res.setHeader('Set-Cookie', cookie);
  return res.status(200).json({ ok: true });
}
