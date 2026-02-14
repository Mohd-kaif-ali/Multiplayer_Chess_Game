require('dotenv').config();
const Redis = require('ioredis');

if (!process.env.REDIS_URL) {
    console.warn('REDIS_URL not found, using default localhost');
}

const redis = new Redis(process.env.REDIS_URL);

redis.on('connect', () => {
    console.log('Redis connected successfully');
});

redis.on('error', (err) => {
    console.error('Redis connection error:', err);
});

module.exports = redis;
