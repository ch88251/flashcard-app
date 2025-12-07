import crypto from 'crypto';

export function signToken(payload, secret) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const data = `${header}.${body}`;
  const signature = crypto.createHmac('sha256', secret).update(data).digest('base64url');
  return `${data}.${signature}`;
}

export function verifyToken(token, secret) {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expected = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  if (signature !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getCookie(req, name) {
  const cookie = req.headers?.cookie || '';
  const parts = cookie.split(';').map(s => s.trim());
  for (const part of parts) {
    if (part.startsWith(`${name}=`)) {
      return part.substring(name.length + 1);
    }
  }
  return null;
}

export function requireAuth(req, res) {
  const secret = process.env.AUTH_SECRET || process.env.ADMIN_SECRET || 'dev-secret';
  const token = getCookie(req, 'auth');
  const payload = verifyToken(token, secret);
  if (!payload) {
    res.status(401).json({ error: 'Unauthorized' });
    return null;
  }
  return payload;
}
