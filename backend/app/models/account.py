from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    openalgo_url = Column(String(500), nullable=False)
    ws_url = Column(String(500), nullable=True)
    api_key = Column(String(500), nullable=False)
    status = Column(String(50), default="disconnected")  # connected, disconnected, error
    created_at = Column(DateTime(timezone=True), server_default=func.now())
