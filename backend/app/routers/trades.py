from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.database import get_db
from app.models.trade import Trade
from app.models.user import User
from app.schemas.schemas import TradeResponse, ExitStrategyUpdate
from app.services.auth_service import get_current_user
from app.services.trade_engine import close_trade_manually
from app.services.log_service import add_log
from app.services.ws_broadcaster import ws_manager
from typing import List, Optional

router = APIRouter(prefix="/api/trades", tags=["trades"])

ACTIVE_STATUSES = ["SIGNAL_RECEIVED", "WAITING_ENTRY", "ORDER_PLACED", "POSITION_ACTIVE",
                   "TARGET1_HIT", "TARGET2_HIT"]
COMPLETED_STATUSES = ["TARGET3_HIT", "STOPLOSS_HIT", "COMPLETED", "MANUALLY_CLOSED"]


@router.get("", response_model=List[TradeResponse])
async def list_trades(
    filter: Optional[str] = None,  # "active" or "completed"
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Trade).order_by(Trade.created_at.desc()).limit(limit)
    if filter == "active":
        query = query.where(Trade.status.in_(ACTIVE_STATUSES))
    elif filter == "completed":
        query = query.where(Trade.status.in_(COMPLETED_STATUSES))
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{trade_id}", response_model=TradeResponse)
async def get_trade(
    trade_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = await db.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    return trade


@router.patch("/{trade_id}/exit-strategy", response_model=TradeResponse)
async def update_exit_strategy(
    trade_id: int,
    data: ExitStrategyUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    trade = await db.get(Trade, trade_id)
    if not trade:
        raise HTTPException(status_code=404, detail="Trade not found")
    if trade.status in COMPLETED_STATUSES:
        raise HTTPException(status_code=400, detail="Cannot modify completed trade")

    old_strategy = trade.exit_strategy
    trade.exit_strategy = data.exit_strategy.value
    await db.commit()
    await db.refresh(trade)

    await add_log(
        db, "SYSTEM",
        f"Exit strategy changed from {old_strategy} to {trade.exit_strategy}",
        trade_id=trade.id
    )
    await ws_manager.broadcast_trade_update({
        "id": trade.id, "symbol": trade.symbol,
        "exit_strategy": trade.exit_strategy, "status": trade.status,
    })
    return trade


@router.post("/{trade_id}/close")
async def close_trade(
    trade_id: int,
    current_user: User = Depends(get_current_user),
):
    result = await close_trade_manually(trade_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result.get("error", "Failed"))
    return result
