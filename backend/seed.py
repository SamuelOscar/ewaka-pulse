"""
Seed script — creates initial admin user and test village.
Run once after first migration.
Run from backend/ directory: python seed.py
"""
import uuid
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.village import Village
from app.services.auth_service import hash_password

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "Ewaka@Admin2026!"


def seed():
    db = SessionLocal()
    try:
        # ── Admin User ─────────────────────────────────────────
        existing_admin = db.query(User).filter(
            User.username == ADMIN_USERNAME
        ).first()

        if existing_admin:
            print(f"⚠️  User '{ADMIN_USERNAME}' already exists. Skipping.")
        else:
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
            print(f"✅ Admin user created: {ADMIN_USERNAME} | ID: {admin.id}")

        # ── Test Village ───────────────────────────────────────
        existing_village = db.query(Village).filter(
            Village.name == "Africa Ewaka Village"
        ).first()

        if existing_village:
            print(f"⚠️  Village already exists. ID: {existing_village.id}")
        else:
            village = Village(
                id=str(uuid.uuid4()),
                name="Africa Ewaka Village",
                location="Uganda",
            )
            db.add(village)
            db.commit()
            db.refresh(village)
            print(f"✅ Village created: {village.name} | ID: {village.id}")
            print(f"\n📋 Copy this Village ID — you need it to register children:")
            print(f"   {village.id}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()