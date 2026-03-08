from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Trade(Base):
    __tablename__ = "trades"

    id = Column(Integer, primary_key=True, index=True)
    signal_id = Column(Integer, ForeignKey("signals.id"), nullable=False)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=False)
    order_id = Column(String(100), nullable=True)
    symbol = Column(String(100), nullable=False)
    exchange = Column(String(20), default="NSE")
    action = Column(String(10), nullable=False)
    entry_price = Column(Float, nullable=True)
    current_price = Column(Float, nullable=True)
    exit_price = Column(Float, nullable=True)
    quantity = Column(Integer, nullable=False)
    remaining_qty = Column(Integer, nullable=False)
    pnl = Column(Float, default=0.0)
    status = Column(String(30), default="SIGNAL_RECEIVED")
    # SIGNAL_RECEIVED, WAITING_ENTRY, ORDER_PLACED, POSITION_ACTIVE,
    # TARGET1_HIT, TARGET2_HIT, TARGET3_HIT, STOPLOSS_HIT, COMPLETED, MANUALLY_CLOSED
    exit_strategy = Column(String(30), default="FULL_TARGET_RUN")
    # TARGET1_EXIT, TARGET1_TRAIL, FULL_TARGET_RUN, SL_ONLY
    product_type = Column(String(20), default="MIS")
    sl = Column(Float, nullable=True)
    t1 = Column(Float, nullable=True)
    t2 = Column(Float, nullable=True)
    t3 = Column(Float, nullable=True)
    trailing_sl = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
