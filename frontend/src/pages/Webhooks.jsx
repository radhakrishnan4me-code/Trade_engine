import { useState, useEffect } from 'react';
import api from '../services/api';
import toast from 'react-hot-toast';
import { Plus, Trash2, Copy, X } from 'lucide-react';

const EXIT_STRATEGIES = ['TARGET1_EXIT', 'TARGET1_TRAIL', 'FULL_TARGET_RUN', 'SL_ONLY'];

export default function Webhooks() {
    const [webhooks, setWebhooks] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [form, setForm] = useState({
        name: '', strategy_name: '', account_ids: [], default_quantity: 1,
        product_type: 'MIS', exchange: 'NSE', default_exit_strategy: 'FULL_TARGET_RUN'
    });

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            const [wRes, aRes] = await Promise.all([api.get('/webhooks'), api.get('/accounts')]);
            setWebhooks(wRes.data);
            setAccounts(aRes.data);
        } catch (e) { toast.error('Failed to load'); }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await api.post('/webhooks', form);
            toast.success('Webhook created');
            setShowModal(false);
            setForm({ name: '', strategy_name: '', account_ids: [], default_quantity: 1, product_type: 'MIS', exchange: 'NSE', default_exit_strategy: 'FULL_TARGET_RUN' });
            fetchData();
        } catch (e) { toast.error('Failed to create'); }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this webhook?')) return;
        try { await api.delete(`/webhooks/${id}`); toast.success('Deleted'); fetchData(); }
        catch (e) { toast.error('Failed'); }
    };

    const copyUrl = (token) => {
        const url = `${window.location.origin}/webhook/${token}`;
        navigator.clipboard.writeText(url);
        toast.success('Webhook URL copied!');
    };

    const toggleAccount = (id) => {
        setForm(prev => ({
            ...prev,
            account_ids: prev.account_ids.includes(id)
                ? prev.account_ids.filter(a => a !== id)
                : [...prev.account_ids, id]
        }));
    };

    const strategyLabel = (s) => {
        const map = { TARGET1_EXIT: 'Exit @ T1', TARGET1_TRAIL: 'Trail after T1', FULL_TARGET_RUN: 'Full Run (T1→T3)', SL_ONLY: 'SL Only' };
        return map[s] || s;
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-dark-100">Webhooks</h1>
                    <p className="text-sm text-dark-400 mt-1">Manage strategy webhook endpoints</p>
                </div>
                <button onClick={() => setShowModal(true)}
                    className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-smooth text-sm font-medium">
                    <Plus size={16} /> Create Webhook
                </button>
            </div>

            <div className="grid gap-4">
                {webhooks.map(w => (
                    <div key={w.id} className="glass-card p-5">
                        <div className="flex items-start justify-between">
                            <div>
                                <h3 className="text-base font-semibold text-dark-100">{w.name}</h3>
                                <p className="text-sm text-dark-400 mt-1">Strategy: <span className="text-brand-400">{w.strategy_name}</span></p>
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={() => copyUrl(w.webhook_token)} className="p-2 text-brand-400 hover:bg-dark-700 rounded-lg transition-smooth" title="Copy URL">
                                    <Copy size={16} />
                                </button>
                                <button onClick={() => handleDelete(w.id)} className="p-2 text-red-400 hover:bg-dark-700 rounded-lg transition-smooth" title="Delete">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-4 text-xs text-dark-400">
                            <span>Token: <code className="text-dark-300 bg-dark-800 px-1.5 py-0.5 rounded">{w.webhook_token}</code></span>
                            <span>Qty: <span className="text-dark-200">{w.default_quantity}</span></span>
                            <span>Product: <span className="text-dark-200">{w.product_type}</span></span>
                            <span>Exchange: <span className="text-dark-200">{w.exchange}</span></span>
                            <span>Exit: <span className="text-amber-400">{strategyLabel(w.default_exit_strategy)}</span></span>
                            <span>Accounts: <span className="text-dark-200">{(w.account_ids || []).length}</span></span>
                        </div>
                        <div className="mt-2">
                            <code className="text-xs text-dark-500 bg-dark-800/50 px-2 py-1 rounded block font-mono">
                                POST {window.location.origin}/webhook/{w.webhook_token}
                            </code>
                        </div>
                    </div>
                ))}
                {webhooks.length === 0 && (
                    <div className="glass-card p-12 text-center text-dark-500 text-sm">No webhooks created yet</div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 px-4">
                    <div className="glass-card p-6 w-full max-w-lg max-h-[90vh] overflow-auto">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-semibold text-dark-100">Create Webhook</h2>
                            <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-dark-200"><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Name</label>
                                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500" placeholder="e.g. Nifty Breakout" />
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Strategy Name</label>
                                <input value={form.strategy_name} onChange={e => setForm({ ...form, strategy_name: e.target.value })} required
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500" placeholder="e.g. nifty_breakout_v2" />
                            </div>
                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-sm text-dark-300 mb-1">Quantity</label>
                                    <input type="number" value={form.default_quantity} onChange={e => setForm({ ...form, default_quantity: parseInt(e.target.value) || 1 })}
                                        className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500" />
                                </div>
                                <div>
                                    <label className="block text-sm text-dark-300 mb-1">Product</label>
                                    <select value={form.product_type} onChange={e => setForm({ ...form, product_type: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500">
                                        <option value="MIS">MIS</option>
                                        <option value="CNC">CNC</option>
                                        <option value="NRML">NRML</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm text-dark-300 mb-1">Exchange</label>
                                    <select value={form.exchange} onChange={e => setForm({ ...form, exchange: e.target.value })}
                                        className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500">
                                        <option value="NSE">NSE</option>
                                        <option value="BSE">BSE</option>
                                        <option value="NFO">NFO</option>
                                        <option value="MCX">MCX</option>
                                        <option value="BFO">BFO</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-1">Default Exit Strategy</label>
                                <select value={form.default_exit_strategy} onChange={e => setForm({ ...form, default_exit_strategy: e.target.value })}
                                    className="w-full px-3 py-2.5 bg-dark-800 border border-dark-600 rounded-lg text-dark-100 text-sm focus:outline-none focus:border-brand-500">
                                    {EXIT_STRATEGIES.map(s => <option key={s} value={s}>{strategyLabel(s)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-dark-300 mb-2">Target Accounts</label>
                                <div className="space-y-2">
                                    {accounts.map(a => (
                                        <label key={a.id} className="flex items-center gap-2 p-2 bg-dark-800 rounded-lg cursor-pointer hover:bg-dark-700 transition-smooth">
                                            <input type="checkbox" checked={form.account_ids.includes(a.id)} onChange={() => toggleAccount(a.id)}
                                                className="rounded border-dark-500 bg-dark-700 text-brand-500 focus:ring-brand-500" />
                                            <span className="text-sm text-dark-200">{a.name}</span>
                                            <span className="text-xs text-dark-500 ml-auto">{a.openalgo_url}</span>
                                        </label>
                                    ))}
                                    {accounts.length === 0 && <p className="text-sm text-dark-500">No accounts — add one first</p>}
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2.5 bg-dark-700 text-dark-300 rounded-lg text-sm hover:bg-dark-600 transition-smooth">Cancel</button>
                                <button type="submit" className="flex-1 py-2.5 bg-brand-600 text-white rounded-lg text-sm hover:bg-brand-500 transition-smooth font-medium">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
