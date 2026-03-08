import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, Zap, Radio, X } from 'lucide-react';

export default function Accounts() {
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({ name: '', openalgo_url: '', ws_url: '', api_key: '' });

    useEffect(() => { fetchAccounts(); }, []);

    const fetchAccounts = async () => {
        try {
            const res = await api.get('/accounts');
            setAccounts(res.data);
        } catch (e) { toast.error('Failed to load accounts'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editing) {
                await api.put(`/accounts/${editing}`, form);
                toast.success('Account updated');
            } else {
                await api.post('/accounts', form);
                toast.success('Account created');
            }
            setShowModal(false);
            setEditing(null);
            setForm({ name: '', openalgo_url: '', ws_url: '', api_key: '' });
            fetchAccounts();
        } catch (e) { toast.error(e.response?.data?.detail || 'Failed'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this account?')) return;
        try {
            await api.delete(`/accounts/${id}`);
            toast.success('Account deleted');
            fetchAccounts();
        } catch (e) { toast.error('Failed to delete'); }
    };

    const handleTestApi = async (id) => {
        try {
            const res = await api.post(`/accounts/${id}/test`);
            if (res.data.success) toast.success('API connection successful!');
            else toast.error(`API test failed: ${res.data.error}`);
            fetchAccounts();
        } catch (e) { toast.error('API test failed'); }
    };

    const handleTestWs = async (id) => {
        try {
            const res = await api.post(`/accounts/${id}/test-ws`);
            if (res.data.success) toast.success(res.data.message || 'WebSocket connected!');
            else toast.error(`WS test failed: ${res.data.error}`);
        } catch (e) { toast.error('WebSocket test failed'); }
    };

    const openEdit = (a) => {
        setEditing(a.id);
        setForm({ name: a.name, openalgo_url: a.openalgo_url, ws_url: a.ws_url || '', api_key: a.api_key });
        setShowModal(true);
    };

    const statusColor = (s) => {
        if (s === 'connected') return 'bg-green-500/20 text-green-400';
        if (s === 'error') return 'bg-red-500/20 text-red-400';
        return 'bg-dark-600/50 text-dark-400';
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">OpenAlgo Accounts</h1>
                    <p className="text-sm text-dark-400 mt-1">Manage your trading accounts</p>
                </div>
                <button onClick={() => { setEditing(null); setForm({ name: '', openalgo_url: '', ws_url: '', api_key: '' }); setShowModal(true); }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-smooth text-sm font-medium">
                    <Plus size={16} /> Add Account
                </button>
            </div>

            <div className="glass-card overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-dark-700">
                            <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase">Name</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase">OpenAlgo URL</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase">WS URL</th>
                            <th className="text-left py-3 px-4 text-xs font-semibold text-dark-400 uppercase">Status</th>
                            <th className="text-right py-3 px-4 text-xs font-semibold text-dark-400 uppercase">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {accounts.map((a) => (
                            <tr key={a.id} className="border-b border-dark-800 table-row-hover">
                                <td className="py-3 px-4 text-sm font-medium text-dark-200">{a.name}</td>
                                <td className="py-3 px-4 text-sm text-dark-400 font-mono">{a.openalgo_url}</td>
                                <td className="py-3 px-4 text-sm text-dark-400 font-mono">{a.ws_url || '—'}</td>
                                <td className="py-3 px-4">
                                    <span className={`inline-block px-2.5 py-1 text-xs font-medium rounded-full ${statusColor(a.status)}`}>
                                        {a.status}
                                    </span>
                                </td>
                                <td className="py-3 px-4 text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <button onClick={() => handleTestApi(a.id)} className="p-1.5 text-amber-400 hover:bg-dark-700 rounded transition-smooth" title="Test API">
                                            <Zap size={15} />
                                        </button>
                                        <button onClick={() => handleTestWs(a.id)} className="p-1.5 text-cyan-400 hover:bg-dark-700 rounded transition-smooth" title="Test WebSocket">
                                            <Radio size={15} />
                                        </button>
                                        <button onClick={() => openEdit(a)} className="p-1.5 text-blue-400 hover:bg-dark-700 rounded transition-smooth" title="Edit">
                                            <Pencil size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(a.id)} className="p-1.5 text-red-400 hover:bg-dark-700 rounded transition-smooth" title="Delete">
                                            <Trash2 size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {accounts.length === 0 && (
                            <tr><td colSpan={5} className="py-12 text-center text-dark-500 text-sm">No accounts added yet</td></tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="glass-card p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-dark-100">{editing ? 'Edit Account' : 'Add Account'}</h2>
                            <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Account Name</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500" placeholder="e.g. My Zerodha" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">OpenAlgo URL</label>
                                <input value={form.openalgo_url} onChange={e => setForm({ ...form, openalgo_url: e.target.value })} required
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500 font-mono" placeholder="http://127.0.0.1:5000" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">WebSocket URL</label>
                                <input value={form.ws_url} onChange={e => setForm({ ...form, ws_url: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500 font-mono" placeholder="ws://127.0.0.1:8765 (optional)" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">API Key</label>
                                <input value={form.api_key} onChange={e => setForm({ ...form, api_key: e.target.value })} required
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500 font-mono" placeholder="Your OpenAlgo API key" />
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-dark-700 text-dark-300 rounded-lg text-sm hover:bg-dark-600 transition-smooth">
                                    Cancel
                                </button>
                                <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-500 transition-smooth font-medium">
                                    {editing ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
