from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase
from sqlalchemy.pool import NullPool
from app.config import get_settings

settings = get_settings()


engine = create_engine(
    settings.DATABASE_URL,
    poolclass=NullPool,
    # Only log SQL queries in development
    echo=settings.ENVIRONMENT == "development",
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    """All SQLAlchemy models inherit from this."""

    pass


def get_db():
    """
    FastAPI dependency — provides a DB session per request.
    Automatically closes when the request finishes.
    Usage: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
