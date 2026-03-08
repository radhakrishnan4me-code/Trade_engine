import asyncio
import logging
from typing import Dict, Optional
from openalgo import api

logger = logging.getLogger(__name__)


class OpenAlgoManager:
    """
    Manages OpenAlgo client instances for multiple accounts.
    Creates/caches api() instances and handles WebSocket connections.
    """

    def __init__(self):
        self._clients: Dict[int, api] = {}  # account_id -> api client
        self._ws_connected: Dict[int, bool] = {}
        self._subscriptions: Dict[int, set] = {}  # account_id -> set of (exchange, symbol)
        self._ltp_callbacks: Dict[str, list] = {}  # "exchange:symbol" -> list of callbacks
        self._lock = asyncio.Lock()

    def get_client(self, account_id: int, openalgo_url: str, api_key: str,
                   ws_url: str = None) -> api:
        """Get or create an OpenAlgo API client for the given account."""
        if account_id not in self._clients:
            kwargs = {
                "api_key": api_key,
                "host": openalgo_url,
            }
            if ws_url:
                kwargs["ws_url"] = ws_url
            self._clients[account_id] = api(**kwargs)
            logger.info(f"Created OpenAlgo client for account {account_id}")
        return self._clients[account_id]

    def remove_client(self, account_id: int):
        """Remove and disconnect a client."""
        if account_id in self._clients:
            try:
                client = self._clients[account_id]
                if self._ws_connected.get(account_id):
                    client.disconnect()
            except Exception as e:
                logger.error(f"Error disconnecting client {account_id}: {e}")
            del self._clients[account_id]
            self._ws_connected.pop(account_id, None)
            self._subscriptions.pop(account_id, None)

    async def place_order(self, account_id: int, openalgo_url: str, api_key: str,
                          ws_url: str, symbol: str, exchange: str, action: str,
                          quantity: int, price_type: str = "MARKET",
                          product: str = "MIS") -> dict:
        """Place an order through OpenAlgo API."""
        try:
            client = self.get_client(account_id, openalgo_url, api_key, ws_url)
            result = client.placeorder(
                symbol=symbol,
                exchange=exchange,
                action=action,
                quantity=quantity,
                price_type=price_type,
                product=product
            )
            logger.info(f"Order placed for account {account_id}: {result}")
            return {"success": True, "data": result}
        except Exception as e:
            logger.error(f"Order placement failed for account {account_id}: {e}")
            return {"success": False, "error": str(e)}

    async def subscribe_ltp(self, account_id: int, openalgo_url: str, api_key: str,
                            ws_url: str, instruments: list, callback=None):
        """Subscribe to LTP updates for given instruments."""
        try:
            client = self.get_client(account_id, openalgo_url, api_key, ws_url)

            if not self._ws_connected.get(account_id):
                client.connect()
                self._ws_connected[account_id] = True

            client.subscribe_ltp(instruments, on_data_received=callback)

            if account_id not in self._subscriptions:
                self._subscriptions[account_id] = set()
            for inst in instruments:
                self._subscriptions[account_id].add((inst["exchange"], inst["symbol"]))

            logger.info(f"Subscribed to LTP for {instruments} on account {account_id}")
        except Exception as e:
            logger.error(f"LTP subscription failed for account {account_id}: {e}")

    async def unsubscribe_ltp(self, account_id: int, instruments: list):
        """Unsubscribe from LTP updates."""
        try:
            if account_id in self._clients and self._ws_connected.get(account_id):
                self._clients[account_id].unsubscribe_ltp(instruments)
                if account_id in self._subscriptions:
                    for inst in instruments:
                        self._subscriptions[account_id].discard(
                            (inst["exchange"], inst["symbol"])
                        )
        except Exception as e:
            logger.error(f"LTP unsubscribe failed for account {account_id}: {e}")

    async def test_connection(self, openalgo_url: str, api_key: str) -> dict:
        """Test connection to an OpenAlgo instance."""
        try:
            client = api(api_key=api_key, host=openalgo_url)
            # Try a simple API call to verify connection
            result = client.funds()
            return {"success": True, "data": result}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def test_ws_connection(self, ws_url: str, api_key: str) -> dict:
        """Test WebSocket connection to an OpenAlgo instance using OpenAlgo auth flow."""
        client = None
        try:
            client = api(api_key=api_key, ws_url=ws_url)

            # OpenAlgo connect() is blocking (threaded websocket internals),
            # so execute it off the event loop.
            authenticated = await asyncio.to_thread(client.connect)
            if not authenticated:
                return {
                    "success": False,
                    "error": "Connected to WebSocket but OpenAlgo authentication failed. Verify API key and ws_url.",
                }

            return {
                "success": True,
                "message": "WebSocket connected and authenticated successfully",
            }
        except Exception as e:
            logger.error(f"WebSocket test failed: {e}")
            return {"success": False, "error": str(e)}
        finally:
            if client:
                try:
                    await asyncio.to_thread(client.disconnect)
                except Exception as disconnect_error:
                    logger.warning(f"WebSocket test disconnect failed: {disconnect_error}")

    def disconnect_all(self):

        """Disconnect all clients."""
        for account_id in list(self._clients.keys()):
            self.remove_client(account_id)


# Singleton
openalgo_manager = OpenAlgoManager()
