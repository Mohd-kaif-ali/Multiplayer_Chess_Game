const express = require('express');
const { authService } = require('../services/authService');

const router = express.Router();

router.post('/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) return res.status(400).send('Missing fields');

        const token = await authService.register(username, password);
        res.json({ token, username, rating: 1200 });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const token = await authService.login(username, password);
        res.json({ token, username });
    } catch (e) {
        res.status(401).json({ error: e.message });
    }
});

module.exports = router;
