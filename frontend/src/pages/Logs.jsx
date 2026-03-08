import { useState, useEffect, useRef } from 'react';
import api from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';

const TYPE_COLORS = {
    SIGNAL: 'text-blue-400 bg-blue-500/10',
    ORDER: 'text-amber-400 bg-amber-500/10',
    TARGET: 'text-green-400 bg-green-500/10',
    STOPLOSS: 'text-red-400 bg-red-500/10',
    ERROR: 'text-red-400 bg-red-500/10',
    SYSTEM: 'text-purple-400 bg-purple-500/10',
};

export default function Logs() {
    const [logs, setLogs] = useState([]);
    const [filter, setFilter] = useState('');
    const [autoScroll, setAutoScroll] = useState(true);
    const { logUpdates } = useWebSocket();
    const containerRef = useRef(null);

    useEffect(() => { fetchLogs(); }, [filter]);

    // Append new logs from WebSocket
    useEffect(() => {
        if (logUpdates.length > 0 && !filter) {
            const latest = logUpdates[0];
            setLogs(prev => {
                if (prev.some(l => l.id === latest.id)) return prev;
                return [latest, ...prev].slice(0, 500);
            });
        }
    }, [logUpdates, filter]);

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [logs, autoScroll]);

    const fetchLogs = async () => {
        try {
            const params = filter ? { log_type: filter } : {};
            const res = await api.get('/logs', { params });
            setLogs(res.data);
        } catch (e) { }
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">System Logs</h1>
                    <p className="text-sm text-dark-400 mt-1">Live system event viewer</p>
                </div>
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-dark-400 cursor-pointer">
                        <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
                            className="rounded border-dark-500 bg-dark-700 text-brand-500 focus:ring-brand-500" />
                        Auto-scroll
                    </label>
                    <select value={filter} onChange={e => setFilter(e.target.value)}
                        className="px-3 py-2 bg-dark-800 border border-dark-600 rounded-lg text-dark-200 text-sm focus:outline-none focus:border-brand-500">
                        <option value="">All Types</option>
                        <option value="SIGNAL">Signal</option>
                        <option value="ORDER">Order</option>
                        <option value="TARGET">Target</option>
                        <option value="STOPLOSS">Stoploss</option>
                        <option value="ERROR">Error</option>
                        <option value="SYSTEM">System</option>
                    </select>
                </div>
            </div>

            <div className="glass-card overflow-hidden" ref={containerRef} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                <div className="divide-y divide-dark-800">
                    {logs.map((log, i) => (
                        <div key={log.id || i} className="flex items-start gap-3 px-4 py-3 hover:bg-dark-800/50 transition-smooth">
                            <span className={`inline-block px-2 py-0.5 text-xs font-semibold rounded mt-0.5 whitespace-nowrap ${TYPE_COLORS[log.type] || 'text-dark-400 bg-dark-700'}`}>
                                {log.type}
                            </span>
                            <span className="text-sm text-dark-200 flex-1">{log.message}</span>
                            <span className="text-xs text-dark-500 whitespace-nowrap">
                                {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : ''}
                            </span>
                        </div>
                    ))}
                    {logs.length === 0 && (
                        <div className="py-12 text-center text-dark-500 text-sm">No logs yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}
