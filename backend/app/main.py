import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app.database import init_db, async_session
from app.services.auth_service import seed_admin_user

from app.routers import auth, accounts, webhooks, signals, trades, logs, dashboard, ws, webhook_receiver

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting Trade Engine...")
    await init_db()
    logger.info("Database initialized.")

    # Seed admin user
    async with async_session() as db:
        await seed_admin_user(db)

    yield

    # Shutdown
    from app.services.openalgo_manager import openalgo_manager
    openalgo_manager.disconnect_all()
    logger.info("Trade Engine shutdown complete.")


app = FastAPI(
    title="OpenAlgo Trade Engine",
    description="Multi-account trading automation platform",
    version="1.0.0",
    lifespan=lifespan,
)

# Rate limiting
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
origins = settings.CORS_ORIGINS.split(",") if settings.CORS_ORIGINS != "*" else ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(webhooks.router)
app.include_router(signals.router)
app.include_router(trades.router)
app.include_router(logs.router)
app.include_router(dashboard.router)
app.include_router(ws.router)
app.include_router(webhook_receiver.router)


@app.get("/api/health")
async def health():
    return {"status": "healthy", "service": "trade_engine"}
