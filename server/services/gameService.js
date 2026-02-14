const { Chess } = require('chess.js');
const crypto = require('crypto');
const redis = require('../redis/client');

const GAME_KEY_PREFIX = 'game:';

class GameService {
    /**
     * Create a new game room for two players.
     * @param {string} player1SocketId 
     * @param {string} player2SocketId 
     * @param {string} timeControl 
     */
    async getGame(roomId) {
        const data = await redis.get(`${GAME_KEY_PREFIX}${roomId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateGame(roomId, gameState) {
        await redis.set(`${GAME_KEY_PREFIX}${roomId}`, JSON.stringify(gameState));
    }

    async checkTimeout(roomId) {
        const gameData = await this.getGame(roomId);
        if (!gameData || gameData.status !== 'active') return null;

        const chess = new Chess(gameData.fen);
        const turn = chess.turn() === 'w' ? 'white' : 'black';
        const now = Date.now();
        const timeUsed = now - gameData.lastMoveTime;

        // Check if time exceeded (with a small buffer for lag, e.g. 1s)
        if (gameData.timers[turn] - timeUsed <= 1000) { // 1 second buffer
            gameData.timers[turn] = 0;
            gameData.status = 'finished';
            gameData.result = turn === 'white' ? 'black' : 'white';
            gameData.reason = 'timeout';

            await this.updateGame(roomId, gameData);
            return gameData;
        }
        return null;
    }

    async makeMove(roomId, move, playerId) {
        const gameData = await this.getGame(roomId);
        if (!gameData || gameData.status !== 'active') return null;

        const chess = new Chess(gameData.fen);
        const turn = chess.turn() === 'w' ? 'white' : 'black';

        // Validate Player Turn
        if (playerId && gameData.players[turn] !== playerId && playerId !== 'BOT') {
            return null; // Ignore move/hack attempt
        }

        // Calculate Time Used
        const now = Date.now();
        const timeUsed = now - gameData.lastMoveTime;

        // Deduct time (simple subtraction, ignore lag comp for MVP)
        if (gameData.timers && gameData.timers[turn] !== undefined) {
            gameData.timers[turn] -= timeUsed;
            if (gameData.timers[turn] <= 0) {
                gameData.status = 'finished';
                gameData.result = turn === 'white' ? 'black' : 'white'; // Opponent wins
                gameData.reason = 'timeout';
                await this.updateGame(roomId, gameData);
                return { ...gameData, timeout: true };
            }
        }

        try {
            const result = chess.move(move);
            if (result) {
                gameData.fen = chess.fen();
                gameData.pgn = chess.pgn();
                gameData.lastMoveTime = now;

                if (chess.isGameOver()) {
                    gameData.status = 'finished';
                    gameData.result = chess.isCheckmate() ? (chess.turn() === 'w' ? 'black' : 'white') : 'draw';
                    gameData.reason = 'checkmate';
                }
                await this.updateGame(roomId, gameData);
                return gameData;
            }
        } catch (e) {
            console.error('Invalid move attempted:', move);
        }
        return null;
    }

    parseTimeControl(tc) {
        const map = {
            'bullet': 60 * 1000,
            'blitz': 3 * 60 * 1000,
            'rapid': 10 * 60 * 1000,
            '1+0': 60 * 1000,
            '3+2': 3 * 60 * 1000,
            '10+0': 10 * 60 * 1000
        };
        return map[tc] || 10 * 60 * 1000;
    }

    async createGame(player1SocketId, player2SocketId, timeControl) {
        const roomId = crypto.randomUUID();
        const initialTime = this.parseTimeControl(timeControl);

        const gameData = {
            roomId,
            players: {
                white: player1SocketId,
                black: player2SocketId
            },
            fen: new Chess().fen(),
            pgn: '',
            timeControl,
            timers: {
                white: initialTime,
                black: initialTime
            },
            status: 'active',
            startTime: Date.now(),
            lastMoveTime: Date.now()
        };

        await redis.set(`${GAME_KEY_PREFIX}${roomId}`, JSON.stringify(gameData));
        await redis.set(`player:${player1SocketId}:room`, roomId);
        await redis.set(`player:${player2SocketId}:room`, roomId);

        await redis.expire(`${GAME_KEY_PREFIX}${roomId}`, 7200);
        await redis.expire(`player:${player1SocketId}:room`, 7200);
        await redis.expire(`player:${player2SocketId}:room`, 7200);

        return roomId;
    }

    async cleanupGame(roomId) {
        await redis.del(`${GAME_KEY_PREFIX}${roomId}`);
    }

    async handleDisconnect(socketId) {
        const roomId = await redis.get(`player:${socketId}:room`);
        if (!roomId) return null;

        const gameData = await this.getGame(roomId);
        if (!gameData || gameData.status !== 'active') return null;

        // Determine who disconnected/lost
        const disconnectedColor = gameData.players.white === socketId ? 'white' : 'black';
        const winnerColor = disconnectedColor === 'white' ? 'black' : 'white';

        gameData.status = 'finished';
        gameData.result = winnerColor;
        gameData.reason = 'abandonment';

        await this.updateGame(roomId, gameData);

        await redis.del(`player:${gameData.players.white}:room`);
        await redis.del(`player:${gameData.players.black}:room`);

        return gameData;
    }
}

module.exports = new GameService();
