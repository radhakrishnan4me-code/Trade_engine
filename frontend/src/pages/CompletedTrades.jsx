import { useState, useEffect } from 'react';
import api from '../services/api';

export default function CompletedTrades() {
    const [trades, setTrades] = useState([]);

    useEffect(() => { fetchTrades(); }, []);

    const fetchTrades = async () => {
        try {
            const res = await api.get('/trades', { params: { filter: 'completed' } });
            setTrades(res.data);
        } catch (e) { }
    };

    const statusColor = (s) => {
        const map = {
            COMPLETED: 'bg-green-500/20 text-green-400', TARGET3_HIT: 'bg-green-500/20 text-green-400',
            STOPLOSS_HIT: 'bg-red-500/20 text-red-400', MANUALLY_CLOSED: 'bg-amber-500/20 text-amber-400',
        };
        return map[s] || 'bg-dark-600/50 text-dark-400';
    };

    const totalPnl = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Completed Trades</h1>
                    <p className="text-sm text-dark-400 mt-1">{trades.length} trades</p>
                </div>
                <div className={`text-lg font-bold ${totalPnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    Total: ₹{totalPnl.toFixed(2)}
                </div>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-700">
                            {['Symbol', 'Action', 'Entry', 'Exit', 'Qty', 'PNL', 'Status', 'Strategy', 'Closed At'].map(h => (
                                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-dark-400 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {trades.map(t => (
                            <tr key={t.id} className="border-b border-dark-800 table-row-hover">
                                <td className="py-2.5 px-3 text-sm font-medium text-dark-100">{t.symbol}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs font-bold ${t.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{t.action}</span>
                                </td>
                                <td className="py-2.5 px-3 text-sm text-dark-200 font-mono">{t.entry_price || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-200 font-mono">{t.exit_price || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-200">{t.quantity}</td>
                                <td className={`py-2.5 px-3 text-sm font-mono font-medium ${(t.pnl || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    ₹{(t.pnl || 0).toFixed(2)}
                                </td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(t.status)}`}>{t.status}</span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-dark-400">{t.exit_strategy}</td>
                                <td className="py-2.5 px-3 text-xs text-dark-500">{t.updated_at ? new Date(t.updated_at).toLocaleString() : ''}</td>
                            </tr>
                        ))}
                        {trades.length === 0 && (
                            <tr><td colSpan={9} className="py-12 text-center text-dark-500 text-sm">No completed trades yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
