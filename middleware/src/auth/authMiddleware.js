/**
 * Supabase JWT verification for the middleware's HTTP and Socket.IO surfaces.
 *
 * Replaces the old custom role-hierarchy JWT. Tokens are the access tokens
 * Supabase issues to the UI (HS256, aud "authenticated"); set
 * SUPABASE_JWT_SECRET (Supabase dashboard → Settings → API → JWT secret)
 * to enable verification. Without it auth is disabled (local development).
 */
const jwt = require('jsonwebtoken');

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

/** True when the middleware is configured to enforce auth. */
function authEnabled() {
  return Boolean(SUPABASE_JWT_SECRET);
}

/**
 * Verify a Supabase access token. Returns the decoded claims
 * ({ sub, email, role, ... }) or throws.
 */
function verifySupabaseToken(token, secret = SUPABASE_JWT_SECRET) {
  return jwt.verify(token, secret, {
    algorithms: ['HS256'],
    audience: 'authenticated',
  });
}

/** Express middleware: requires a valid Supabase bearer token. */
const authMiddleware = () => {
  return (req, res, next) => {
    if (!authEnabled()) return next(); // auth not configured — open (local dev)

    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    try {
      const claims = verifySupabaseToken(token);
      req.user = { id: claims.sub, email: claims.email, role: claims.role };
      next();
    } catch {
      return res.status(401).json({ error: 'Invalid token' });
    }
  };
};

/**
 * Socket.IO middleware: requires `auth: { token }` in the client handshake
 * when SUPABASE_JWT_SECRET is configured.
 */
function socketAuthMiddleware(socket, next) {
  if (!authEnabled()) return next();

  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('unauthorized: no token'));

  try {
    const claims = verifySupabaseToken(token);
    socket.data.user = { id: claims.sub, email: claims.email, role: claims.role };
    next();
  } catch {
    next(new Error('unauthorized: invalid token'));
  }
}

module.exports = { authMiddleware, socketAuthMiddleware, verifySupabaseToken, authEnabled };
