from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.models.log import Log
from app.models.user import User
from app.schemas.schemas import LogResponse
from app.services.auth_service import get_current_user
from typing import List, Optional

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("", response_model=List[LogResponse])
async def list_logs(
    log_type: Optional[str] = None,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = select(Log).order_by(Log.timestamp.desc()).limit(limit)
    if log_type:
        query = query.where(Log.type == log_type)
    result = await db.execute(query)
    return result.scalars().all()
