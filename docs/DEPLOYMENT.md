# Deployment Guide

## Prerequisites

- VPS with Docker and Docker Compose installed
- A domain or subdomain pointed to the VPS IP
- (Optional) SSL certificate for HTTPS

## Quick Deploy

```bash
# Clone or copy the Trade_engine directory to your VPS
cd Trade_engine

# Configure environment
cp .env.example .env
nano .env  # Edit with production values

# Build and start
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

## Production Configuration

### 1. Edit `.env`

```bash
# Generate secure keys
openssl rand -hex 32  # Use output for SECRET_KEY
openssl rand -hex 32  # Use output for JWT_SECRET
```

Update `.env`:
```env
SECRET_KEY=<generated-key>
JWT_SECRET=<generated-key>
DEFAULT_ADMIN_PASSWORD=<your-strong-password>
POSTGRES_PASSWORD=<your-strong-password>
DATABASE_URL=postgresql+asyncpg://postgres:<your-strong-password>@postgres:5432/trade_engine
```

### 2. Domain & SSL Setup

#### Option A: Nginx with Let's Encrypt (Recommended)

Install Certbot on the host and modify `nginx.conf`:

```nginx
server {
    listen 80;
    server_name sub.mydomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name sub.mydomain.com;

    ssl_certificate /etc/letsencrypt/live/sub.mydomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/sub.mydomain.com/privkey.pem;

    # ... proxy locations same as current nginx.conf
}
```

Update `docker-compose.yml` to mount certificates:
```yaml
nginx:
  volumes:
    - ./nginx.conf:/etc/nginx/conf.d/default.conf:ro
    - /etc/letsencrypt:/etc/letsencrypt:ro
  ports:
    - "80:80"
    - "443:443"
```

#### Option B: Cloudflare Proxy

1. Point your domain DNS to the VPS IP via Cloudflare
2. Enable Cloudflare proxy (orange cloud)
3. Set SSL mode to "Full" in Cloudflare dashboard
4. Keep nginx on port 80 (Cloudflare handles SSL)

### 3. Firewall

```bash
# Allow only HTTP/HTTPS and SSH
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do NOT expose ports 5432 (postgres), 8000 (backend), or 3000 (frontend) directly.

## Docker Commands

```bash
# Start all services
docker compose up -d

# Stop all services
docker compose down

# Rebuild after code changes
docker compose build
docker compose up -d

# View real-time logs
docker compose logs -f backend
docker compose logs -f frontend

# Restart a single service
docker compose restart backend

# Reset database (WARNING: deletes all data)
docker compose down -v
docker compose up -d

# Check resource usage
docker stats
```

## Service Health

| Service | Internal Port | Health Check |
|---|---|---|
| postgres | 5432 | `pg_isready -U postgres` |
| backend | 8000 | `GET /api/health` |
| frontend | 80 | HTTP 200 on `/` |
| nginx | 80 | HTTP 200 on `/` |

## Updating

```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose build
docker compose up -d
```

Database migrations are handled automatically — tables are created on startup via SQLAlchemy `create_all()`.

## Backup

### Database Backup

```bash
# Backup
docker compose exec postgres pg_dump -U postgres trade_engine > backup_$(date +%Y%m%d).sql

# Restore
docker compose exec -i postgres psql -U postgres trade_engine < backup_20260308.sql
```

### Automated Backups (cron)

```bash
# Add to crontab (daily at 2 AM)
0 2 * * * cd /path/to/Trade_engine && docker compose exec -T postgres pg_dump -U postgres trade_engine > /backups/trade_engine_$(date +\%Y\%m\%d).sql
```

## Troubleshooting

| Issue | Solution |
|---|---|
| Backend won't start | Check `docker compose logs backend` — likely DB connection or import error |
| Frontend shows blank page | Check `docker compose logs frontend` — npm build may have failed |
| Can't connect to postgres | Ensure postgres container is healthy: `docker compose ps` |
| 502 Bad Gateway | Backend isn't running. Check: `docker compose restart backend` |
| WebSocket disconnects | Check nginx config has `proxy_read_timeout 86400` |
| Slow performance | Check `docker stats` — may need more RAM/CPU on VPS |

## Recommended VPS Specs

| Load | RAM | CPU | Storage |
|---|---|---|---|
| Light (1-2 accounts, < 10 trades/day) | 2 GB | 1 vCPU | 20 GB |
| Medium (5 accounts, 50 trades/day) | 4 GB | 2 vCPU | 40 GB |
| Heavy (10+ accounts, 200+ trades/day) | 8 GB | 4 vCPU | 80 GB |
