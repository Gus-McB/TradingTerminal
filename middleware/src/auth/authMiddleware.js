const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

const authMiddleware = (requiredRole = 'user') => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            return req.status(401).json({ error: 'No token provided' });
        }

        try {
            const decoded = jwt.verify(token, JWT_SECRET);

            const roles = ['free', 'subscribed', 'admin'];
            const userRoleIndex = roles.indexOf(decoded.role);
            const requiredRoleIndex = roles.indexOf(requiredRole);

            if (userRoleIndex < requiredRoleIndex) {
                return res.status(403).json({ error: 'Insufficient permissions' });
            }

            req.user = decoded;
            next();
        } catch (err) {
            return res.status(401).json({ error: 'Invalid token' });
        }
    };
};

module.exports = { authMiddleware };