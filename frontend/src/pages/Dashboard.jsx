import { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { TrendingUp, Radio, Users, CheckCircle, DollarSign, Wifi, WifiOff } from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, subValue }) {
    return (
        <div className="glass-card p-5">
            <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${color} flex items-center justify-center`}>
                    <Icon size={20} className="text-white" />
                </div>
            </div>
            <p className="text-2xl font-bold text-dark-100">{value}</p>
            <p className="text-sm text-dark-400 mt-1">{label}</p>
            {subValue && <p className="text-xs text-dark-500 mt-1">{subValue}</p>}
        </div>
    );
}

export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const { isConnected } = useWebSocket();

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 10000);
        return () => clearInterval(interval);
    }, []);

    const fetchStats = async () => {
        try {
            const res = await api.get('/dashboard/stats');
            setStats(res.data);
        } catch (e) { }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
                    <p className="text-sm text-dark-400 mt-1">Real-time trading overview</p>
                </div>
                <div className="flex items-center gap-2 text-sm">
                    {isConnected ? (
                        <span className="flex items-center gap-1.5 text-green-400"><Wifi size={14} /> Live</span>
                    ) : (
                        <span className="flex items-center gap-1.5 text-red-400"><WifiOff size={14} /> Disconnected</span>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
                <StatCard
                    icon={Radio}
                    label="Total Signals"
                    value={stats?.total_signals ?? '—'}
                    color="bg-blue-600/80"
                />
                <StatCard
                    icon={TrendingUp}
                    label="Active Trades"
                    value={stats?.active_trades ?? '—'}
                    color="bg-amber-600/80"
                />
                <StatCard
                    icon={Users}
                    label="Connected Accounts"
                    value={stats?.connected_accounts ?? '—'}
                    color="bg-green-600/80"
                />
                <StatCard
                    icon={CheckCircle}
                    label="Completed Today"
                    value={stats?.completed_today ?? '—'}
                    color="bg-purple-600/80"
                />
                <StatCard
                    icon={DollarSign}
                    label="PNL Today"
                    value={stats?.total_pnl_today != null ? `₹${stats.total_pnl_today.toFixed(2)}` : '—'}
                    color={stats?.total_pnl_today >= 0 ? 'bg-emerald-600/80' : 'bg-red-600/80'}
                />
            </div>

            {/* Quick overview cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-dark-200 mb-3">System Status</h3>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-dark-700">
                            <span className="text-sm text-dark-400">WebSocket Feed</span>
                            <span className={`text-sm font-medium ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </span>
                        </div>
                        <div className="flex items-center justify-between py-2 border-b border-dark-700">
                            <span className="text-sm text-dark-400">Trade Engine</span>
                            <span className="text-sm font-medium text-green-400">Running</span>
                        </div>
                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-dark-400">Database</span>
                            <span className="text-sm font-medium text-green-400">Connected</span>
                        </div>
                    </div>
                </div>

                <div className="glass-card p-5">
                    <h3 className="text-lg font-semibold text-dark-200 mb-3">Quick Actions</h3>
                    <div className="grid grid-cols-2 gap-3">
                        <a href="/accounts" className="p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-smooth text-center">
                            <Users size={20} className="mx-auto text-brand-400 mb-1" />
                            <span className="text-xs text-dark-300">Add Account</span>
                        </a>
                        <a href="/webhooks" className="p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-smooth text-center">
                            <Radio size={20} className="mx-auto text-brand-400 mb-1" />
                            <span className="text-xs text-dark-300">Create Webhook</span>
                        </a>
                        <a href="/positions" className="p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-smooth text-center">
                            <TrendingUp size={20} className="mx-auto text-brand-400 mb-1" />
                            <span className="text-xs text-dark-300">View Positions</span>
                        </a>
                        <a href="/logs" className="p-3 bg-dark-800 rounded-lg hover:bg-dark-700 transition-smooth text-center">
                            <CheckCircle size={20} className="mx-auto text-brand-400 mb-1" />
                            <span className="text-xs text-dark-300">View Logs</span>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
