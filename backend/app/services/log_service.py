from sqlalchemy.ext.asyncio import AsyncSession
from app.models.log import Log
from app.services.ws_broadcaster import ws_manager
from datetime import datetime, timezone


async def add_log(db: AsyncSession, log_type: str, message: str, trade_id: int = None):
    """Add a log entry to the database and broadcast to connected clients."""
    log = Log(
        type=log_type,
        message=message,
        trade_id=trade_id,
        timestamp=datetime.now(timezone.utc)
    )
    db.add(log)
    await db.commit()
    await db.refresh(log)

    # Broadcast to frontend
    await ws_manager.broadcast_log({
        "id": log.id,
        "type": log.type,
        "trade_id": log.trade_id,
        "message": log.message,
        "timestamp": log.timestamp.isoformat() if log.timestamp else None
    })
    return log
