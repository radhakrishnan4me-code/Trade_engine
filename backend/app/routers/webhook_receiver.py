import asyncio
from fastapi import APIRouter, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import async_session
from app.models.webhook import Webhook
from app.models.signal import Signal
from app.schemas.schemas import SignalPayload
from app.services.trade_engine import process_signal
from app.services.log_service import add_log

router = APIRouter(tags=["webhook_receiver"])


@router.post("/webhook/{token}")
async def receive_webhook(token: str, payload: SignalPayload):
    """
    Receive a trading signal via webhook.
    No authentication required — validated by webhook token.
    """
    async with async_session() as db:
        result = await db.execute(select(Webhook).where(Webhook.webhook_token == token))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(status_code=404, detail="Invalid webhook token")

        # Determine quantity
        quantity = payload.quantity or webhook.default_quantity

        # Save signal
        signal = Signal(
            webhook_id=webhook.id,
            symbol=payload.symbol,
            exchange=payload.exchange or webhook.exchange,
            action=payload.action.upper(),
            entry=payload.entry,
            t1=payload.t1,
            t2=payload.t2,
            t3=payload.t3,
            sl=payload.sl,
            quantity=quantity,
            status="RECEIVED",
        )
        db.add(signal)
        await db.commit()
        await db.refresh(signal)

        await add_log(
            db, "SIGNAL",
            f"Signal received: {payload.action} {payload.symbol} @ {payload.entry} "
            f"SL={payload.sl} T1={payload.t1} T2={payload.t2} T3={payload.t3}"
        )

        # Process signal in background
        webhook_config = {
            "account_ids": webhook.account_ids or [],
            "default_exit_strategy": webhook.default_exit_strategy,
            "product_type": webhook.product_type,
            "default_quantity": webhook.default_quantity,
        }
        asyncio.create_task(process_signal(signal.id, webhook_config))

        return {
            "status": "received",
            "signal_id": signal.id,
            "symbol": signal.symbol,
            "action": signal.action,
        }
