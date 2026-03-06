"""
Admin seed script — creates the admin account.
Usage (from backend/):
    python -m db.seed_admin

Credentials:
    Email:    swayamprakash.patel@gmail.com
    Password: PharmForge@Admin2026#
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from db.database import AsyncSessionLocal, create_tables
from db.models import User
from core.security import hash_password

ADMIN_EMAIL = "swayamprakash.patel@gmail.com"
ADMIN_PASSWORD = "PharmForge@Admin2026#"


async def seed_admin():
    await create_tables()
    async with AsyncSessionLocal() as db:
        existing = (await db.execute(select(User).where(User.email == ADMIN_EMAIL))).scalar_one_or_none()
        if existing:
            # Ensure is_admin flag is set (idempotent)
            if not existing.is_admin:
                existing.is_admin = True
                existing.plan = "enterprise"
                existing.tokens_left = 99999
                db.add(existing)
                await db.commit()
                print(f"[updated] {ADMIN_EMAIL} → is_admin=True, plan=enterprise, tokens=99999")
            else:
                print(f"[skip] Admin account {ADMIN_EMAIL} already exists and is already admin.")
            return

        admin = User(
            email=ADMIN_EMAIL,
            username="Admin",
            password_hash=hash_password(ADMIN_PASSWORD),
            plan="enterprise",
            tokens_left=99999,
            consent_given=True,
            email_verified=True,
            is_admin=True,
        )
        db.add(admin)
        await db.commit()
        print(f"[created] Admin account: {ADMIN_EMAIL}")
        print(f"          Password:      {ADMIN_PASSWORD}")
        print(f"          Plan:          enterprise  |  Tokens: 99999  |  is_admin: True")


if __name__ == "__main__":
    asyncio.run(seed_admin())
