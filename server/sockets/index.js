const matchmakingService = require('../services/matchmakingService');
const gameService = require('../services/gameService');

const socketManager = (io) => {
    io.on('connection', (socket) => {
        console.log('New client connected:', socket.id);

        socket.on('join_queue', async (data) => {
            const { timeControl } = data;
            if (!timeControl) return;

            console.log(`${socket.id} joining queue ${timeControl}`);
            await matchmakingService.addToQueue(socket.id, { timeControl });

            const match = await matchmakingService.findMatch(timeControl);

            if (match) {
                const [player1, player2] = match;
                console.log(`Match found: ${player1} vs ${player2}`);

                const roomId = await gameService.createGame(player1, player2, timeControl);

                io.to(player1).emit('match_found', { roomId, color: 'white', opponent: player2 });
                io.to(player2).emit('match_found', { roomId, color: 'black', opponent: player1 });

                const socket1 = io.sockets.sockets.get(player1);
                const socket2 = io.sockets.sockets.get(player2);

                if (socket1) socket1.join(roomId);
                if (socket2) socket2.join(roomId);

                io.to(roomId).emit('game_start', { roomId, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
            }
        });

        socket.on('play_bot', async ({ difficulty }) => {
            console.log(`${socket.id} playing bot (${difficulty})`);
            const roomId = await gameService.createGame(socket.id, 'BOT', 'unlimited');

            socket.join(roomId);

            socket.emit('match_found', {
                roomId,
                color: 'white',
                opponent: 'BOT',
                difficulty
            });

            io.to(roomId).emit('game_start', { roomId, fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' });
        });

        socket.on('join_room', ({ roomId }) => {
            socket.join(roomId);
        });

        socket.on('claim_timeout', async ({ roomId }) => {
            const gameData = await gameService.checkTimeout(roomId);
            if (gameData) {
                io.to(roomId).emit('game_over', {
                    result: 'finished',
                    winnerColor: gameData.result,
                    reason: gameData.reason
                });
            }
        });

        socket.on('send_message', (data) => {
            const { roomId, message, username } = data;
            io.to(roomId).emit('new_message', {
                id: Date.now(),
                username,
                message,
                senderSocketId: socket.id,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            });
        });

        socket.on('make_move', async (data) => {
            const { roomId, move } = data;

            // Pass socket.id for validation
            const gameData = await gameService.makeMove(roomId, move, socket.id);

            if (gameData) {
                io.to(roomId).emit('move_made', {
                    move,
                    fen: gameData.fen,
                    timers: gameData.timers,
                    status: gameData.status,
                    result: gameData.result,
                    reason: gameData.reason
                });

                if (gameData.players.black === 'BOT' && gameData.status === 'active') {
                    const BotEngine = require('../bot/engine');
                    const bot = new BotEngine('hard');

                    setTimeout(async () => {
                        const botMove = bot.getBestMove(gameData.fen);
                        if (botMove) {
                            const newGameData = await gameService.makeMove(roomId, botMove, 'BOT');
                            if (newGameData) {
                                io.to(roomId).emit('move_made', {
                                    move: botMove,
                                    fen: newGameData.fen,
                                    timers: newGameData.timers,
                                    status: newGameData.status,
                                    result: newGameData.result,
                                    reason: newGameData.reason
                                });
                            }
                        }
                    }, 500);
                }
            }
        });

        socket.on('disconnect', async () => {
            console.log('Client disconnected', socket.id);
            await matchmakingService.removeFromQueue(socket.id);

            const gameData = await gameService.handleDisconnect(socket.id);
            if (gameData) {
                io.to(gameData.roomId).emit('game_over', {
                    result: 'finished',
                    winnerColor: gameData.result,
                    reason: gameData.reason
                });
            }
        });
    });
};

module.exports = socketManager;
