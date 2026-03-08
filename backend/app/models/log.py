from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base


class Log(Base):
    __tablename__ = "logs"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String(50), nullable=False)  # SIGNAL, ORDER, TARGET, STOPLOSS, ERROR, SYSTEM
    trade_id = Column(Integer, ForeignKey("trades.id"), nullable=True)
    message = Column(String(1000), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
