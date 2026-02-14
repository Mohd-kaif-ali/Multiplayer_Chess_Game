import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../socket';

const LandingPage = () => {
    const [username, setUsername] = useState(localStorage.getItem('username') || '');
    const [searching, setSearching] = useState(false);
    const navigate = useNavigate();

    const handleJoinQueue = (timeControl) => {
        const user = username || `Guest_${Math.floor(Math.random() * 1000)}`;
        if (!username) localStorage.setItem('username', user);

        setSearching(true);
        socket.connect();
        socket.emit('join_queue', { timeControl, username: user });
    };

    // Play Bot
    const handlePlayBot = () => {
        const user = username || `Guest_${Math.floor(Math.random() * 1000)}`;
        if (!username) localStorage.setItem('username', user);

        setSearching(true);
        socket.connect();
        socket.emit('play_bot', { difficulty: 'medium' });
    };

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex flex-col items-center justify-center p-4">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Searching Overlay */}
            {searching && (
                <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                    <h2 className="text-3xl font-bold text-white mb-2">Searching for Opponent...</h2>
                    <p className="text-gray-400 animate-pulse">Get ready!</p>
                    <button
                        onClick={() => {
                            setSearching(false);
                            // socket.disconnect(); // Optional: Cancel queue logic
                        }}
                        className="mt-8 px-6 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Auth Button */}
            <div className="absolute top-6 right-6 z-20">
                {username ? (
                    <div className="flex items-center gap-3 bg-white/5 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                        <div className="w-8 h-8 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg">
                            {username[0].toUpperCase()}
                        </div>
                        <span className="text-gray-200 font-medium">{username}</span>
                    </div>
                ) : (
                    <button
                        onClick={() => navigate('/login')}
                        className="text-gray-300 hover:text-white font-medium transition-colors"
                    >
                        Login / Register
                    </button>
                )}
            </div>

            <div className="relative z-10 text-center mb-12">
                <h1 className="text-7xl font-bold text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400 mb-4 tracking-tight drop-shadow-sm">
                    Chess Master
                </h1>
                <p className="text-gray-400 text-lg max-w-xl mx-auto">
                    Play real-time chess against players worldwide or challenge our advanced AI bot.
                </p>
            </div>

            <div className="glass-panel p-8 w-full max-w-2xl text-center relative z-10">
                <h3 className="text-2xl font-bold text-white mb-8 flex items-center justify-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Select Game Mode
                </h3>

                <div className="grid grid-cols-3 gap-6 mb-8">
                    <QueueButton
                        timeControl="1+0"
                        label="Bullet"
                        icon="🚀"
                        desc="1 min"
                        onClick={() => handleJoinQueue('bullet')}
                    />
                    <QueueButton
                        timeControl="3+2"
                        label="Blitz"
                        icon="⚡"
                        desc="3+2 min"
                        onClick={() => handleJoinQueue('blitz')}
                    />
                    <QueueButton
                        timeControl="10+0"
                        label="Rapid"
                        icon="🐢"
                        desc="10 min"
                        onClick={() => handleJoinQueue('rapid')}
                    />
                </div>

                <div className="border-t border-white/10 pt-6">
                    <button
                        onClick={handlePlayBot}
                        className="w-full bg-zinc-800 hover:bg-zinc-700 border border-white/5 hover:border-emerald-500/30 text-gray-300 hover:text-white font-bold py-4 px-6 rounded-xl transition-all duration-300 flex items-center justify-center gap-3 group"
                    >
                        <span className="group-hover:scale-110 transition-transform text-xl">🤖</span>
                        Play vs Bot
                    </button>
                </div>
            </div>
        </div>
    );
};

const QueueButton = ({ timeControl, label, icon, desc, onClick }) => (
    <button
        onClick={onClick}
        className="flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800 border border-white/5 hover:border-emerald-500/50 p-6 rounded-xl transition-all duration-300 group hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-900/20"
    >
        <span className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">{icon}</span>
        <span className="font-bold text-xl text-white mb-1">{label}</span>
        <span className="text-sm text-gray-500 group-hover:text-emerald-400">{desc}</span>
    </button>
);

export default LandingPage;
