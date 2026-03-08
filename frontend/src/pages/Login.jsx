import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await login(username, password);
            toast.success('Welcome back!');
            navigate('/');
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-dark-900 flex items-center justify-center px-4">
            {/* Background gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-brand-950/50 via-dark-900 to-dark-950"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-brand-500/10 rounded-full blur-3xl"></div>

            <div className="relative glass-card p-8 w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-lg shadow-brand-500/20">
                        <Activity size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold gradient-text">Trade Engine</h1>
                        <p className="text-sm text-dark-400">OpenAlgo Platform</p>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100
                focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-smooth"
                            placeholder="Enter username"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-dark-300 mb-1.5">Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-3 bg-dark-800 border border-dark-600 rounded-lg text-dark-100
                  focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/50 transition-smooth pr-12"
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400 hover:text-dark-200"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-gradient-to-r from-brand-600 to-brand-500 text-white font-semibold
              rounded-lg hover:from-brand-500 hover:to-brand-400 transition-smooth disabled:opacity-50
              shadow-lg shadow-brand-500/20"
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <p className="mt-6 text-center text-xs text-dark-500">
                    Default: admin / admin123
                </p>
            </div>
        </div>
    );
}
