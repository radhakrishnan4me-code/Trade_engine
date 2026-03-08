# Trade Engine Documentation

## Overview

The Trade Engine is the core service responsible for executing trades, monitoring prices, and managing the complete trade lifecycle from signal receipt to position exit.

## Trade Lifecycle

```
SIGNAL_RECEIVED
      │
      ▼
WAITING_ENTRY ─── (optional, if entry price monitoring is needed)
      │
      ▼
ORDER_PLACED ──── Entry order sent to OpenAlgo
      │
      ▼
POSITION_ACTIVE ── Monitoring LTP for targets/SL
      │
      ├───► TARGET1_HIT ── Partial exit (strategy dependent)
      │         │
      │         ├───► TARGET2_HIT ── Partial exit
      │         │         │
      │         │         └───► TARGET3_HIT ── Full exit → COMPLETED
      │         │
      │         └───► STOPLOSS_HIT (trailing SL)
      │
      ├───► STOPLOSS_HIT ── Full exit
      │
      └───► MANUALLY_CLOSED ── User clicked Close Position
```

## Exit Strategies in Detail

### TARGET1_EXIT

```
Entry ────────────── T1 (exit 100%)
  └── SL (exit 100%)
```

- **When T1 is reached**: Exit the entire position at market
- **When SL is hit**: Exit the entire position at market
- **Best for**: Scalping, quick trades with defined risk:reward

### TARGET1_TRAIL

```
Entry ──── T1 (exit 50%) ──── T2 (exit 50% of remaining) ──── T3 (exit rest)
  └── SL           └── Trail SL to Entry    └── Trail SL to T1
```

- **When T1 is reached**: Exit 50% at T1, move stoploss to entry price (breakeven)
- **When T2 is reached**: Exit 50% of remaining, move SL to T1
- **When T3 is reached**: Exit everything
- **Trailing SL**: If SL is hit after T1, exits at the trailing level
- **Best for**: Swing trades where you want partial profit + risk-free runners

### FULL_TARGET_RUN

```
Entry ──── T1 (exit 40%) ──── T2 (exit 30%) ──── T3 (exit 30%)
  └── SL (exit 100%)
```

- **When T1 is reached**: Exit 40% of original quantity
- **When T2 is reached**: Exit 30% of original quantity
- **When T3 is reached**: Exit remaining 30%
- **Best for**: Trending trades where you want to ride the full move with partial profits

### SL_ONLY

```
Entry ─────────────────────── (no target exits)
  └── SL (exit 100%)
```

- **No automatic target exits**
- Only the stoploss triggers an exit
- **Best for**: Momentum/breakout strategies where you manually decide when to exit

## Changing Exit Strategy Mid-Trade

From the **Active Positions** page:
1. Find the active trade
2. Use the **Exit Strategy** dropdown to select a new strategy
3. The trade engine immediately re-evaluates with the new logic

Example scenarios:
- Trade is in FULL_TARGET_RUN, T1 hasn't hit yet → Switch to TARGET1_EXIT to take quick profits
- Trade hit T1 in TARGET1_EXIT mode → Nothing changes (already fully exited)
- Trade is in SL_ONLY → Switch to TARGET1_TRAIL to start taking targets

## Manual Trade Close

Click the **✕ (Close Position)** button on any active trade to:
1. Place a market exit order for the remaining quantity
2. Set status to `MANUALLY_CLOSED`
3. Calculate final PNL
4. Log the closure event

## Order Execution

All orders are placed through the OpenAlgo Python SDK:

```python
client.placeorder(
    symbol="RELIANCE",
    exchange="NSE",
    action="BUY",       # or "SELL" for exit
    quantity=10,
    price_type="MARKET",
    product="MIS"
)
```

- Entry orders use the **action** from the signal (BUY/SELL)
- Exit orders use the **opposite action** (SELL for BUY entries, BUY for SELL entries)
- All orders are placed at **MARKET** price type for immediate execution
- The **product type** (MIS/CNC/NRML) comes from the webhook configuration

## Price Monitoring

The trade engine monitors each active trade in an async loop:

```
while trade is active:
    1. Read current_price from trade record
    2. Check stoploss condition
    3. Check target conditions (based on exit_strategy)
    4. Execute exits if conditions met
    5. Sleep 500ms
```

Current price is updated via:
- OpenAlgo WebSocket LTP subscriptions (when available)
- The `update_trade_price()` function called by the WebSocket monitor

## Multi-Account Routing

When a signal is received:
1. The webhook's `account_ids` list is iterated
2. For **each account**, a separate Trade record is created
3. Each trade is executed independently against its own OpenAlgo instance
4. Each trade can have its own exit strategy (changed independently)

This means one signal can create trades on 3 different broker accounts simultaneously, each managed independently.

## Error Handling

| Scenario | Behavior |
|---|---|
| OpenAlgo account unreachable | Trade marked COMPLETED, error logged |
| Order placement fails | Trade marked COMPLETED, error logged |
| Exit order fails | Error logged, retry on next monitor loop |
| Account not found | Trade skipped, error logged |
| WebSocket disconnection | Auto-reconnect after 3 seconds |

All errors are:
1. Logged to the `logs` database table
2. Broadcast to the frontend via WebSocket
3. Visible on the **Logs** page with type `ERROR`
