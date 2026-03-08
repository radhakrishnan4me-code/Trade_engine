import { useState, useEffect } from 'react';
import api from '../services/api';
import { Radio } from 'lucide-react';

export default function Signals() {
    const [signals, setSignals] = useState([]);
    const [filter, setFilter] = useState('');

    useEffect(() => { fetchSignals(); const i = setInterval(fetchSignals, 5000); return () => clearInterval(i); }, [filter]);

    const fetchSignals = async () => {
        try {
            const params = filter ? { status: filter } : {};
            const res = await api.get('/signals', { params });
            setSignals(res.data);
        } catch (e) { }
    };

    const statusColor = (s) => {
        const map = { RECEIVED: 'bg-blue-500/20 text-blue-400', PROCESSING: 'bg-amber-500/20 text-amber-400', EXECUTED: 'bg-green-500/20 text-green-400', FAILED: 'bg-red-500/20 text-red-400' };
        return map[s] || 'bg-dark-600/50 text-dark-400';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Signals</h1>
                    <p className="text-sm text-dark-400 mt-1">Incoming webhook signals</p>
                </div>
                <select value={filter} onChange={e => setFilter(e.target.value)}
                    className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 text-sm focus:outline-none focus:border-brand-500">
                    <option value="">All</option>
                    <option value="RECEIVED">Received</option>
                    <option value="PROCESSING">Processing</option>
                    <option value="EXECUTED">Executed</option>
                    <option value="FAILED">Failed</option>
                </select>
            </div>

            <div className="glass-card overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-700">
                            {['ID', 'Symbol', 'Action', 'Entry', 'T1', 'T2', 'T3', 'SL', 'Qty', 'Status', 'Time'].map(h => (
                                <th key={h} className="text-left py-3 px-3 text-xs font-semibold text-dark-400 uppercase">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {signals.map(s => (
                            <tr key={s.id} className="border-b border-dark-800 table-row-hover">
                                <td className="py-2.5 px-3 text-sm text-dark-400">{s.id}</td>
                                <td className="py-2.5 px-3 text-sm font-medium text-dark-100">{s.symbol}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`text-xs font-bold ${s.action === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>{s.action}</span>
                                </td>
                                <td className="py-2.5 px-3 text-sm text-dark-200 font-mono">{s.entry}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-400 font-mono">{s.t1 || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-400 font-mono">{s.t2 || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-400 font-mono">{s.t3 || '—'}</td>
                                <td className="py-2.5 px-3 text-sm text-red-400 font-mono">{s.sl}</td>
                                <td className="py-2.5 px-3 text-sm text-dark-200">{s.quantity}</td>
                                <td className="py-2.5 px-3">
                                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${statusColor(s.status)}`}>{s.status}</span>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-dark-500">{s.created_at ? new Date(s.created_at).toLocaleString() : ''}</td>
                            </tr>
                        ))}
                        {signals.length === 0 && (
                            <tr><td colSpan={11} className="py-12 text-center text-dark-500 text-sm">No signals received yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
