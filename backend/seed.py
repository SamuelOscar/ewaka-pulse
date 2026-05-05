"""
Seed script — creates initial data for development and testing.
Run from backend/ directory: python seed.py
"""
import uuid
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models.user import User, UserRole
from app.models.village import Village
from app.models.class_group import ClassGroup
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
            admin = existing_admin
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
            village = existing_village
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

        # ── Test Classes ───────────────────────────────────────
        class_names = ["Primary 3-5", "Secondary 1-2", "Vocational Group"]

        for class_name in class_names:
            existing_class = db.query(ClassGroup).filter(
                ClassGroup.name == class_name,
                ClassGroup.village_id == village.id,
            ).first()

            if existing_class:
                print(f"⚠️  Class '{class_name}' already exists. ID: {existing_class.id}")
            else:
                new_class = ClassGroup(
                    id=str(uuid.uuid4()),
                    name=class_name,
                    village_id=village.id,
                    teacher_id=None,
                )
                db.add(new_class)
                db.commit()
                db.refresh(new_class)
                print(f"✅ Class created: {class_name} | ID: {new_class.id}")

        print("\n📋 Summary — IDs you will need for testing:")
        print(f"   Village : {village.id}")
        classes = db.query(ClassGroup).filter(
            ClassGroup.village_id == village.id
        ).all()
        for c in classes:
            print(f"   Class '{c.name}' : {c.id}")

    finally:
        db.close()


if __name__ == "__main__":
    seed()