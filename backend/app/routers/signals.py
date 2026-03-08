from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.signal import Signal
from app.models.user import User
from app.schemas.schemas import SignalResponse
from app.services.auth_service import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/signals", tags=["signals"])


@router.get("", response_model=List[SignalResponse])
async def list_signals(
    status: Optional[str] = None,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Signal).order_by(Signal.created_at.desc()).limit(limit)
    if status:
        query = query.where(Signal.status == status)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{signal_id}", response_model=SignalResponse)
async def get_signal(
    signal_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    signal = await db.get(Signal, signal_id)
    if not signal:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Signal not found")
    return signal
