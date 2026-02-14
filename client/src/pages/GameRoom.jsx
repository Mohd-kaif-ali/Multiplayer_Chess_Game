import React, { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { Chess } from 'chess.js';
import Chessboard from '../components/Chessboard';
import socket from '../socket';

const GameRoom = () => {
    const { roomId } = useParams();
    const { state } = useLocation(); // { color: 'white' | 'black', opponent: string } passed from navigation
    /* 
       If page refined independently (refresh), state might be null. 
       We should fetch game state from server via 'get_game_state'. 
       For MVP, assume stable connection or simple reconnect.
    */

    const [game, setGame] = useState(new Chess());
    const [fen, setFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
    const [orientation, setOrientation] = useState('white');
    const [status, setStatus] = useState('Waiting for opponent...');

    // Chat State
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState('');

    const [timers, setTimers] = useState({ white: 600000, black: 600000 }); // Default 10m
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (roomId) socket.emit('join_room', { roomId });

        // Handle Orientation Persistence
        let myColor = orientation;
        if (state?.color) {
            myColor = state.color;
            sessionStorage.setItem(`chess_orientation_${roomId}`, myColor);
            setOrientation(myColor);
            setStatus("Game Started");
        } else {
            const savedColor = sessionStorage.getItem(`chess_orientation_${roomId}`);
            if (savedColor) {
                myColor = savedColor;
                setOrientation(savedColor);
                setStatus("Reconnected");
            }
        }

        // Socket Listeners for Game
        const onMoveMade = (data) => {
            const { move, fen, timers: newTimers, status: newStatus, result: gameResult, reason } = data;

            setGame((prevGame) => {
                const newGame = new Chess(prevGame.fen()); // Use local prevGame or server FEN? Server FEN is safer.
                // But to preserve animation/logic, we might want to move() on local.
                // If we use server FEN, we might lose move highlighting if not careful.
                // Let's rely on server FEN to stay in sync.
                const serverGame = new Chess(fen);
                setFen(fen);
                return serverGame;
            });

            if (newTimers) setTimers(newTimers);

            if (newStatus === 'finished') {
                setStatus(`Game Over: ${gameResult} (${reason})`);
                setResult({ winner: gameResult, reason });
            }
        };

        const onGameStart = ({ fen }) => {
            setFen(fen);
            setGame(new Chess(fen));
            setStatus("Game Started");
        };

        socket.on('move_made', onMoveMade);
        socket.on('game_start', onGameStart);

        return () => {
            socket.off('move_made', onMoveMade);
            socket.off('game_start', onGameStart);
        };
    }, [state, roomId]);

    // Timer Countdown Effect (Client side prediction)
    useEffect(() => {
        if (status !== 'Game Started' && status !== 'active') return;
        // Simple interval to decrement current turn's timer for visual feedback
        // This needs to be synced with state.color/turn.
        // For MVP, just showing server time on move is safe enough to avoid drift.
        // But to show ticking:
        const interval = setInterval(() => {
            setTimers(prev => {
                const turn = game.turn() === 'w' ? 'white' : 'black';
                return {
                    ...prev,
                    [turn]: Math.max(0, prev[turn] - 1000)
                };
            });
        }, 1000);
        return () => clearInterval(interval);
    }, [game, status]);

    const onDrop = (move) => {
        // Optimistic update handled by Board, but we need to validate and emit
        try {
            const tempGame = new Chess(game.fen());

            // Client side turn check - prevents sending invalid moves
            if (tempGame.turn() !== orientation[0]) return;

            const result = tempGame.move(move);

            if (result) {
                setGame(tempGame);
                setFen(tempGame.fen());
                socket.emit('make_move', { roomId, move });
            }
        } catch (e) {
            // Invalid
        }
    };

    // New Message Handler
    useEffect(() => {
        const onNewMessage = (msg) => {
            setMessages(prev => [...prev, msg].slice(-50)); // Keep last 50
        };

        const onGameOver = (data) => {
            const { result: gameResult, reason, winnerColor } = data;
            setStatus(`Game Over: ${winnerColor} won by ${reason}`);
            setResult({ winner: winnerColor, reason });
        };

        socket.on('new_message', onNewMessage);
        socket.on('game_over', onGameOver);

        return () => {
            socket.off('new_message', onNewMessage);
            socket.off('game_over', onGameOver);
        };
    }, []);

    return (
        <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center text-white p-4">
            <div className="mb-4 flex flex-col items-center">
                <h2 className="text-2xl font-bold mb-2 text-[#779556] tracking-wider">ROOM: {roomId?.slice(0, 8)}</h2>
                <span className="text-gray-400 font-medium">{status}</span>
                {state?.opponent && state.opponent !== 'BOT' && <span className="text-xs text-gray-600 mt-1">ID: {state.opponent.slice(0, 4)}</span>}
            </div>

            <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start justify-center w-full max-w-6xl">
                {/* Board and Timers */}
                <div className="flex flex-col gap-4">
                    {/* Opponent Card */}
                    <PlayerCard
                        name={state?.opponent === 'BOT' ? 'Stockfish (Bot)' : `Opponent`}
                        rating={state?.opponent === 'BOT' ? 3200 : 1200}
                        time={timers[orientation === 'white' ? 'black' : 'white']}
                        isActive={game.turn() !== orientation[0]}
                    />

                    <div className="shadow-2xl rounded-lg overflow-hidden border-8 border-zinc-800">
                        <Chessboard
                            fen={fen}
                            onMove={onDrop}
                            orientation={orientation}
                        />
                    </div>

                    {/* Player Card */}
                    <PlayerCard
                        name="You"
                        rating={1200}
                        time={timers[orientation]}
                        isActive={game.turn() === orientation[0]}
                        isMain
                    />
                </div>

                {/* Sidebar - Chat & Moves */}
                <div className="w-80 h-[600px] bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
                    <div className="flex border-b border-zinc-700">
                        <button className="flex-1 py-3 text-sm font-bold border-b-2 border-emerald-500 text-white bg-zinc-800">Chat</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-900/50 scrollbar-thin scrollbar-thumb-zinc-700">
                        {/* Chat Messages */}
                        {messages.length === 0 && <div className="text-center text-gray-600 text-sm mt-10">No messages yet...</div>}
                        {messages.map((msg, i) => {
                            const isMe = msg.senderSocketId === socket.id;
                            return (
                                <div key={i} className={`flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300 ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-baseline gap-2 mb-1">
                                        <span className={`text-xs font-bold ${isMe ? 'text-emerald-400' : 'text-blue-400'}`}>
                                            {isMe ? 'You' : 'Opponent'}
                                        </span>
                                        <span className="text-[10px] text-gray-600">{msg.timestamp}</span>
                                    </div>
                                    <div className={`p-2 rounded text-sm break-words border border-white/5 shadow-sm max-w-[80%] ${isMe ? 'bg-zinc-800 text-gray-200' : 'bg-zinc-700 text-white'}`}>
                                        {msg.message}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="p-3 bg-zinc-800 border-t border-zinc-700">
                        <form
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (!chatInput.trim()) return;
                                socket.emit('send_message', {
                                    roomId,
                                    message: chatInput,
                                    // Username handled by display logic now
                                });
                                setChatInput('');
                            }}
                            className="flex gap-2"
                        >
                            <input
                                type="text"
                                placeholder="Type a message..."
                                className="w-full bg-zinc-900 border border-zinc-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
                                value={chatInput}
                                onChange={(e) => setChatInput(e.target.value)}
                            />
                            <button type="submit" className="bg-emerald-700 hover:bg-emerald-600 text-white px-3 rounded transition-colors">
                                ➤
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            {/* Game Over Modal */}
            {result && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
                    <div className="bg-zinc-800 p-8 rounded-2xl border border-white/10 shadow-2xl text-center transform animate-in fade-in zoom-in duration-300 max-w-md w-full mx-4">
                        <h2 className="text-4xl font-bold mb-4 text-white">
                            {result.winner === 'draw' ? 'Draw!' : (
                                result.winner === orientation ?
                                    <span className="text-emerald-400 drop-shadow-lg">You Won! 🎉</span> :
                                    <span className="text-red-500 drop-shadow-lg">You Lost 😔</span>
                            )}
                        </h2>
                        <div className="text-white/60 mb-8 text-lg bg-white/5 py-2 px-4 rounded-full inline-block">
                            Reason: <span className="text-white font-medium capitalize">{result.reason}</span>
                        </div>
                        <button
                            onClick={() => window.location.href = '/'}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-full transition-all shadow-lg hover:shadow-emerald-500/30 w-full"
                        >
                            Return to Home
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

const PlayerCard = ({ name, rating, time, isActive, isMain }) => (
    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-300 ${isActive ? 'bg-zinc-800 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]' : 'bg-transparent border-transparent'}`}>
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center font-bold text-gray-400">
                {name[0]}
            </div>
            <div>
                <p className={`font-bold text-sm ${isActive ? 'text-white' : 'text-gray-400'}`}>{name}</p>
                <p className="text-xs text-gray-500">{rating}</p>
            </div>
        </div>
        <div className={`font-mono text-2xl font-bold px-3 py-1 rounded bg-zinc-950 ${isActive ? 'text-white' : 'text-gray-500'} ${time < 30000 ? 'text-red-500 animate-pulse' : ''}`}>
            {formatTime(time)}
        </div>
    </div>
);

const formatTime = (ms) => {
    // Check for negative time
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export default GameRoom;
