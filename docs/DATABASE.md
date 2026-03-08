# Database Schema

## Overview

The Trade Engine uses PostgreSQL with async SQLAlchemy ORM. All tables are auto-created on startup via `Base.metadata.create_all()`.

## Entity Relationship Diagram

```
┌──────────┐     ┌───────────┐     ┌──────────┐     ┌──────────┐
│  users   │     │ accounts  │     │ webhooks │     │  logs    │
├──────────┤     ├───────────┤     ├──────────┤     ├──────────┤
│ id (PK)  │     │ id (PK)   │     │ id (PK)  │     │ id (PK)  │
│ username │     │ name      │     │ name     │     │ type     │
│ hashed_  │     │ openalgo_ │◄──┐ │ webhook_ │     │ trade_id │──┐
│  password│     │  url      │   │ │  token   │     │ message  │  │
│ is_active│     │ ws_url    │   │ │ strategy_│     │ timestamp│  │
│ created_ │     │ api_key   │   │ │  name    │     └──────────┘  │
│  at      │     │ status    │   │ │ account_ │                   │
└──────────┘     │ created_  │   │ │  ids[]   │                   │
                 │  at       │   │ │ default_ │                   │
                 └───────────┘   │ │  quantity │                   │
                                 │ │ product_ │                   │
                                 │ │  type    │                   │
                                 │ │ exchange │                   │
                                 │ │ default_ │                   │
                                 │ │  exit_   │                   │
                                 │ │  strategy│                   │
                                 │ │ created_ │                   │
                                 │ │  at      │                   │
                                 │ └────┬─────┘                   │
                                 │      │                         │
                                 │      │ FK                      │
                                 │      ▼                         │
                                 │ ┌──────────┐                   │
                                 │ │ signals  │                   │
                                 │ ├──────────┤                   │
                                 │ │ id (PK)  │                   │
                                 │ │ webhook_ │                   │
                                 │ │  id (FK) │──► webhooks       │
                                 │ │ symbol   │                   │
                                 │ │ exchange │                   │
                                 │ │ action   │                   │
                                 │ │ entry    │                   │
                                 │ │ t1,t2,t3 │                   │
                                 │ │ sl       │                   │
                                 │ │ quantity │                   │
                                 │ │ status   │                   │
                                 │ │ created_ │                   │
                                 │ │  at      │                   │
                                 │ └────┬─────┘                   │
                                 │      │                         │
                                 │      │ FK                      │
                                 │      ▼                         │
                                 │ ┌──────────────┐               │
                                 │ │   trades     │               │
                                 │ ├──────────────┤               │
                                 │ │ id (PK)      │◄──────────────┘
                                 │ │ signal_id FK │──► signals
                                 └─│ account_id FK│──► accounts
                                   │ order_id     │
                                   │ symbol       │
                                   │ exchange     │
                                   │ action       │
                                   │ entry_price  │
                                   │ current_price│
                                   │ exit_price   │
                                   │ quantity     │
                                   │ remaining_qty│
                                   │ pnl          │
                                   │ status       │
                                   │ exit_strategy│
                                   │ product_type │
                                   │ sl, t1,t2,t3 │
                                   │ trailing_sl  │
                                   │ created_at   │
                                   │ updated_at   │
                                   └──────────────┘
```

## Table Definitions

### `users`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique user ID |
| `username` | String(100) | Unique, not null, indexed | Login username |
| `hashed_password` | String(255) | Not null | bcrypt hashed password |
| `is_active` | Boolean | Default: true | Whether user can login |
| `created_at` | DateTime(tz) | Server default: now() | Account creation time |

### `accounts`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique account ID |
| `name` | String(200) | Not null | Descriptive name (e.g., "My Zerodha") |
| `openalgo_url` | String(500) | Not null | OpenAlgo REST API URL |
| `ws_url` | String(500) | Nullable | OpenAlgo WebSocket URL |
| `api_key` | String(500) | Not null | OpenAlgo API key |
| `status` | String(50) | Default: "disconnected" | Connection status: connected / disconnected / error |
| `created_at` | DateTime(tz) | Server default: now() | Account creation time |

### `webhooks`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique webhook ID |
| `name` | String(200) | Not null | Descriptive name |
| `webhook_token` | String(100) | Unique, not null, indexed | Auto-generated URL token |
| `strategy_name` | String(200) | Not null | Strategy identifier |
| `account_ids` | JSON | Default: [] | Array of account IDs to route signals to |
| `default_quantity` | Integer | Default: 1 | Default order quantity |
| `product_type` | String(20) | Default: "MIS" | MIS / CNC / NRML |
| `exchange` | String(20) | Default: "NSE" | NSE / BSE / NFO / MCX / BFO |
| `default_exit_strategy` | String(30) | Default: "FULL_TARGET_RUN" | Default trade exit strategy |
| `created_at` | DateTime(tz) | Server default: now() | Creation time |

### `signals`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique signal ID |
| `webhook_id` | Integer | FK → webhooks.id, not null | Source webhook |
| `symbol` | String(100) | Not null | Trading symbol |
| `exchange` | String(20) | Default: "NSE" | Exchange |
| `action` | String(10) | Not null | BUY or SELL |
| `entry` | Float | Not null | Entry price |
| `t1` | Float | Nullable | Target 1 |
| `t2` | Float | Nullable | Target 2 |
| `t3` | Float | Nullable | Target 3 |
| `sl` | Float | Not null | Stoploss |
| `quantity` | Integer | Not null | Order quantity |
| `status` | String(30) | Default: "RECEIVED" | RECEIVED / PROCESSING / EXECUTED / FAILED |
| `created_at` | DateTime(tz) | Server default: now() | Signal receipt time |

### `trades`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique trade ID |
| `signal_id` | Integer | FK → signals.id, not null | Source signal |
| `account_id` | Integer | FK → accounts.id, not null | Execution account |
| `order_id` | String(100) | Nullable | Broker order ID from OpenAlgo |
| `symbol` | String(100) | Not null | Trading symbol |
| `exchange` | String(20) | Default: "NSE" | Exchange |
| `action` | String(10) | Not null | BUY or SELL |
| `entry_price` | Float | Nullable | Actual entry price |
| `current_price` | Float | Nullable | Latest LTP |
| `exit_price` | Float | Nullable | Average exit price |
| `quantity` | Integer | Not null | Original order quantity |
| `remaining_qty` | Integer | Not null | Remaining unfilled quantity |
| `pnl` | Float | Default: 0.0 | Realized profit/loss |
| `status` | String(30) | Default: "SIGNAL_RECEIVED" | Trade lifecycle status (see below) |
| `exit_strategy` | String(30) | Default: "FULL_TARGET_RUN" | Active exit strategy (editable) |
| `product_type` | String(20) | Default: "MIS" | Order product type |
| `sl` | Float | Nullable | Original stoploss |
| `t1` | Float | Nullable | Target 1 |
| `t2` | Float | Nullable | Target 2 |
| `t3` | Float | Nullable | Target 3 |
| `trailing_sl` | Float | Nullable | Current trailing stoploss (updated by engine) |
| `created_at` | DateTime(tz) | Server default: now() | Trade creation time |
| `updated_at` | DateTime(tz) | Server default: now(), auto-update | Last modification time |

**Trade Status Values:**
| Status | Category | Meaning |
|---|---|---|
| `SIGNAL_RECEIVED` | Active | Signal received, trade created |
| `WAITING_ENTRY` | Active | Waiting for entry price |
| `ORDER_PLACED` | Active | Entry order sent to broker |
| `POSITION_ACTIVE` | Active | Entry filled, monitoring targets/SL |
| `TARGET1_HIT` | Active | T1 reached, partial exit done |
| `TARGET2_HIT` | Active | T2 reached, further partial exit |
| `TARGET3_HIT` | Completed | T3 reached, full exit |
| `STOPLOSS_HIT` | Completed | SL triggered, full exit |
| `COMPLETED` | Completed | Trade fully closed |
| `MANUALLY_CLOSED` | Completed | User manually closed |

### `logs`

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | Integer | PK, auto-increment | Unique log ID |
| `type` | String(50) | Not null | SIGNAL / ORDER / TARGET / STOPLOSS / ERROR / SYSTEM |
| `trade_id` | Integer | FK → trades.id, nullable | Associated trade (if applicable) |
| `message` | String(1000) | Not null | Log message text |
| `timestamp` | DateTime(tz) | Server default: now() | Log creation time |

## Indexes

- `users.username` — Unique index for login lookups
- `webhooks.webhook_token` — Unique index for webhook URL validation
- All primary keys are auto-indexed
- Foreign keys create implicit indexes on the referencing columns
