const redis = require('../redis/client');

const QUEUE_KEY_PREFIX = 'matchmaking:';

class MatchmakingService {
    constructor() {
        this.checkIntervals = {};
    }

    /**
     * Add a player to the matchmaking queue.
     * @param {string} socketId - The player's socket ID.
     * @param {object} playerInfo - Player details (rating, timeControl, etc.).
     */
    async addToQueue(socketId, playerInfo) {
        const { timeControl, rating } = playerInfo;
        // Simple grouping by time control for now.
        // Could add rating buckets later.
        const queueKey = `${QUEUE_KEY_PREFIX}${timeControl}`;

        // Store player info separately if needed, for now just socketId in queue
        await redis.hset(`player:${socketId}`, 'info', JSON.stringify(playerInfo));
        await redis.rpush(queueKey, socketId);

        console.log(`Added ${socketId} to queue ${queueKey}`);

        return queueKey;
    }

    /**
     * Remove a player from the backend queue (if they disconnect).
     */
    async removeFromQueue(socketId) {
        // This is expensive to scan all queues, typically we track which queue they joined.
        // For MVP, we'll assume we know the queue or try standard ones.
        const timeControls = ['bullet', 'blitz', 'rapid']; // Example
        for (const tc of timeControls) {
            await redis.lrem(`${QUEUE_KEY_PREFIX}${tc}`, 0, socketId);
        }
    }

    /**
     * Attempt to find a match in the given queue.
     * @param {string} timeControl 
     * @returns {Promise<[string, string]|null>} Array of 2 socket IDs or null.
     */
    async findMatch(timeControl) {
        const queueKey = `${QUEUE_KEY_PREFIX}${timeControl}`;

        // Atomic check and pop 2 players
        // Using a simple transaction (multi/exec) or LPOP count (Redis 6.2+)
        // Assuming Redis 6.2+ for 'count' argument in LPOP, else loop.
        // Let's use basic LPOP twice for compatibility, but handle race condition where 1 is popped.
        // Better: atomic Lua script.

        // Lua script to pop 2 items if available
        const script = `
      if redis.call('LLEN', KEYS[1]) >= 2 then
        return redis.call('LPOP', KEYS[1], 2)
      else
        return nil
      end
    `;

        try {
            const result = await redis.eval(script, 1, queueKey);
            if (result && result.length === 2) {
                return result; // [socketId1, socketId2]
            }
        } catch (err) {
            console.error('Matchmaking Lua error:', err);
            // Fallback manual
        }

        return null;
    }
}

module.exports = new MatchmakingService();
