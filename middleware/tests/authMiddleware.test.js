import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

const SECRET = 'supabase-test-secret';
let auth;

beforeAll(async () => {
    // Module reads SUPABASE_JWT_SECRET at load time
    process.env.SUPABASE_JWT_SECRET = SECRET;
    auth = await import('../src/auth/authMiddleware.js');
});

function supabaseToken(overrides = {}) {
    return jwt.sign(
        { sub: 'user-123', email: 'trader@example.com', role: 'authenticated', aud: 'authenticated', ...overrides },
        SECRET,
        { algorithm: 'HS256' },
    );
}

function mockRes() {
    return { status: vi.fn().mockReturnThis(), json: vi.fn().mockReturnThis() };
}

describe('Supabase JWT auth middleware', () => {
    it('reports auth enabled when the secret is configured', () => {
        expect(auth.authEnabled()).toBe(true);
    });

    it('returns 401 when no token is provided', () => {
        const res = mockRes();
        const next = vi.fn();

        auth.authMiddleware()({ headers: {} }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for a token signed with the wrong secret', () => {
        const bad = jwt.sign({ sub: 'u', aud: 'authenticated' }, 'wrong-secret');
        const res = mockRes();
        const next = vi.fn();

        auth.authMiddleware()({ headers: { authorization: `Bearer ${bad}` } }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for a token with the wrong audience', () => {
        const bad = supabaseToken({ aud: 'anon' });
        const res = mockRes();
        const next = vi.fn();

        auth.authMiddleware()({ headers: { authorization: `Bearer ${bad}` } }, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it('attaches the user and calls next for a valid token', () => {
        const req = { headers: { authorization: `Bearer ${supabaseToken()}` } };
        const res = mockRes();
        const next = vi.fn();

        auth.authMiddleware()(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ id: 'user-123', email: 'trader@example.com' });
        expect(res.status).not.toHaveBeenCalled();
    });

    it('gates socket handshakes with the same verification', () => {
        const okSocket = { handshake: { auth: { token: supabaseToken() } }, data: {} };
        const okNext = vi.fn();
        auth.socketAuthMiddleware(okSocket, okNext);
        expect(okNext).toHaveBeenCalledWith();
        expect(okSocket.data.user).toMatchObject({ id: 'user-123' });

        const badSocket = { handshake: { auth: {} }, data: {} };
        const badNext = vi.fn();
        auth.socketAuthMiddleware(badSocket, badNext);
        expect(badNext.mock.calls[0][0]).toBeInstanceOf(Error);
    });
});
