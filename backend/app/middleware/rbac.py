from typing import List
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app.services.auth_service import decode_access_token
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Extracts and validates the JWT token from the Authorization header.
    Returns the current User if valid.
    Raises 401 if token is missing, expired, or tampered.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    payload = decode_access_token(token)

    if payload is None:
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    user = db.query(User).filter(
        User.id == user_id,
        User.is_active == True
    ).first()

    if user is None:
        raise credentials_exception

    return user


def require_roles(allowed_roles: List[UserRole]):
    """
    Dependency factory — restricts endpoint to specific roles.
    Raises 403 if user's role is not in allowed_roles.

    Usage:
        @router.post("/", dependencies=[Depends(require_roles([UserRole.admin]))])
    """
    def role_checker(
        current_user: User = Depends(get_current_user)
    ) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden",
            )
        return current_user
    return role_checker