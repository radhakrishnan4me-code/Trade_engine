# Frontend Documentation

## Technology Stack

- **React 18** — UI framework
- **Vite 5** — Build tool and dev server
- **TailwindCSS 3** — Utility-first CSS framework
- **React Router 6** — Client-side routing
- **Axios** — HTTP client
- **Lucide React** — Icon library
- **React Hot Toast** — Toast notifications

## Design System

### Color Palette

| Name | Usage | Example |
|---|---|---|
| `brand-500` / `brand-600` | Primary accent, buttons, active states | `#6366f1` / `#4f46e5` |
| `dark-900` | Main background | `#0f172a` |
| `dark-800` | Card backgrounds, inputs | `#1e293b` |
| `dark-700` | Borders, dividers | `#334155` |
| `dark-400` | Secondary text | `#94a3b8` |
| `dark-100` | Primary text | `#f1f5f9` |
| Green | Profit, BUY, connected | `text-green-400` |
| Red | Loss, SELL, errors, stoploss | `text-red-400` |
| Amber | Pending, warnings | `text-amber-400` |

### Components

- **Glass Card** (`.glass-card`): Frosted glass effect with blur backdrop, used for all content panels
- **Table Row Hover** (`.table-row-hover`): Subtle brand-tinted hover on data rows
- **Gradient Text** (`.gradient-text`): Brand gradient for headings
- **Transition Smooth** (`.transition-smooth`): Consistent 0.2s ease transitions

### Typography

- **Primary**: Inter (Google Fonts) — clean, modern sans-serif
- **Monospace**: JetBrains Mono — for prices, codes, tokens

## Page Descriptions

### Login (`/login`)
- Glassmorphism card centered on gradient background
- Username + password fields with show/hide toggle
- On success: JWT stored in localStorage, redirect to dashboard
- Displays default credentials hint: `admin / admin123`

### Dashboard (`/`)
- **5 stat cards**: Total Signals, Active Trades, Connected Accounts, Completed Today, PNL Today
- **System Status**: WebSocket connection, Trade Engine, Database indicators
- **Quick Actions**: 4 shortcut tiles to common pages
- Auto-refreshes stats every 10 seconds

### Accounts (`/accounts`)
- Data table with Name, OpenAlgo URL, WS URL, Status columns
- **Status badges**: `connected` (green), `disconnected` (gray), `error` (red)
- **Actions per row**: Test Connection (⚡), Edit (✏️), Delete (🗑️)
- **Add/Edit Modal**: Form with name, URL, WS URL, API key fields

### Webhooks (`/webhooks`)
- Card layout showing each webhook configuration
- Displays: token, quantity, product, exchange, exit strategy, account count
- **Copy URL** button copies full webhook URL to clipboard
- **Create Modal**: Strategy name, quantity, product, exchange, exit strategy selector, multi-account checkboxes

### Signals (`/signals`)
- Table: ID, Symbol, Action, Entry, T1-T3, SL, Qty, Status, Time
- **Status filter** dropdown: All, Received, Processing, Executed, Failed
- BUY shown in green, SELL in red
- Auto-refreshes every 5 seconds

### Active Positions (`/positions`)
- **Real-time table** with WebSocket price and trade updates
- Columns: Symbol, Action, Entry, Current Price, P&L, T1-T3, SL, Qty (remaining/total), Status, Exit Strategy, Close
- **Exit Strategy dropdown**: Change strategy per trade instantly
- **Close Position button**: Manual market exit
- **Unrealized P&L**: Calculated from current_price vs entry, colored green/red
- **Trailing SL**: Shows trailing_sl if different from original SL

### Completed Trades (`/trades`)
- Table with PNL per trade
- **Total PNL** displayed in header, colored by overall profit/loss
- Status badges: COMPLETED (green), STOPLOSS_HIT (red), MANUALLY_CLOSED (amber)

### Logs (`/logs`)
- **Live log viewer** with WebSocket real-time streaming
- Color-coded type badges: SIGNAL (blue), ORDER (amber), TARGET (green), STOPLOSS (red), ERROR (red), SYSTEM (purple)
- **Type filter** dropdown
- **Auto-scroll** toggle checkbox
- Timestamps in local time format

## Authentication Flow

```
User enters credentials
    │
    ▼
POST /api/auth/login → JWT returned
    │
    ▼
Token stored in localStorage
    │
    ▼
Axios interceptor adds Bearer token to all /api/ requests
    │
    ▼
On 401 response → Token cleared → Redirect to /login
```

## WebSocket Integration

The `useWebSocket` hook provides:
- **Auto-connect** on mount
- **Auto-reconnect** on disconnect (3 second delay)
- **Ping/pong** keep-alive every 30 seconds
- **Categorized messages**: `priceUpdates`, `tradeUpdates`, `logUpdates`

Usage in components:
```jsx
const { isConnected, tradeUpdates, priceUpdates, logUpdates } = useWebSocket();
```

## Development

```bash
cd frontend
npm install
npm run dev   # Starts on http://localhost:5173 with API proxy to :8000
```

The Vite dev server proxies `/api/` and `/webhook/` to `http://localhost:8000` for local development.
