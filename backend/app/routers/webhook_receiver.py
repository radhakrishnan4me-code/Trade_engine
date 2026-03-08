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
    All signal fields are optional and fall back to webhook defaults.
    """
    async with async_session() as db:
        result = await db.execute(select(Webhook).where(Webhook.webhook_token == token))
        webhook = result.scalar_one_or_none()

        if not webhook:
            raise HTTPException(status_code=404, detail="Invalid webhook token")

        # Merge with webhook defaults — signal values take priority
        symbol = payload.symbol or webhook.default_symbol
        exchange = payload.exchange or webhook.exchange
        action = payload.action or webhook.default_action
        entry = payload.entry if payload.entry is not None else webhook.default_entry
        sl = payload.sl if payload.sl is not None else webhook.default_sl
        t1 = payload.t1 if payload.t1 is not None else webhook.default_t1
        t2 = payload.t2 if payload.t2 is not None else webhook.default_t2
        t3 = payload.t3 if payload.t3 is not None else webhook.default_t3
        quantity = payload.quantity or webhook.default_quantity

        # Validate required fields after merge
        if not symbol:
            raise HTTPException(status_code=400, detail="symbol is required (not in signal or webhook defaults)")
        if not action:
            raise HTTPException(status_code=400, detail="action is required (not in signal or webhook defaults)")
        if entry is None:
            raise HTTPException(status_code=400, detail="entry is required (not in signal or webhook defaults)")
        if sl is None:
            raise HTTPException(status_code=400, detail="sl is required (not in signal or webhook defaults)")

        # Save signal
        signal = Signal(
            webhook_id=webhook.id,
            symbol=symbol,
            exchange=exchange,
            action=action.upper(),
            entry=entry,
            t1=t1,
            t2=t2,
            t3=t3,
            sl=sl,
            quantity=quantity,
            status="RECEIVED",
        )
        db.add(signal)
        await db.commit()
        await db.refresh(signal)

        await add_log(
            db, "SIGNAL",
            f"Signal received: {action} {symbol} @ {entry} "
            f"SL={sl} T1={t1} T2={t2} T3={t3}"
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
