from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    webhook_id = Column(Integer, ForeignKey("webhooks.id"), nullable=False)
    symbol = Column(String(100), nullable=False)
    exchange = Column(String(20), default="NSE")
    action = Column(String(10), nullable=False)  # BUY, SELL
    entry = Column(Float, nullable=False)
    t1 = Column(Float, nullable=True)
    t2 = Column(Float, nullable=True)
    t3 = Column(Float, nullable=True)
    sl = Column(Float, nullable=False)
    quantity = Column(Integer, nullable=False)
    status = Column(String(30), default="RECEIVED")  # RECEIVED, PROCESSING, EXECUTED, FAILED
    created_at = Column(DateTime(timezone=True), server_default=func.now())
