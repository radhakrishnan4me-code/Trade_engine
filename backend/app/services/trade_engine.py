import asyncio
import logging
from typing import Dict, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from app.models.trade import Trade
from app.models.account import Account
from app.models.signal import Signal
from app.services.openalgo_manager import openalgo_manager
from app.services.ws_broadcaster import ws_manager
from app.services.log_service import add_log
from app.database import async_session

logger = logging.getLogger(__name__)

# Active trade monitoring tasks
_monitor_tasks: Dict[int, asyncio.Task] = {}


async def process_signal(signal_id: int, webhook_config: dict):
    """
    Process a new signal: create trades for each target account and start monitoring.
    """
    async with async_session() as db:
        signal = await db.get(Signal, signal_id)
        if not signal:
            return

        account_ids = webhook_config.get("account_ids", [])
        exit_strategy = webhook_config.get("default_exit_strategy", "FULL_TARGET_RUN")
        product_type = webhook_config.get("product_type", "MIS")
        default_qty = webhook_config.get("default_quantity", 1)

        quantity = signal.quantity or default_qty

        for account_id in account_ids:
            account = await db.get(Account, account_id)
            if not account:
                await add_log(db, "ERROR", f"Account {account_id} not found for signal {signal_id}")
                continue

            # Create trade record
            trade = Trade(
                signal_id=signal_id,
                account_id=account_id,
                symbol=signal.symbol,
                exchange=signal.exchange,
                action=signal.action,
                entry_price=signal.entry,
                quantity=quantity,
                remaining_qty=quantity,
                status="SIGNAL_RECEIVED",
                exit_strategy=exit_strategy,
                product_type=product_type,
                sl=signal.sl,
                t1=signal.t1,
                t2=signal.t2,
                t3=signal.t3,
            )
            db.add(trade)
            await db.commit()
            await db.refresh(trade)

            await add_log(
                db, "SIGNAL",
                f"Trade created: {signal.action} {signal.symbol} qty={quantity} for account {account.name}",
                trade_id=trade.id
            )

            # Broadcast trade update
            await ws_manager.broadcast_trade_update({
                "id": trade.id, "symbol": trade.symbol, "action": trade.action,
                "status": trade.status, "entry_price": trade.entry_price,
                "exit_strategy": trade.exit_strategy, "account_id": trade.account_id,
            })

            # Start trade execution in background
            asyncio.create_task(execute_trade(trade.id))

        # Update signal status
        signal.status = "PROCESSING"
        await db.commit()


async def execute_trade(trade_id: int):
    """Execute a single trade: place order and start monitoring."""
    async with async_session() as db:
        trade = await db.get(Trade, trade_id)
        if not trade:
            return

        account = await db.get(Account, trade.account_id)
        if not account:
            trade.status = "COMPLETED"
            await db.commit()
            return

        # Place entry order
        trade.status = "ORDER_PLACED"
        await db.commit()
        await add_log(db, "ORDER", f"Placing {trade.action} order for {trade.symbol} qty={trade.quantity}", trade.id)

        result = await openalgo_manager.place_order(
            account_id=account.id,
            openalgo_url=account.openalgo_url,
            api_key=account.api_key,
            ws_url=account.ws_url,
            symbol=trade.symbol,
            exchange=trade.exchange,
            action=trade.action,
            quantity=trade.quantity,
            product=trade.product_type,
        )

        if result["success"]:
            trade.order_id = str(result.get("data", {}).get("orderid", ""))
            trade.status = "POSITION_ACTIVE"
            await db.commit()
            await add_log(db, "ORDER", f"Order placed successfully: {trade.order_id}", trade.id)

            await ws_manager.broadcast_trade_update({
                "id": trade.id, "symbol": trade.symbol, "status": "POSITION_ACTIVE",
                "order_id": trade.order_id,
            })

            # Start price monitoring
            asyncio.create_task(monitor_trade(trade_id))
        else:
            trade.status = "COMPLETED"
            await db.commit()
            await add_log(db, "ERROR", f"Order failed: {result.get('error', 'Unknown')}", trade.id)


async def monitor_trade(trade_id: int):
    """Monitor a trade's price and execute target/stoploss logic."""
    while True:
        try:
            async with async_session() as db:
                trade = await db.get(Trade, trade_id)
                if not trade or trade.status in ("COMPLETED", "MANUALLY_CLOSED", "STOPLOSS_HIT"):
                    break

                if not trade.current_price:
                    await asyncio.sleep(1)
                    continue

                ltp = trade.current_price
                is_buy = trade.action == "BUY"

                # Check stoploss
                sl_price = trade.trailing_sl or trade.sl
                if sl_price:
                    sl_hit = (ltp <= sl_price) if is_buy else (ltp >= sl_price)
                    if sl_hit and trade.remaining_qty > 0:
                        await _exit_position(db, trade, trade.remaining_qty, ltp, "STOPLOSS_HIT")
                        break

                # Check targets based on exit strategy
                if trade.exit_strategy == "SL_ONLY":
                    pass  # Only stoploss, no target exits

                elif trade.exit_strategy == "TARGET1_EXIT":
                    if trade.t1 and trade.status == "POSITION_ACTIVE":
                        t1_hit = (ltp >= trade.t1) if is_buy else (ltp <= trade.t1)
                        if t1_hit:
                            await _exit_position(db, trade, trade.remaining_qty, ltp, "TARGET1_HIT")
                            break

                elif trade.exit_strategy == "TARGET1_TRAIL":
                    if trade.t1 and trade.status == "POSITION_ACTIVE":
                        t1_hit = (ltp >= trade.t1) if is_buy else (ltp <= trade.t1)
                        if t1_hit:
                            # Exit 50% at T1, trail SL to entry for rest
                            exit_qty = max(1, trade.remaining_qty // 2)
                            await _partial_exit(db, trade, exit_qty, ltp, "TARGET1_HIT")
                            trade.trailing_sl = trade.entry_price
                            await db.commit()
                            await add_log(db, "TARGET", f"T1 hit, trailing SL moved to entry {trade.entry_price}", trade.id)

                    # If already T1 hit, check T2/T3
                    if trade.t2 and trade.status == "TARGET1_HIT":
                        t2_hit = (ltp >= trade.t2) if is_buy else (ltp <= trade.t2)
                        if t2_hit:
                            exit_qty = max(1, trade.remaining_qty // 2)
                            await _partial_exit(db, trade, exit_qty, ltp, "TARGET2_HIT")
                            trade.trailing_sl = trade.t1
                            await db.commit()

                    if trade.t3 and trade.status == "TARGET2_HIT":
                        t3_hit = (ltp >= trade.t3) if is_buy else (ltp <= trade.t3)
                        if t3_hit:
                            await _exit_position(db, trade, trade.remaining_qty, ltp, "TARGET3_HIT")
                            break

                elif trade.exit_strategy == "FULL_TARGET_RUN":
                    if trade.t1 and trade.status == "POSITION_ACTIVE":
                        t1_hit = (ltp >= trade.t1) if is_buy else (ltp <= trade.t1)
                        if t1_hit:
                            exit_qty = max(1, int(trade.quantity * 0.4))
                            await _partial_exit(db, trade, exit_qty, ltp, "TARGET1_HIT")

                    if trade.t2 and trade.status == "TARGET1_HIT":
                        t2_hit = (ltp >= trade.t2) if is_buy else (ltp <= trade.t2)
                        if t2_hit:
                            exit_qty = max(1, int(trade.quantity * 0.3))
                            await _partial_exit(db, trade, exit_qty, ltp, "TARGET2_HIT")

                    if trade.t3 and trade.status == "TARGET2_HIT":
                        t3_hit = (ltp >= trade.t3) if is_buy else (ltp <= trade.t3)
                        if t3_hit:
                            await _exit_position(db, trade, trade.remaining_qty, ltp, "TARGET3_HIT")
                            break

        except Exception as e:
            logger.error(f"Error monitoring trade {trade_id}: {e}")

        await asyncio.sleep(0.5)  # Check every 500ms


async def _partial_exit(db: AsyncSession, trade: Trade, qty: int, price: float, new_status: str):
    """Execute a partial exit for the trade."""
    account = await db.get(Account, trade.account_id)
    if not account:
        return

    exit_action = "SELL" if trade.action == "BUY" else "BUY"
    actual_qty = min(qty, trade.remaining_qty)

    result = await openalgo_manager.place_order(
        account_id=account.id,
        openalgo_url=account.openalgo_url,
        api_key=account.api_key,
        ws_url=account.ws_url,
        symbol=trade.symbol,
        exchange=trade.exchange,
        action=exit_action,
        quantity=actual_qty,
        product=trade.product_type,
    )

    if result["success"]:
        trade.remaining_qty -= actual_qty
        trade.status = new_status
        if trade.remaining_qty <= 0:
            trade.status = "COMPLETED"
            trade.exit_price = price
            multiplier = 1 if trade.action == "BUY" else -1
            trade.pnl = (price - (trade.entry_price or 0)) * trade.quantity * multiplier
        await db.commit()
        await add_log(db, "TARGET", f"{new_status}: Exited {actual_qty} qty at {price}", trade.id)
        await ws_manager.broadcast_trade_update({
            "id": trade.id, "symbol": trade.symbol, "status": trade.status,
            "remaining_qty": trade.remaining_qty, "pnl": trade.pnl,
        })


async def _exit_position(db: AsyncSession, trade: Trade, qty: int, price: float, reason: str):
    """Full exit of remaining position."""
    account = await db.get(Account, trade.account_id)
    if not account:
        return

    exit_action = "SELL" if trade.action == "BUY" else "BUY"

    result = await openalgo_manager.place_order(
        account_id=account.id,
        openalgo_url=account.openalgo_url,
        api_key=account.api_key,
        ws_url=account.ws_url,
        symbol=trade.symbol,
        exchange=trade.exchange,
        action=exit_action,
        quantity=qty,
        product=trade.product_type,
    )

    if result["success"]:
        trade.remaining_qty = 0
        trade.exit_price = price
        trade.status = reason if reason != "STOPLOSS_HIT" else "STOPLOSS_HIT"
        multiplier = 1 if trade.action == "BUY" else -1
        trade.pnl = (price - (trade.entry_price or 0)) * trade.quantity * multiplier
        if reason not in ("STOPLOSS_HIT",):
            trade.status = "COMPLETED"
        await db.commit()
        await add_log(db, "TARGET" if "TARGET" in reason else "STOPLOSS",
                      f"{reason}: Exited {qty} qty at {price}, PNL: {trade.pnl:.2f}", trade.id)
        await ws_manager.broadcast_trade_update({
            "id": trade.id, "symbol": trade.symbol, "status": trade.status,
            "exit_price": trade.exit_price, "pnl": trade.pnl, "remaining_qty": 0,
        })
    else:
        await add_log(db, "ERROR", f"Exit order failed: {result.get('error')}", trade.id)


async def close_trade_manually(trade_id: int):
    """Manually close a trade from the frontend."""
    async with async_session() as db:
        trade = await db.get(Trade, trade_id)
        if not trade or trade.remaining_qty <= 0:
            return {"success": False, "error": "Trade not active"}

        account = await db.get(Account, trade.account_id)
        if not account:
            return {"success": False, "error": "Account not found"}

        exit_action = "SELL" if trade.action == "BUY" else "BUY"

        result = await openalgo_manager.place_order(
            account_id=account.id,
            openalgo_url=account.openalgo_url,
            api_key=account.api_key,
            ws_url=account.ws_url,
            symbol=trade.symbol,
            exchange=trade.exchange,
            action=exit_action,
            quantity=trade.remaining_qty,
            product=trade.product_type,
        )

        if result["success"]:
            price = trade.current_price or trade.entry_price or 0
            trade.remaining_qty = 0
            trade.exit_price = price
            trade.status = "MANUALLY_CLOSED"
            multiplier = 1 if trade.action == "BUY" else -1
            trade.pnl = (price - (trade.entry_price or 0)) * trade.quantity * multiplier
            await db.commit()
            await add_log(db, "ORDER", f"Trade manually closed at {price}", trade.id)
            await ws_manager.broadcast_trade_update({
                "id": trade.id, "symbol": trade.symbol, "status": "MANUALLY_CLOSED",
                "exit_price": trade.exit_price, "pnl": trade.pnl, "remaining_qty": 0,
            })
            return {"success": True}
        else:
            return {"success": False, "error": result.get("error", "Unknown")}


async def update_trade_price(symbol: str, exchange: str, ltp: float):
    """Update current price for all active trades matching the symbol."""
    async with async_session() as db:
        result = await db.execute(
            select(Trade).where(
                and_(
                    Trade.symbol == symbol,
                    Trade.exchange == exchange,
                    Trade.status.notin_(["COMPLETED", "MANUALLY_CLOSED", "STOPLOSS_HIT"])
                )
            )
        )
        trades = result.scalars().all()
        for trade in trades:
            trade.current_price = ltp
        if trades:
            await db.commit()
