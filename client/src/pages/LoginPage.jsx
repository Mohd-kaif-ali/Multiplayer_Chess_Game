import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const LoginPage = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [formData, setFormData] = useState({ username: '', password: '' });
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        const endpoint = isRegister ? '/api/auth/register' : '/api/auth/login';
        const url = import.meta.env.VITE_API_URL || 'http://10.169.195.23:5000';

        try {
            const res = await axios.post(`${url}${endpoint}`, formData);
            const { token, username } = res.data;

            localStorage.setItem('token', token);
            localStorage.setItem('username', username);

            navigate('/');
        } catch (err) {
            setError(err.response?.data?.error || 'Something went wrong');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-950 relative overflow-hidden flex items-center justify-center p-4">
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-emerald-600/20 rounded-full blur-[120px]" />
                <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <div className="glass-panel p-8 w-full max-w-md relative z-10 border border-white/10">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isRegister ? 'Create Account' : 'Welcome Back'}
                    </h1>
                    <p className="text-gray-400 text-sm">
                        {isRegister ? 'Join the community of chess masters' : 'Sign in to continue your journey'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm flex items-center gap-2">
                        <span className="text-lg">⚠️</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Username</label>
                        <input
                            type="text"
                            placeholder="Enter username"
                            className="input-field bg-zinc-900/50 focus:bg-zinc-900 transition-all"
                            value={formData.username}
                            onChange={e => setFormData({ ...formData, username: e.target.value })}
                        />
                    </div>

                    <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Password</label>
                        <input
                            type="password"
                            placeholder="••••••••"
                            className="input-field bg-zinc-900/50 focus:bg-zinc-900 transition-all"
                            value={formData.password}
                            onChange={e => setFormData({ ...formData, password: e.target.value })}
                        />
                    </div>

                    <button type="submit" className="btn-primary w-full py-4 mt-2">
                        {isRegister ? 'Sign Up' : 'Sign In'}
                    </button>
                </form>

                <div className="mt-8 text-center">
                    <p className="text-gray-400 text-sm">
                        {isRegister ? 'Already have an account?' : "Don't have an account?"}
                        <button
                            className="ml-2 text-emerald-400 hover:text-emerald-300 font-bold hover:underline transition-all"
                            onClick={() => setIsRegister(!isRegister)}
                        >
                            {isRegister ? 'Login' : 'Create Account'}
                        </button>
                    </p>
                </div>
            </div>

            <button
                onClick={() => navigate('/')}
                className="absolute top-6 left-6 text-gray-500 hover:text-white flex items-center gap-2 transition-colors z-20"
            >
                ← Back to Home
            </button>
        </div>
    );
};

export default LoginPage;
