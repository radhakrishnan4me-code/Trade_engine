# Configuration Reference

All configuration is managed via environment variables in the `.env` file at the project root.

## Environment Variables

### Database

| Variable | Default | Description |
|---|---|---|
| `DATABASE_URL` | `postgresql+asyncpg://postgres:postgres@postgres:5432/trade_engine` | Async database connection string (used by backend) |
| `DATABASE_URL_SYNC` | `postgresql://postgres:postgres@postgres:5432/trade_engine` | Sync connection string (for migrations if needed) |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `trade_engine` | PostgreSQL database name |

### Security

| Variable | Default | Description |
|---|---|---|
| `SECRET_KEY` | `change-me-...` | Application secret key. **Change in production.** Generate: `openssl rand -hex 32` |
| `JWT_SECRET` | `change-me-...` | JWT signing key. **Change in production.** Generate: `openssl rand -hex 32` |
| `JWT_ALGORITHM` | `HS256` | JWT signing algorithm |
| `JWT_EXPIRE_MINUTES` | `1440` (24 hours) | JWT token expiration time in minutes |

### CORS

| Variable | Default | Description |
|---|---|---|
| `CORS_ORIGINS` | `*` | Allowed origins. For production, set to your domain: `https://sub.mydomain.com` |

### Admin User

| Variable | Default | Description |
|---|---|---|
| `DEFAULT_ADMIN_USERNAME` | `admin` | Username of the admin user created on first startup |
| `DEFAULT_ADMIN_PASSWORD` | `admin123` | Password of the admin user. **Change in production.** |

## Production `.env` Example

```env
# Database
DATABASE_URL=postgresql+asyncpg://postgres:str0ngPa55w0rd!@postgres:5432/trade_engine
DATABASE_URL_SYNC=postgresql://postgres:str0ngPa55w0rd!@postgres:5432/trade_engine
POSTGRES_USER=postgres
POSTGRES_PASSWORD=str0ngPa55w0rd!
POSTGRES_DB=trade_engine

# Security — GENERATE THESE WITH: openssl rand -hex 32
SECRET_KEY=a3f8c2e9d1b4f7a6e0c3d5b8a1f4e7d2c6b9a0f3e8d1c4b7a2e5f8d0c3a6b9
JWT_SECRET=f1e4d7c0b3a6f9e2d5c8b1a4f7e0d3c6b9a2f5e8d1c4b7a0e3f6d9c2b5a8f1
JWT_ALGORITHM=HS256
JWT_EXPIRE_MINUTES=1440

# CORS
CORS_ORIGINS=https://sub.mydomain.com

# Admin
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=MyStr0ngAdm1nPa55!
```

## Security Checklist

- [ ] Changed `SECRET_KEY` from default
- [ ] Changed `JWT_SECRET` from default
- [ ] Changed `DEFAULT_ADMIN_PASSWORD` from default
- [ ] Changed `POSTGRES_PASSWORD` from default
- [ ] Set `CORS_ORIGINS` to your specific domain (not `*`)
- [ ] Enabled firewall — only ports 80 and 443 exposed
- [ ] SSL/HTTPS configured
- [ ] Database not exposed to public internet (port 5432 not in firewall)

## Rate Limiting

The backend uses `slowapi` for rate limiting. Currently configured at the application level on the default rate (no per-endpoint limits set). To add stricter limits, modify individual router endpoints:

```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/webhook/{token}")
@limiter.limit("30/minute")
async def receive_webhook(request: Request, token: str, payload: SignalPayload):
    ...
```

## Nginx Configuration

The nginx reverse proxy handles:

| Route | Destination | Features |
|---|---|---|
| `/` | Frontend (port 80) | Static file serving, SPA fallback |
| `/api/` | Backend (port 8000) | HTTP/1.1, WebSocket upgrade support |
| `/webhook/` | Backend (port 8000) | Signal ingestion |

WebSocket connections to `/api/ws` are automatically upgraded via the nginx `Upgrade` and `Connection` headers, with a read timeout of 86400 seconds (24 hours).
