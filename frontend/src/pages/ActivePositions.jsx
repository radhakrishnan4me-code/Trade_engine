import { useState, useEffect } from 'react';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import toast from 'react-hot-toast';
import { XCircle } from 'lucide-react';

const EXIT_STRATEGIES = ['TARGET1_EXIT', 'TARGET1_TRAIL', 'FULL_TARGET_RUN', 'SL_ONLY'];
const strategyLabel = (s) => {
    const map = { TARGET1_EXIT: 'Exit @ T1', TARGET1_TRAIL: 'Trail T1', FULL_TARGET_RUN: 'Full Run', SL_ONLY: 'SL Only' };
    return map[s] || s;
};

export default function ActivePositions() {
    const [trades, setTrades] = useState([]);
    const { tradeUpdates, priceUpdates } = useWebSocket();

    useEffect(() => { fetchTrades(); const i = setInterval(fetchTrades, 5000); return () => clearInterval(i); }, []);

    // Apply real-time trade updates
    useEffect(() => {
        if (tradeUpdates.length > 0) {
            const latest = tradeUpdates[0];
            setTrades(prev => prev.map(t => t.id === latest.id ? { ...t, ...latest } : t));
        }
    }, [tradeUpdates]);

    // Apply real-time price updates
    useEffect(() => {
        if (priceUpdates.length > 0) {
            const latest = priceUpdates[0];
            setTrades(prev => prev.map(t =>
                t.symbol === latest.symbol && t.exchange === latest.exchange
                    ? { ...t, current_price: latest.ltp }
                    : t
            ));
        }
    }, [priceUpdates]);

    const fetchTrades = async () => {
        try {
            const res = await api.get('/trades', { params: { filter: 'active' } });
            setTrades(res.data);
        } catch (e) { }
    };

    const changeStrategy = async (id, strategy) => {
        try {
            await api.patch(`/trades/${id}/exit-strategy`, { exit_strategy: strategy });
            toast.success(`Strategy changed to ${strategyLabel(strategy)}`);
            fetchTrades();
        } catch (e) { toast.error('Failed to update'); }
    };

    const closeTrade = async (id) => {
        if (!confirm('Close this position manually?')) return;
        try {
            await api.post(`/trades/${id}/close`);
            toast.success('Position closed');
            fetchTrades();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    };

    const pnlColor = (trade) => {
        if (!trade.entry_price || !trade.current_price) return 'text-dark-400';
        const diff = trade.action === 'BUY'
            ? trade.current_price - trade.entry_price
            : trade.entry_price - trade.current_price;
        return diff >= 0 ? 'text-green-400' : 'text-red-400';
    };

    const unrealizedPnl = (trade) => {
        if (!trade.entry_price || !trade.current_price) return '—';
        const diff = trade.action === 'BUY'
            ? (trade.current_price - trade.entry_price) * trade.remaining_qty
            : (trade.entry_price - trade.current_price) * trade.remaining_qty;
        return `₹${diff.toFixed(2)}`;
    };

    const statusColor = (s) => {
        const map = {
            POSITION_ACTIVE: 'bg-green-500/20 text-green-400', TARGET1_HIT: 'bg-blue-500/20 text-blue-400',
            TARGET2_HIT: 'bg-purple-500/20 text-purple-400', ORDER_PLACED: 'bg-amber-500/20 text-amber-400',
            SIGNAL_RECEIVED: 'bg-dark-600/50 text-dark-300', WAITING_ENTRY: 'bg-amber-500/20 text-amber-400',
        };
        return map[s] || 'bg-dark-600/50 text-dark-400';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Active Positions</h1>
                    <p className="text-sm text-dark-400 mt-1">Real-time position monitoring • {trades.length} active</p>
                </div>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-700">
                            {['Symbol', 'Action', 'Entry', 'Current', 'P&L', 'T1', 'T2', 'T3', 'SL', 'Qty', 'Status', 'Exit Strategy', ''].map(h => (
                                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-dark-400 uppercase whitespace-nowrap">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map(t => (
                            <tr key={t.id} className="border-b border-dark-800 table-row-hover">
                                <td className="py-2.5 px-3 text-sm font-semibold text-dark-100">{t.symbol}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs font-bold ${t.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.action}</span>
                                </td>
                                <td className="py-2.5 px-3 text-sm text-dark-200 font-mono">{t.entry_price || '—'}</td>
                                <td className="py-2.5 px-3 text-sm font-mono font-medium text-dark-100">
                                    {t.current_price?.toFixed(2) || '—'}
                                </td>
                                <td className={`py-2.5 px-3 text-sm font-mono font-medium ${pnlColor(t)}`}>
                                    {unrealizedPnl(t)}
                                </td>
                                <td className="py-2.5 px-3 text-xs text-dark-400 font-mono">{t.t1 || '—'}</td>
                                <td className="py-2.5 px-3 text-xs text-dark-400 font-mono">{t.t2 || '—'}</td>
                                <td className="py-2.5 px-3 text-xs text-dark-400 font-mono">{t.t3 || '—'}</td>
                                <td className="py-2.5 px-3 text-xs text-red-400 font-mono">{t.trailing_sl || t.sl || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-200">{t.remaining_qty}/{t.quantity}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full whitespace-nowrap ${statusColor(t.status)}`}>{t.status}</span>
                                </td>
                                <td className="py-2.5 px-3">
                                    <select value={t.exit_strategy} onChange={e => changeStrategy(t.id, e.target.value)}
                                        className="px-2 py-1 bg-dark-800 border border-dark-600 rounded text-xs text-dark-200 focus:outline-none focus:border-brand-500 cursor-pointer">
                                        {EXIT_STRATEGIES.map(s => <option key={s} value={s}>{strategyLabel(s)}</option>)}
                                    </select>
                                </td>
                                <td className="py-2.5 px-3">
                                    <button onClick={() => closeTrade(t.id)} className="p-1.5 text-red-400 hover:bg-red-500/20 rounded transition-smooth" title="Close Position">
                                        <XCircle size={16} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {trades.length === 0 && (
                            <tr><td colSpan={13} className="py-12 text-center text-dark-500 text-sm">No active positions</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
