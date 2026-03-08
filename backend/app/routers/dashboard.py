from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import datetime, timezone, timedelta
from app.database import get_db
from app.models.signal import Signal
from app.models.trade import Trade
from app.models.account import Account
from app.models.user import User
from app.schemas.schemas import DashboardStats
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

ACTIVE_STATUSES = ["SIGNAL_RECEIVED", "WAITING_ENTRY", "ORDER_PLACED", "POSITION_ACTIVE",
                   "TARGET1_HIT", "TARGET2_HIT"]


@router.get("/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # Total signals
    total_signals = await db.execute(select(func.count(Signal.id)))
    total_signals_count = total_signals.scalar() or 0

    # Active trades
    active_trades = await db.execute(
        select(func.count(Trade.id)).where(Trade.status.in_(ACTIVE_STATUSES))
    )
    active_trades_count = active_trades.scalar() or 0

    # Connected accounts
    connected = await db.execute(
        select(func.count(Account.id)).where(Account.status == "connected")
    )
    connected_count = connected.scalar() or 0

    # Completed today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    completed_today = await db.execute(
        select(func.count(Trade.id)).where(
            and_(
                Trade.status.in_(["COMPLETED", "MANUALLY_CLOSED", "STOPLOSS_HIT", "TARGET3_HIT"]),
                Trade.updated_at >= today_start
            )
        )
    )
    completed_count = completed_today.scalar() or 0

    # PNL today
    pnl_result = await db.execute(
        select(func.coalesce(func.sum(Trade.pnl), 0)).where(
            and_(
                Trade.status.in_(["COMPLETED", "MANUALLY_CLOSED", "STOPLOSS_HIT", "TARGET3_HIT"]),
                Trade.updated_at >= today_start
            )
        )
    )
    total_pnl = float(pnl_result.scalar() or 0)

    return DashboardStats(
        total_signals=total_signals_count,
        active_trades=active_trades_count,
        connected_accounts=connected_count,
        completed_today=completed_count,
        total_pnl_today=total_pnl,
    )
