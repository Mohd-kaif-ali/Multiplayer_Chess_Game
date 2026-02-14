const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const redis = require('../redis/client');

const SECRET = process.env.JWT_SECRET || 'secret_key_change_me';
const USER_KEY_PREFIX = 'user:';

class AuthService {
    async register(username, password) {
        const existing = await redis.hget(USER_KEY_PREFIX + username, 'id');
        if (existing) throw new Error('Username taken');

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = { username, password: hashedPassword, rating: 1200 };

        await redis.hset(USER_KEY_PREFIX + username, user);
        return this.generateToken(username);
    }

    async login(username, password) {
        const user = await redis.hgetall(USER_KEY_PREFIX + username);
        if (!user || !user.username) throw new Error('User not found');

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) throw new Error('Invalid credentials');

        return this.generateToken(username);
    }

    generateToken(username) {
        return jwt.sign({ username }, SECRET, { expiresIn: '7d' });
    }

    verifyToken(token) {
        try {
            return jwt.verify(token, SECRET);
        } catch (e) {
            return null;
        }
    }
}

const authMiddleware = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    try {
        const decoded = jwt.verify(token, SECRET);
        req.user = decoded;
        next();
    } catch (e) {
        return res.status(401).json({ error: 'Invalid token' });
    }
};

module.exports = {
    authService: new AuthService(),
    authMiddleware
};
