"""
Seed script — creates test users for development.
Run: cd backend && python seed.py
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from db.database import AsyncSessionLocal, create_tables
from db.models import User
from core.security import hash_password
from sqlalchemy import select


TEST_USERS = [
    {"email": "admin@biogenesis.ai", "password": "AdminPass123!", "plan": "enterprise", "tokens": 99999},
    {"email": "pro@biogenesis.ai", "password": "ProPass123!", "plan": "pro", "tokens": 100},
    {"email": "free@biogenesis.ai", "password": "FreePass123!", "plan": "free", "tokens": 10},
]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        for u in TEST_USERS:
            result = await db.execute(select(User).where(User.email == u["email"]))
            if result.scalar_one_or_none():
                print(f"  ↩  Already exists: {u['email']}")
                continue
            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                plan=u["plan"],
                tokens_left=u["tokens"],
                consent_given=True,
            )
            db.add(user)
            print(f"  ✓  Created: {u['email']} ({u['plan']})")
        await db.commit()
    print("Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
