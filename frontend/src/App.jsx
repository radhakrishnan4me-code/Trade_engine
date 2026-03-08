import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/Accounts';
import Webhooks from './pages/Webhooks';
import Signals from './pages/Signals';
import ActivePositions from './pages/ActivePositions';
import CompletedTrades from './pages/CompletedTrades';
import Logs from './pages/Logs';

function ProtectedRoute({ children }) {
    const { isAuthenticated, loading } = useAuth();
    if (loading) return (
        <div className="flex items-center justify-center h-screen bg-dark-900">
            <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );
    return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppLayout() {
    return (
        <div className="flex h-screen bg-dark-900">
            <Sidebar />
            <main className="flex-1 overflow-auto p-6">
                <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/accounts" element={<Accounts />} />
                    <Route path="/webhooks" element={<Webhooks />} />
                    <Route path="/signals" element={<Signals />} />
                    <Route path="/positions" element={<ActivePositions />} />
                    <Route path="/trades" element={<CompletedTrades />} />
                    <Route path="/logs" element={<Logs />} />
                </Routes>
            </main>
        </div>
    );
}

export default function App() {
    return (
        <AuthProvider>
            <Toaster position="top-right" toastOptions={{
                style: { background: '#1e293b', color: '#e2e8f0', border: '1px solid #334155' }
            }} />
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/*" element={
                    <ProtectedRoute><AppLayout /></ProtectedRoute>
                } />
            </Routes>
        </AuthProvider>
    );
}
