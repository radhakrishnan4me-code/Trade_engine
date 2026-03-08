# OpenAlgo Trade Engine

A production-ready multi-account trading automation platform built on [OpenAlgo](https://github.com/marketcalls/openalgo).

Receive webhook signals → Route to multiple OpenAlgo accounts → Execute trades → Monitor targets & stoploss → Real-time dashboard.

---

## Quick Start

```bash
cd Trade_engine
cp .env.example .env      # Edit with your production secrets
docker compose up -d       # Start all services
```

Open `http://your-server` → Login: `admin` / `admin123`

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, microservice overview, data flow |
| [API Reference](docs/API_REFERENCE.md) | Complete REST API endpoint documentation |
| [Webhook Guide](docs/WEBHOOK_GUIDE.md) | How to create webhooks and send signals |
| [Trade Engine](docs/TRADE_ENGINE.md) | Trade lifecycle, exit strategies, order execution |
| [Deployment](docs/DEPLOYMENT.md) | Docker setup, VPS deployment, SSL, domain config |
| [Frontend](docs/FRONTEND.md) | Dashboard pages, real-time features, UI guide |
| [Configuration](docs/CONFIGURATION.md) | Environment variables, security settings |
| [Database](docs/DATABASE.md) | Schema reference, models, relationships |

---

## Technology Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.11, FastAPI, SQLAlchemy (async), PostgreSQL |
| Frontend | React 18, Vite 5, TailwindCSS 3 |
| Auth | JWT (python-jose), bcrypt (passlib) |
| Trading | OpenAlgo Python SDK |
| Infra | Docker, Docker Compose, Nginx |

---

## Project Structure

```
Trade_engine/
├── docker-compose.yml
├── Dockerfile.backend
├── Dockerfile.frontend
├── nginx.conf
├── .env
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py
│       ├── config.py
│       ├── database.py
│       ├── models/          (User, Account, Webhook, Signal, Trade, Log)
│       ├── schemas/         (Pydantic request/response models)
│       ├── routers/         (auth, accounts, webhooks, signals, trades, logs, dashboard, ws, webhook_receiver)
│       └── services/        (auth_service, trade_engine, openalgo_manager, ws_broadcaster, log_service)
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── context/         (AuthContext)
│       ├── hooks/           (useWebSocket)
│       ├── services/        (Axios API client)
│       ├── components/      (Sidebar)
│       └── pages/           (Login, Dashboard, Accounts, Webhooks, Signals, ActivePositions, CompletedTrades, Logs)
│
└── docs/                    (This documentation)
```

## License

Private — All rights reserved.
