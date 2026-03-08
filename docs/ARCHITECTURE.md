# System Architecture

## Overview

The OpenAlgo Trade Engine is a microservice-based platform that automates trading signal execution across multiple OpenAlgo broker accounts.

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGINX (Port 80)                          │
│  ┌──────────────────┐  ┌───────────────┐  ┌──────────────────┐ │
│  │   /  → Frontend   │  │ /api → Backend │  │ /webhook → Backend│ │
│  └──────────────────┘  └───────────────┘  └──────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
         │                       │                     │
         ▼                       ▼                     ▼
┌─────────────┐        ┌─────────────────┐    ┌──────────────────┐
│   Frontend  │◄──ws──►│    Backend      │◄───│  Webhook Signal  │
│  React SPA  │        │   FastAPI       │    │  (TradingView,   │
│  Port 3000  │        │   Port 8000     │    │   ChartInk, etc) │
└─────────────┘        └────────┬────────┘    └──────────────────┘
                                │
                    ┌───────────┼───────────┐
                    ▼           ▼           ▼
             ┌──────────┐ ┌──────────┐ ┌──────────┐
             │PostgreSQL│ │OpenAlgo 1│ │OpenAlgo 2│
             │ Port 5432│ │(Zerodha) │ │(Finvasia)│
             └──────────┘ └──────────┘ └──────────┘
```

## Data Flow

### Signal Execution Flow

```
Webhook POST /webhook/{token}
    │
    ▼
┌─ Validate Token ─┐
│  Look up webhook  │
│  configuration    │
└──────┬───────────┘
       │
       ▼
┌─ Save Signal ────┐
│  Store in DB      │
│  Status: RECEIVED │
└──────┬───────────┘
       │
       ▼
┌─ Process Signal ─────────────────────┐
│  For each target account:            │
│    1. Create Trade record            │
│    2. Place entry order via OpenAlgo │
│    3. Start price monitoring         │
└──────┬───────────────────────────────┘
       │
       ▼
┌─ Monitor Trade ──────────────────────┐
│  Loop every 500ms:                   │
│    • Check stoploss → exit           │
│    • Check targets (based on         │
│      exit_strategy) → partial/full   │
│    • Update current_price            │
│    • Broadcast to frontend WebSocket │
└──────────────────────────────────────┘
```

### Real-Time Update Flow

```
Backend                                Frontend
┌────────────────┐                    ┌────────────────┐
│ Trade Engine   │──trade_update──►   │  WebSocket     │
│ OpenAlgo WS    │──price_update──►   │  useWebSocket  │──► React State
│ Log Service    │──log──────────►    │  Hook          │──► UI Re-render
└────────────────┘                    └────────────────┘
```

## Service Architecture

### Backend Services

| Service | Responsibility |
|---|---|
| `auth_service` | JWT creation/validation, bcrypt password hashing, user seeding |
| `trade_engine` | Signal processing, order placement, target/SL monitoring, exit execution |
| `openalgo_manager` | OpenAlgo client pool, WebSocket LTP subscriptions, connection management |
| `ws_broadcaster` | Frontend WebSocket connection management, message broadcasting |
| `log_service` | Centralized DB logging + real-time log broadcasting |

### Backend Routers

| Router | Prefix | Auth Required | Description |
|---|---|---|---|
| `auth` | `/api/auth` | No (login) / Yes (me, register) | Authentication |
| `accounts` | `/api/accounts` | Yes | OpenAlgo account CRUD |
| `webhooks` | `/api/webhooks` | Yes | Webhook endpoint CRUD |
| `signals` | `/api/signals` | Yes | Signal listing |
| `trades` | `/api/trades` | Yes | Trade listing, exit strategy edit, manual close |
| `logs` | `/api/logs` | Yes | Log listing with filtering |
| `dashboard` | `/api/dashboard` | Yes | Aggregated statistics |
| `ws` | `/api/ws` | No | WebSocket for real-time updates |
| `webhook_receiver` | `/webhook/{token}` | Token-based | Signal ingestion |

### Frontend Pages

| Page | Route | Features |
|---|---|---|
| Login | `/login` | Username/password form |
| Dashboard | `/` | Stats cards, system status, quick actions |
| Accounts | `/accounts` | CRUD table, connection testing |
| Webhooks | `/webhooks` | Create with account & strategy selection, copy URL |
| Signals | `/signals` | Signal table with status filtering |
| Active Positions | `/positions` | Real-time prices, exit strategy dropdown, close button |
| Completed Trades | `/trades` | Trade history with PNL |
| Logs | `/logs` | Live log viewer with type filtering |

## Technology Decisions

### Why Async SQLAlchemy?
The trade engine needs to monitor multiple trades concurrently. Async I/O allows hundreds of simultaneous database queries without blocking the event loop, which is critical for low-latency trade monitoring.

### Why OpenAlgo SDK Directly?
Using the official `openalgo` Python package ensures compatibility with all 30+ supported brokers. The SDK handles broker-specific translation internally.

### Why WebSocket Over SSE?
WebSocket provides bidirectional communication, enabling future features like client-initiated trade commands. It also has lower overhead per message compared to SSE.
