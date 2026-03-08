from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase
from app.config import get_settings

settings = get_settings()

engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_size=20, max_overflow=10)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db():
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    # Import all models so SQLAlchemy registers them with Base.metadata
    from app.models.user import User        # noqa: F401
    from app.models.account import Account  # noqa: F401
    from app.models.webhook import Webhook  # noqa: F401
    from app.models.signal import Signal    # noqa: F401
    from app.models.trade import Trade      # noqa: F401
    from app.models.log import Log          # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

