# Webhook Guide

## Overview

Webhooks allow external systems (TradingView, ChartInk, custom scripts, n8n workflows) to send trading signals to the Trade Engine. Each webhook generates a unique URL that maps to specific accounts and strategy configuration.

## Creating a Webhook

1. Navigate to **Webhooks** page in the dashboard
2. Click **Create Webhook**
3. Fill in the configuration:
   - **Name**: Descriptive label (e.g., "Nifty Breakout Strategy")
   - **Strategy Name**: Internal identifier (e.g., "nifty_breakout_v2")
   - **Default Quantity**: Order quantity if not specified in signal
   - **Product Type**: MIS (intraday), CNC (delivery), NRML (F&O)
   - **Exchange**: NSE, BSE, NFO, MCX, BFO
   - **Default Exit Strategy**: How targets/SL are managed
   - **Target Accounts**: Which OpenAlgo accounts receive trades
4. Click **Create** — a unique webhook URL is generated

## Webhook URL Format

```
https://your-server.com/webhook/{token}
```

Example:
```
https://sub.mydomain.com/webhook/xK9m2Lp4RqTz7Wn8
```

Click the **copy icon** on the Webhooks page to copy the full URL.

## Signal Payload

### Full Payload (all fields)

```json
{
  "symbol": "RELIANCE",
  "exchange": "NSE",
  "action": "BUY",
  "entry": 2500,
  "t1": 2520,
  "t2": 2550,
  "t3": 2580,
  "sl": 2470,
  "quantity": 10
}
```

### Minimal Payload (required fields only)

```json
{
  "symbol": "RELIANCE",
  "action": "BUY",
  "entry": 2500,
  "sl": 2470
}
```

When `quantity` is omitted, the webhook's `default_quantity` is used.
When `exchange` is omitted, the webhook's configured exchange is used.

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `symbol` | string | ✅ | Trading symbol exactly as it appears in OpenAlgo |
| `exchange` | string | ❌ | Overrides webhook default. Values: NSE, BSE, NFO, MCX, BFO |
| `action` | string | ✅ | `BUY` or `SELL` (case-insensitive) |
| `entry` | number | ✅ | Entry price level |
| `t1` | number | ❌ | Target 1 price |
| `t2` | number | ❌ | Target 2 price |
| `t3` | number | ❌ | Target 3 price |
| `sl` | number | ✅ | Stoploss price |
| `quantity` | integer | ❌ | Overrides webhook default quantity |

## Exit Strategies

The exit strategy can be set as a default on the webhook, and **overridden per trade** from the Active Positions page.

### TARGET1_EXIT
- Exit **100% quantity** when T1 is hit
- Simplest strategy — one target, one exit

### TARGET1_TRAIL
- Exit **50% quantity** at T1
- Move stoploss to **entry price** (breakeven) for remaining
- Continue monitoring T2, T3 with progressively trailing SL

### FULL_TARGET_RUN
- Exit **40%** at T1
- Exit **30%** at T2
- Exit **30%** at T3
- Scale-out strategy for maximizing trending moves

### SL_ONLY
- **No target exits** — only the stoploss triggers an exit
- Useful for momentum/trend-following strategies where you don't want automatic profit-taking

## Integration Examples

### TradingView Alert

In TradingView, create an alert with:
- **Webhook URL**: Your webhook URL
- **Message** (JSON):
```json
{
  "symbol": "{{ticker}}",
  "exchange": "NSE",
  "action": "{{strategy.order.action}}",
  "entry": {{close}},
  "t1": {{plot_0}},
  "sl": {{plot_1}},
  "quantity": 10
}
```

### cURL

```bash
curl -X POST https://sub.mydomain.com/webhook/xK9m2Lp4RqTz7Wn8 \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "RELIANCE",
    "exchange": "NSE",
    "action": "BUY",
    "entry": 2500,
    "t1": 2520,
    "t2": 2550,
    "t3": 2580,
    "sl": 2470,
    "quantity": 10
  }'
```

### Python

```python
import requests

url = "https://sub.mydomain.com/webhook/xK9m2Lp4RqTz7Wn8"
signal = {
    "symbol": "NIFTY24MARFUT",
    "exchange": "NFO",
    "action": "BUY",
    "entry": 22000,
    "t1": 22050,
    "t2": 22100,
    "t3": 22150,
    "sl": 21950,
    "quantity": 50
}
response = requests.post(url, json=signal)
print(response.json())
```

### n8n Workflow

1. Create an **HTTP Request** node
2. **Method**: POST
3. **URL**: Your webhook URL
4. **Body Content Type**: JSON
5. **Body**: Map your signal fields

### ChartInk Scanner

ChartInk can call webhooks when scanner conditions are met. Configure the webhook URL in ChartInk's alert settings and format the payload as JSON.

## What Happens After a Signal

1. **Validation**: Token is checked, payload is validated
2. **Signal Saved**: Stored in database with status `RECEIVED`
3. **Trade Creation**: One trade per target account is created
4. **Order Placement**: Entry order placed via OpenAlgo `placeorder()`
5. **Price Monitoring**: Trade engine monitors LTP every 500ms
6. **Target/SL Execution**: Based on the exit strategy, partial or full exits are triggered
7. **Logging**: Every event is logged and broadcast to the dashboard

## Troubleshooting

| Issue | Solution |
|---|---|
| `404 Invalid webhook token` | Check the token in your URL matches the one shown on the Webhooks page |
| Signal received but no trade | Verify account_ids are set on the webhook and accounts exist |
| Order not placed | Check account connection status on the Accounts page; review Logs for errors |
| Targets not hitting | Ensure T1/T2/T3 values are correct relative to action (T1 > entry for BUY) |
