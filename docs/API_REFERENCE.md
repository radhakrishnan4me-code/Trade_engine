# API Reference

Base URL: `http://your-server/api`

All endpoints (except auth login and webhook receiver) require a JWT bearer token:
```
Authorization: Bearer <token>
```

---

## Authentication

### POST `/api/auth/login`

Login and receive a JWT token.

**Request:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

**Errors:**
- `401` — Invalid username or password
- `403` — Account disabled

---

### GET `/api/auth/me`

Get current authenticated user.

**Response (200):**
```json
{
  "id": 1,
  "username": "admin",
  "is_active": true,
  "created_at": "2026-03-08T07:00:00Z"
}
```

---

### POST `/api/auth/register`

Create a new user (requires authentication).

**Request:**
```json
{
  "username": "trader1",
  "password": "securepassword"
}
```

**Response (200):** User object.

---

## Accounts

### GET `/api/accounts`

List all OpenAlgo accounts.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "My Zerodha",
    "openalgo_url": "http://10.0.0.5:5000",
    "ws_url": "ws://10.0.0.5:8765",
    "api_key": "abc123...",
    "status": "connected",
    "created_at": "2026-03-08T07:00:00Z"
  }
]
```

---

### POST `/api/accounts`

Add a new OpenAlgo account.

**Request:**
```json
{
  "name": "My Zerodha",
  "openalgo_url": "http://10.0.0.5:5000",
  "ws_url": "ws://10.0.0.5:8765",
  "api_key": "your-openalgo-api-key"
}
```

**Response (200):** Account object.

---

### PUT `/api/accounts/{id}`

Update an account. All fields optional.

**Request:**
```json
{
  "name": "Updated Name",
  "api_key": "new-api-key"
}
```

---

### DELETE `/api/accounts/{id}`

Delete an account. Disconnects any cached client.

**Response (200):**
```json
{ "message": "Account deleted" }
```

---

### POST `/api/accounts/{id}/test`

Test connection to an OpenAlgo instance. Updates account status to `connected` or `error`.

**Response (200):**
```json
{
  "success": true,
  "data": { "funds": "..." }
}
```

**Response (200 — failure):**
```json
{
  "success": false,
  "error": "Connection refused"
}
```

---

## Webhooks

### GET `/api/webhooks`

List all webhook endpoints.

**Response (200):**
```json
[
  {
    "id": 1,
    "name": "Nifty Breakout",
    "webhook_token": "xK9m2Lp4Rq...",
    "strategy_name": "nifty_breakout_v2",
    "account_ids": [1, 2],
    "default_quantity": 50,
    "product_type": "MIS",
    "exchange": "NSE",
    "default_exit_strategy": "FULL_TARGET_RUN",
    "created_at": "2026-03-08T07:00:00Z"
  }
]
```

---

### POST `/api/webhooks`

Create a new webhook endpoint. A unique `webhook_token` is auto-generated.

**Request:**
```json
{
  "name": "Nifty Breakout",
  "strategy_name": "nifty_breakout_v2",
  "account_ids": [1, 2],
  "default_quantity": 50,
  "product_type": "MIS",
  "exchange": "NSE",
  "default_exit_strategy": "FULL_TARGET_RUN"
}
```

**`default_exit_strategy` options:**
- `TARGET1_EXIT` — Exit full quantity at T1
- `TARGET1_TRAIL` — Exit 50% at T1, trail SL to entry
- `FULL_TARGET_RUN` — Scale out: 40% T1, 30% T2, 30% T3
- `SL_ONLY` — Stoploss only, no target exits

---

### PUT `/api/webhooks/{id}`

Update a webhook. All fields optional.

---

### DELETE `/api/webhooks/{id}`

Delete a webhook endpoint.

---

## Webhook Receiver

### POST `/webhook/{token}`

**No authentication required** — validated by the webhook token in the URL.

Receives a trading signal and triggers the trade engine.

**Request:**
```json
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "action": "BUY",
  "entry": 2500,
  "t1": 2520,
  "t2": 2550,
  "t3": 2580,
  "sl": 2470,
  "quantity": 10
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | ✅ | Trading symbol (e.g., RELIANCE, NIFTY24MARFUT) |
| `exchange` | string | ❌ | Default: webhook's exchange setting. NSE, BSE, NFO, MCX, BFO |
| `action` | string | ✅ | `BUY` or `SELL` |
| `entry` | float | ✅ | Entry price |
| `t1` | float | ❌ | Target 1 price |
| `t2` | float | ❌ | Target 2 price |
| `t3` | float | ❌ | Target 3 price |
| `sl` | float | ✅ | Stoploss price |
| `quantity` | int | ❌ | Default: webhook's default_quantity |

**Response (200):**
```json
{
  "status": "received",
  "signal_id": 42,
  "symbol": "RELIANCE",
  "action": "BUY"
}
```

**Errors:**
- `404` — Invalid webhook token

---

## Signals

### GET `/api/signals`

List signals. Optional query parameter: `status` (`RECEIVED`, `PROCESSING`, `EXECUTED`, `FAILED`).

```
GET /api/signals?status=PROCESSING&limit=50
```

---

### GET `/api/signals/{id}`

Get a single signal by ID.

---

## Trades

### GET `/api/trades`

List trades. Optional query parameter: `filter` (`active` or `completed`).

```
GET /api/trades?filter=active
GET /api/trades?filter=completed&limit=200
```

**Trade statuses:**
- Active: `SIGNAL_RECEIVED`, `WAITING_ENTRY`, `ORDER_PLACED`, `POSITION_ACTIVE`, `TARGET1_HIT`, `TARGET2_HIT`
- Completed: `TARGET3_HIT`, `STOPLOSS_HIT`, `COMPLETED`, `MANUALLY_CLOSED`

---

### GET `/api/trades/{id}`

Get a single trade by ID.

---

### PATCH `/api/trades/{id}/exit-strategy`

Change the exit strategy on a live trade. The trade engine immediately re-evaluates with the new strategy.

**Request:**
```json
{
  "exit_strategy": "TARGET1_EXIT"
}
```

**Response (200):** Updated trade object.

**Errors:**
- `400` — Cannot modify completed trade
- `404` — Trade not found

---

### POST `/api/trades/{id}/close`

Manually close a trade position. Places a market exit order for the remaining quantity.

**Response (200):**
```json
{ "success": true }
```

**Errors:**
- `400` — Trade not active or account not found

---

## Logs

### GET `/api/logs`

List system logs. Optional query parameter: `log_type` (`SIGNAL`, `ORDER`, `TARGET`, `STOPLOSS`, `ERROR`, `SYSTEM`).

```
GET /api/logs?log_type=ERROR&limit=100
```

---

## Dashboard

### GET `/api/dashboard/stats`

Get aggregated dashboard statistics.

**Response (200):**
```json
{
  "total_signals": 156,
  "active_trades": 3,
  "connected_accounts": 2,
  "completed_today": 12,
  "total_pnl_today": 4520.50
}
```

---

## WebSocket

### WS `/api/ws`

Connect for real-time updates. No authentication required (connect from authenticated frontend).

**Message types received:**

#### Price Update
```json
{
  "type": "price_update",
  "data": { "symbol": "RELIANCE", "exchange": "NSE", "ltp": 2515.30 }
}
```

#### Trade Update
```json
{
  "type": "trade_update",
  "data": {
    "id": 5, "symbol": "RELIANCE", "status": "TARGET1_HIT",
    "remaining_qty": 5, "pnl": 100.0
  }
}
```

#### Log
```json
{
  "type": "log",
  "data": {
    "id": 42, "type": "TARGET", "message": "T1 hit at 2520",
    "trade_id": 5, "timestamp": "2026-03-08T07:30:00Z"
  }
}
```

**Client → Server:**
- Send `"ping"` to keep alive (receives `{"type": "pong"}`)

---

## Health Check

### GET `/api/health`

No authentication required.

**Response (200):**
```json
{ "status": "healthy", "service": "trade_engine" }
```
