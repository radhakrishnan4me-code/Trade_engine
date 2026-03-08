from sqlalchemy import Column, Integer, String, DateTime, JSON
from sqlalchemy.sql import func
from app.database import Base


class Webhook(Base):
    __tablename__ = "webhooks"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    webhook_token = Column(String(100), unique=True, nullable=False, index=True)
    strategy_name = Column(String(200), nullable=False)
    account_ids = Column(JSON, default=list)  # List of account IDs
    default_quantity = Column(Integer, default=1)
    product_type = Column(String(20), default="MIS")  # MIS, CNC, NRML
    exchange = Column(String(20), default="NSE")
    default_exit_strategy = Column(String(30), default="FULL_TARGET_RUN")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
