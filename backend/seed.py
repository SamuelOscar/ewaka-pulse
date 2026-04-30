"""
Seed script — creates the initial admin user.
Run once after first migration.
Run from backend/ directory:
    python seed.py
"""
import uuid
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.services.auth_service import hash_password

# ── Change these credentials before running ───────────────────
ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Ewaka@Admin2026!"   # Meets all password requirements
# ─────────────────────────────────────────────────────────────

def seed():
    db = SessionLocal()
    try:
        existing = db.query(User).filter(
            User.username == ADMIN_USERNAME
        ).first()

        if existing:
            print(f"⚠️  User '{ADMIN_USERNAME}' already exists. Skipping.")
            return

        admin = User(
            id=str(uuid.uuid4()),
            username=ADMIN_USERNAME,
            password_hash=hash_password(ADMIN_PASSWORD),
            role=UserRole.admin,
            is_active=True,
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)

        print(f"✅ Admin user created successfully")
        print(f"   Username : {ADMIN_USERNAME}")
        print(f"   Role     : {admin.role.value}")
        print(f"   ID       : {admin.id}")
        print(f"\n⚠️  Delete this script or remove credentials before committing.")

    finally:
        db.close()


if __name__ == "__main__":
    seed()