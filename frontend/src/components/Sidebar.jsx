import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
    LayoutDashboard, Users, Webhook, Radio, TrendingUp,
    History, ScrollText, LogOut, Activity
} from 'lucide-react';

const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/accounts', label: 'Accounts', icon: Users },
    { path: '/webhooks', label: 'Webhooks', icon: Webhook },
    { path: '/signals', label: 'Signals', icon: Radio },
    { path: '/positions', label: 'Active Positions', icon: TrendingUp },
    { path: '/trades', label: 'Completed Trades', icon: History },
    { path: '/logs', label: 'Logs', icon: ScrollText },
];

export default function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <aside className="w-64 bg-dark-950 border-r border-dark-700 flex flex-col h-full">
            {/* Logo */}
            <div className="p-5 border-b border-dark-700">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                        <Activity size={20} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold gradient-text">Trade Engine</h1>
                        <p className="text-[11px] text-dark-400">OpenAlgo Platform</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-4 px-3 space-y-1 overflow-auto">
                {navItems.map(({ path, label, icon: Icon }) => (
                    <NavLink
                        key={path}
                        to={path}
                        end={path === '/'}
                        className={({ isActive }) =>
                            `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-smooth
              ${isActive
                                ? 'bg-brand-600/20 text-brand-400 border border-brand-500/30'
                                : 'text-dark-300 hover:text-dark-100 hover:bg-dark-800'
                            }`
                        }
                    >
                        <Icon size={18} />
                        {label}
                    </NavLink>
                ))}
            </nav>

            {/* User */}
            <div className="p-4 border-t border-dark-700">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-brand-600/30 flex items-center justify-center">
                            <span className="text-sm font-medium text-brand-400">
                                {user?.username?.[0]?.toUpperCase() || 'U'}
                            </span>
                        </div>
                        <span className="text-sm text-dark-300">{user?.username}</span>
                    </div>
                    <button onClick={handleLogout} className="p-2 text-dark-400 hover:text-red-400 transition-smooth">
                        <LogOut size={16} />
                    </button>
                </div>
            </div>
        </aside>
    );
}
