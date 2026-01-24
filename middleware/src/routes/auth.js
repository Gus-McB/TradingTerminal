const express = require('express');
const router = express.Router();

router.post('/login', async (req, res) => {
    const { provider, code } = req.body;

    const token = jwt.sign(
        { userId: user.id, email: user.email, role: user.subscriptionTier },
        JWT_SECRET,
        { expressIn: '7d' }
    );

    res.json({ token, user: { email: user.email, role: user.subscriptionTier }
    });

    router.post('.refresh', authMiddleware('free'), (req, res) => {
        const newToken = jwt.sign(req.user, JWT_SECRET, { expressIn: '7d'});
        res.json({ token: newToken });
    });
});

module.exports = router;