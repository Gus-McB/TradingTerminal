import { describe, it, expect, vi, beforeAll } from 'vitest';
import jwt from 'jsonwebtoken';

const JWT_SECRET = 'test-secret';
let authMiddleware;

beforeAll(async () => {
    // Module reads JWT_SECRET at load time, so set it before importing
    process.env.JWT_SECRET = JWT_SECRET;
    ({ authMiddleware } = await import('../src/auth/authMiddleware.js'));
});

function mockRes() {
    return {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
    };
}

function reqWithToken(token) {
    return { headers: token ? { authorization: `Bearer ${token}` } : {} };
}

describe('authMiddleware', () => {
    it('returns 401 when no token is provided', () => {
        const res = mockRes();
        const next = vi.fn();

        authMiddleware()(reqWithToken(null), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'No token provided' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 401 for an invalid token', () => {
        const res = mockRes();
        const next = vi.fn();

        authMiddleware()(reqWithToken('not-a-jwt'), res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Invalid token' });
        expect(next).not.toHaveBeenCalled();
    });

    it('returns 403 when the role is insufficient', () => {
        const token = jwt.sign({ sub: 'u1', role: 'free' }, JWT_SECRET);
        const res = mockRes();
        const next = vi.fn();

        authMiddleware('admin')(reqWithToken(token), res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it('calls next and attaches the user for a valid token with sufficient role', () => {
        const token = jwt.sign({ sub: 'u1', role: 'admin' }, JWT_SECRET);
        const req = reqWithToken(token);
        const res = mockRes();
        const next = vi.fn();

        authMiddleware('subscribed')(req, res, next);

        expect(next).toHaveBeenCalledOnce();
        expect(req.user).toMatchObject({ sub: 'u1', role: 'admin' });
        expect(res.status).not.toHaveBeenCalled();
    });
});
