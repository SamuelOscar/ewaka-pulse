from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.user import User, UserRole
from app.models.audit_log import AuditLog
from app.schemas.auth import (
    LoginRequest,
    TokenResponse,
    UserResponse,
    CreateUserRequest,
)
from app.services.auth_service import (
    authenticate_user,
    create_access_token,
    hash_password,
    get_user_by_username,
)
from app.middleware.rbac import get_current_user, require_roles
import uuid

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=TokenResponse)
def login(
    request: Request,
    body: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Authenticate a user and return a JWT access token.

    SECURITY:
    - Same error message for wrong username OR wrong password
    - Failed attempts are written to audit_logs
    - IP address logged for monitoring
    """
    ip = request.client.host if request.client else "unknown"
    user = authenticate_user(db, body.username, body.password)

    if not user:
        # Log failed login attempt — security audit trail
        audit = AuditLog(
            id=str(uuid.uuid4()),
            user_id=None,
            action="LOGIN_FAILED",
            entity_type="user",
            details=f"Failed login attempt for username: {body.username}",
            ip_address=ip,
        )
        db.add(audit)
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create JWT token — payload contains user ID and role
    token_data = {"sub": user.id, "role": user.role.value}
    access_token = create_access_token(data=token_data)

    # Log successful login
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="user",
        entity_id=user.id,
        ip_address=ip,
    )
    db.add(audit)

    # Update last login timestamp
    user.last_login = __import__("datetime").datetime.utcnow()
    db.commit()

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """
    Return the currently authenticated user's profile.
    Requires a valid JWT token in the Authorization header.
    SECURITY: Never returns password_hash.
    """
    return UserResponse(
        id=current_user.id,
        username=current_user.username,
        role=current_user.role.value,
        is_active=current_user.is_active,
    )


@router.post("/users", status_code=status.HTTP_201_CREATED)
def create_user(
    body: CreateUserRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles([UserRole.admin])),
):
    """
    Create a new system user. Admin only.

    SECURITY:
    - Only admin role can call this endpoint
    - Password is hashed before storage — plain text never touches the DB
    - Duplicate username returns 409, not 500
    """
    # Check for duplicate username
    existing = get_user_by_username(db, body.username)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already exists",
        )

    new_user = User(
        id=str(uuid.uuid4()),
        username=body.username.lower(),
        password_hash=hash_password(body.password),
        role=body.role,
        is_active=True,
    )
    db.add(new_user)

    # Audit log — who created this user
    audit = AuditLog(
        id=str(uuid.uuid4()),
        user_id=current_user.id,
        action="USER_CREATED",
        entity_type="user",
        entity_id=new_user.id,
        details=f"Created user '{new_user.username}' with role '{new_user.role.value}'",
    )
    db.add(audit)
    db.commit()

    return {
        "id": new_user.id,
        "username": new_user.username,
        "role": new_user.role.value,
        "message": "User created successfully",
    }