from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.models.user import User
from app.config import get_settings

settings = get_settings()

# ── Password Hashing ──────────────────────────────────────────
# bcrypt cost factor 12 — matches our security spec NFR-11
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=12)


def hash_password(plain_password: str) -> str:
    """
    Hash a plain text password using bcrypt cost 12.
    Call this when creating a user. Never store plain text.
    """
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Compare a plain text password against a bcrypt hash.
    Returns True if they match, False otherwise.
    Timing-safe — not vulnerable to timing attacks.
    """
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Token Creation ────────────────────────────────────────

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Create a signed JWT access token.
    Token expires in ACCESS_TOKEN_EXPIRE_MINUTES (24 hours by default).
    Signed with SECRET_KEY — tampering will fail signature verification.
    """
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> Optional[dict]:
    """
    Decode and verify a JWT token.
    Returns the payload dict if valid.
    Returns None if expired, tampered, or invalid.
    Never raises — callers check for None.
    """
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        return payload
    except JWTError:
        return None


# ── User Lookup ───────────────────────────────────────────────

def get_user_by_username(db: Session, username: str) -> Optional[User]:
    """
    Look up a user by username.
    Username is always stored and compared lowercase.
    """
    return db.query(User).filter(
        User.username == username.lower(),
        User.is_active == True
    ).first()


def authenticate_user(db: Session, username: str, password: str) -> Optional[User]:
    """
    Verify username + password.
    Returns the User object if credentials are valid.
    Returns None if user not found OR password wrong.
    SECURITY: We return the same None for both cases —
    an attacker cannot tell whether the username exists.
    """
    user = get_user_by_username(db, username)
    if not user:
        # Still call verify_password to prevent timing attacks
        # that could reveal whether a username exists
        pwd_context.dummy_verify()
        return None
    if not verify_password(password, user.password_hash):
        return None
    return user