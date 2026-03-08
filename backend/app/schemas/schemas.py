from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum


# ---- Enums ----
class ExitStrategy(str, Enum):
    TARGET1_EXIT = "TARGET1_EXIT"
    TARGET1_TRAIL = "TARGET1_TRAIL"
    FULL_TARGET_RUN = "FULL_TARGET_RUN"
    SL_ONLY = "SL_ONLY"


class TradeStatus(str, Enum):
    SIGNAL_RECEIVED = "SIGNAL_RECEIVED"
    WAITING_ENTRY = "WAITING_ENTRY"
    ORDER_PLACED = "ORDER_PLACED"
    POSITION_ACTIVE = "POSITION_ACTIVE"
    TARGET1_HIT = "TARGET1_HIT"
    TARGET2_HIT = "TARGET2_HIT"
    TARGET3_HIT = "TARGET3_HIT"
    STOPLOSS_HIT = "STOPLOSS_HIT"
    COMPLETED = "COMPLETED"
    MANUALLY_CLOSED = "MANUALLY_CLOSED"


# ---- Auth ----
class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserCreate(BaseModel):
    username: str
    password: str


# ---- Account ----
class AccountCreate(BaseModel):
    name: str
    openalgo_url: str
    ws_url: Optional[str] = None
    api_key: str


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    openalgo_url: Optional[str] = None
    ws_url: Optional[str] = None
    api_key: Optional[str] = None


class AccountResponse(BaseModel):
    id: int
    name: str
    openalgo_url: str
    ws_url: Optional[str] = None
    api_key: str
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---- Webhook ----
class WebhookCreate(BaseModel):
    name: str
    strategy_name: str
    account_ids: List[int] = []
    default_quantity: int = 1
    product_type: str = "MIS"
    exchange: str = "NSE"
    default_exit_strategy: ExitStrategy = ExitStrategy.FULL_TARGET_RUN


class WebhookUpdate(BaseModel):
    name: Optional[str] = None
    strategy_name: Optional[str] = None
    account_ids: Optional[List[int]] = None
    default_quantity: Optional[int] = None
    product_type: Optional[str] = None
    exchange: Optional[str] = None
    default_exit_strategy: Optional[ExitStrategy] = None


class WebhookResponse(BaseModel):
    id: int
    name: str
    webhook_token: str
    strategy_name: str
    account_ids: List[int]
    default_quantity: int
    product_type: str
    exchange: str
    default_exit_strategy: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---- Signal ----
class SignalPayload(BaseModel):
    symbol: str
    exchange: str = "NSE"
    action: str  # BUY or SELL
    entry: float
    t1: Optional[float] = None
    t2: Optional[float] = None
    t3: Optional[float] = None
    sl: float
    quantity: Optional[int] = None


class SignalResponse(BaseModel):
    id: int
    webhook_id: int
    symbol: str
    exchange: str
    action: str
    entry: float
    t1: Optional[float] = None
    t2: Optional[float] = None
    t3: Optional[float] = None
    sl: float
    quantity: int
    status: str
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---- Trade ----
class TradeResponse(BaseModel):
    id: int
    signal_id: int
    account_id: int
    order_id: Optional[str] = None
    symbol: str
    exchange: str
    action: str
    entry_price: Optional[float] = None
    current_price: Optional[float] = None
    exit_price: Optional[float] = None
    quantity: int
    remaining_qty: int
    pnl: float
    status: str
    exit_strategy: str
    product_type: str
    sl: Optional[float] = None
    t1: Optional[float] = None
    t2: Optional[float] = None
    t3: Optional[float] = None
    trailing_sl: Optional[float] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ExitStrategyUpdate(BaseModel):
    exit_strategy: ExitStrategy


# ---- Log ----
class LogResponse(BaseModel):
    id: int
    type: str
    trade_id: Optional[int] = None
    message: str
    timestamp: Optional[datetime] = None

    class Config:
        from_attributes = True


# ---- Dashboard ----
class DashboardStats(BaseModel):
    total_signals: int
    active_trades: int
    connected_accounts: int
    completed_today: int
    total_pnl_today: float
