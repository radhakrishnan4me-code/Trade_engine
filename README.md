# OpenAlgo Trade Engine

A production-ready multi-account trading automation platform built on [OpenAlgo](https://github.com/marketcalls/openalgo).

**Receive webhook signals → Route to multiple OpenAlgo accounts → Execute trades → Monitor targets & stoploss → Real-time dashboard.**

---

## Features

- 🔗 **Multi-Account** — Route signals to multiple OpenAlgo broker accounts simultaneously
- 📡 **Webhook Endpoints** — Strategy-specific URLs for TradingView, ChartInk, n8n, custom scripts
- 🎯 **4 Exit Strategies** — TARGET1_EXIT, TARGET1_TRAIL, FULL_TARGET_RUN, SL_ONLY (editable per trade)
- 📊 **Real-Time Dashboard** — Live prices, PNL, trade status via WebSocket
- 🔐 **JWT Authentication** — Username/password login with bcrypt hashing
- 🐳 **Docker Ready** — One-command deployment with Docker Compose

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

## Docker Deployment — Step by Step

### Prerequisites

- A **Linux VPS** (Ubuntu 22.04+ recommended) with at least 2 GB RAM
- **Docker** and **Docker Compose** installed
- A **domain or subdomain** pointed to your VPS IP (optional but recommended for SSL)
- **OpenAlgo** running on your local machine or a server the VPS can reach

### Step 1: Install Docker (if not already installed)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add your user to the docker group (avoids needing sudo)
sudo usermod -aG docker $USER

# Log out and back in for group changes to take effect
exit
# SSH back in

# Verify Docker is working
docker --version
docker compose version
```

### Step 2: Clone the Repository

```bash
cd ~
git clone https://github.com/radhakrishnan4me-code/Trade_engine.git
cd Trade_engine
```

### Step 3: Configure Environment Variables

```bash
# Copy the example config
cp .env.example .env

# Edit with your production values
nano .env
```

**Critical settings to change:**

```env
# Generate secure keys (run these commands and paste the output)
# openssl rand -hex 32

SECRET_KEY=<paste-generated-key-here>
JWT_SECRET=<paste-another-generated-key-here>

# Change default admin password
DEFAULT_ADMIN_PASSWORD=YourStr0ngPa55word!

# Change database password
POSTGRES_PASSWORD=YourDBPa55word!
DATABASE_URL=postgresql+asyncpg://postgres:YourDBPa55word!@postgres:5432/trade_engine
DATABASE_URL_SYNC=postgresql://postgres:YourDBPa55word!@postgres:5432/trade_engine

# Set CORS to your domain (or keep * for all)
CORS_ORIGINS=https://yourdomain.com
```

> ⚠️ **Never use the default secrets in production.** Generate unique keys with `openssl rand -hex 32`.

### Step 4: Build and Start All Services

```bash
# Build and start all 4 containers (postgres, backend, frontend, nginx)
docker compose up -d --build
```

This will:
1. Pull PostgreSQL 16 image
2. Build the Python backend (FastAPI + uvicorn)
3. Build the React frontend (Vite build → nginx serve)
4. Start nginx reverse proxy

### Step 5: Verify Everything Is Running

```bash
# Check all 4 services are running
docker compose ps

# Expected output:
# NAME                STATUS              PORTS
# trade_engine-postgres-1    Up (healthy)   0.0.0.0:5432->5432/tcp
# trade_engine-backend-1     Up             0.0.0.0:8000->8000/tcp
# trade_engine-frontend-1    Up             0.0.0.0:3000->80/tcp
# trade_engine-nginx-1       Up             0.0.0.0:80->80/tcp

# Check backend health
curl http://localhost/api/health
# Should return: {"status":"healthy","service":"trade_engine"}

# View backend logs
docker compose logs -f backend
```

### Step 6: Access the Dashboard

Open your browser and navigate to:

```
http://your-server-ip
```

Login with:
- **Username**: `admin`
- **Password**: The password you set in `.env` (default: `admin123`)

### Step 7: Set Up Firewall

```bash
# Allow only SSH, HTTP, and HTTPS
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Verify
sudo ufw status
```

> 🔒 Do NOT expose ports 5432 (postgres), 8000 (backend), or 3000 (frontend) directly. Nginx handles all routing on port 80.

### Step 8: Set Up SSL with Let's Encrypt (Recommended)

```bash
# Install Certbot
sudo apt install certbot -y

# Get SSL certificate (replace with your domain)
sudo certbot certonly --standalone -d yourdomain.com

# Certificate files will be at:
# /etc/letsencrypt/live/yourdomain.com/fullchain.pem
# /etc/letsencrypt/live/yourdomain.com/privkey.pem
```

Update `nginx.conf` to use SSL:

```nginx
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # ... keep all existing location blocks ...
}
```

Update `docker-compose.yml` to mount certs and expose 443:

```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
```

Then rebuild:
```bash
docker compose up -d --build nginx
```

---

## Daily Operations

### View Logs

```bash
# All services
docker compose logs -f

# Backend only
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Restart Services

```bash
# Restart everything
docker compose restart

# Restart only the backend
docker compose restart backend
```

### Update After Code Changes

```bash
cd ~/Trade_engine
git pull
docker compose build
docker compose up -d
```

### Stop All Services

```bash
docker compose down
```

### Reset Database (⚠️ Deletes All Data)

```bash
docker compose down -v
docker compose up -d --build
```

---

## Database Backup & Restore

### Create Backup

```bash
docker compose exec postgres pg_dump -U postgres trade_engine > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Restore from Backup

```bash
docker compose exec -i postgres psql -U postgres trade_engine < backup_20260308_130000.sql
```

### Automated Daily Backups (Cron)

```bash
# Open crontab
crontab -e

# Add this line (daily at 2 AM, keeps backups in ~/backups/)
0 2 * * * mkdir -p ~/backups && cd ~/Trade_engine && docker compose exec -T postgres pg_dump -U postgres trade_engine > ~/backups/trade_engine_$(date +\%Y\%m\%d).sql
```

---

## Using Webhooks

### Step 1: Add an OpenAlgo Account

1. Go to **Accounts** page → **Add Account**
2. Enter your OpenAlgo URL (e.g., `http://10.0.0.5:5000`), WebSocket URL, and API key
3. Click **Test Connection** to verify

### Step 2: Create a Webhook

1. Go to **Webhooks** page → **Create Webhook**
2. Set name, strategy, quantity, product type, exchange, exit strategy
3. Select target accounts (which accounts should receive trades)
4. Click **Create** → A unique URL is generated

### Step 3: Send Trading Signals

Use the generated webhook URL from any source:

**cURL Example:**
```bash
curl -X POST https://yourdomain.com/webhook/YOUR_TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RELIANCE",
    "exchange": "NSE",
    "action": "BUY",
    "entry": 2500,
    "t1": 2520,
    "t2": 2550,
    "t3": 2580,
    "sl": 2470,
    "quantity": 10
  }'
```

**TradingView Alert:**
- Set Webhook URL to your webhook endpoint
- Message:
```json
{
  "symbol": "{{ticker}}",
  "action": "{{strategy.order.action}}",
  "entry": {{close}},
  "t1": {{plot_0}},
  "sl": {{plot_1}},
  "quantity": 10
}
```

**Python Script:**
```python
import requests

url = "https://yourdomain.com/webhook/YOUR_TOKEN_HERE"
signal = {
    "symbol": "NIFTY24MARFUT",
    "exchange": "NFO",
    "action": "BUY",
    "entry": 22000,
    "t1": 22050,
    "t2": 22100,
    "t3": 22150,
    "sl": 21950,
    "quantity": 50
}
response = requests.post(url, json=signal)
print(response.json())
# {"status": "received", "signal_id": 1, "symbol": "NIFTY24MARFUT", "action": "BUY"}
```

### Exit Strategies

| Strategy | Behavior |
|---|---|
| `TARGET1_EXIT` | Exit 100% at T1 |
| `TARGET1_TRAIL` | Exit 50% at T1, trail SL to entry for the rest |
| `FULL_TARGET_RUN` | 40% at T1, 30% at T2, 30% at T3 |
| `SL_ONLY` | Stoploss only — no target exits |

Exit strategies can be **changed on a live trade** from the Active Positions page.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `docker compose up` fails | Check Docker is installed: `docker --version` |
| Backend won't start | Check logs: `docker compose logs backend` |
| Frontend shows blank page | Check build: `docker compose logs frontend` |
| Can't access on port 80 | Check firewall: `sudo ufw status` |
| 502 Bad Gateway | Backend crashed — `docker compose restart backend` |
| WebSocket keeps disconnecting | Verify `proxy_read_timeout 86400` in nginx.conf |
| Database connection refused | Wait for postgres health check: `docker compose ps` |
| Order not placing | Check OpenAlgo account connection on Accounts page |
| Wrong webhook token | Copy URL from Webhooks page (use the copy button) |

---

## Project Structure

```
Trade_engine/
├── docker-compose.yml          # 4 services: postgres, backend, frontend, nginx
├── Dockerfile.backend          # Python 3.11 + uvicorn
├── Dockerfile.frontend         # Node build → nginx serve
├── nginx.conf                  # Reverse proxy configuration
├── .env.example                # Environment variables template
│
├── backend/
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Pydantic Settings
│       ├── database.py         # Async SQLAlchemy + PostgreSQL
│       ├── models/             # User, Account, Webhook, Signal, Trade, Log
│       ├── schemas/            # Pydantic request/response models
│       ├── routers/            # API endpoints (auth, accounts, webhooks, trades, etc.)
│       └── services/           # Business logic (trade_engine, openalgo_manager, etc.)
│
├── frontend/
│   ├── package.json
│   └── src/
│       ├── App.jsx             # Protected routes + layout
│       ├── context/            # AuthContext (JWT)
│       ├── hooks/              # useWebSocket (real-time)
│       ├── services/           # Axios API client
│       ├── components/         # Sidebar navigation
│       └── pages/              # Login, Dashboard, Accounts, Webhooks, Signals,
│                               # ActivePositions, CompletedTrades, Logs
│
└── docs/                       # Detailed documentation
    ├── ARCHITECTURE.md
    ├── API_REFERENCE.md
    ├── WEBHOOK_GUIDE.md
    ├── TRADE_ENGINE.md
    ├── DEPLOYMENT.md
    ├── FRONTEND.md
    ├── CONFIGURATION.md
    └── DATABASE.md
```

---

## Documentation

| Document | Description |
|---|---|
| [Architecture](docs/ARCHITECTURE.md) | System design, data flow diagrams, service descriptions |
| [API Reference](docs/API_REFERENCE.md) | Complete REST API with request/response examples |
| [Webhook Guide](docs/WEBHOOK_GUIDE.md) | Payload format, integration examples, exit strategies |
| [Trade Engine](docs/TRADE_ENGINE.md) | Trade lifecycle, exit strategy logic, order execution |
| [Deployment](docs/DEPLOYMENT.md) | Advanced Docker setup, SSL, domain config |
| [Frontend](docs/FRONTEND.md) | Dashboard pages, design system, WebSocket integration |
| [Configuration](docs/CONFIGURATION.md) | All environment variables, security checklist |
| [Database](docs/DATABASE.md) | Schema reference, ER diagram, table definitions |

---

## License

Private — All rights reserved.
