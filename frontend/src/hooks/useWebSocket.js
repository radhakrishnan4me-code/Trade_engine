import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket() {
    const [messages, setMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const wsRef = useRef(null);
    const reconnectRef = useRef(null);

    const connect = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${protocol}//${window.location.host}/api/ws`);

        ws.onopen = () => {
            setIsConnected(true);
            // Start ping interval
            reconnectRef.current = setInterval(() => {
                if (ws.readyState === WebSocket.OPEN) ws.send('ping');
            }, 30000);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type !== 'pong') {
                    setMessages(prev => [data, ...prev].slice(0, 500));
                }
            } catch (e) { }
        };

        ws.onclose = () => {
            setIsConnected(false);
            clearInterval(reconnectRef.current);
            // Reconnect after 3 seconds
            setTimeout(connect, 3000);
        };

        ws.onerror = () => {
            ws.close();
        };

        wsRef.current = ws;
    }, []);

    useEffect(() => {
        connect();
        return () => {
            clearInterval(reconnectRef.current);
            if (wsRef.current) wsRef.current.close();
        };
    }, [connect]);

    const priceUpdates = messages.filter(m => m.type === 'price_update').map(m => m.data);
    const tradeUpdates = messages.filter(m => m.type === 'trade_update').map(m => m.data);
    const logUpdates = messages.filter(m => m.type === 'log').map(m => m.data);

    return { isConnected, messages, priceUpdates, tradeUpdates, logUpdates };
}
