import asyncio
from typing import Dict, List, Set
from fastapi import WebSocket


class ConnectionManager:
    """Manages WebSocket connections to broadcast real-time updates to frontend clients."""

    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self._lock = asyncio.Lock()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        async with self._lock:
            self.active_connections.append(websocket)

    async def disconnect(self, websocket: WebSocket):
        async with self._lock:
            if websocket in self.active_connections:
                self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcast a message to all connected clients."""
        async with self._lock:
            disconnected = []
            for connection in self.active_connections:
                try:
                    await connection.send_json(message)
                except Exception:
                    disconnected.append(connection)
            for conn in disconnected:
                if conn in self.active_connections:
                    self.active_connections.remove(conn)

    async def broadcast_price_update(self, symbol: str, exchange: str, ltp: float):
        await self.broadcast({
            "type": "price_update",
            "data": {"symbol": symbol, "exchange": exchange, "ltp": ltp}
        })

    async def broadcast_trade_update(self, trade_data: dict):
        await self.broadcast({
            "type": "trade_update",
            "data": trade_data
        })

    async def broadcast_log(self, log_data: dict):
        await self.broadcast({
            "type": "log",
            "data": log_data
        })


# Singleton instance
ws_manager = ConnectionManager()
