"""
Seed script — creates test users with various plans.
Usage (from backend/):
    python -m db.seed
"""
import asyncio
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db.database import AsyncSessionLocal, create_tables
from db.models import User
from core.security import hash_password
from core.config import get_settings

settings = get_settings()

TEST_USERS = [
    {"email": "free_user@test.com",       "password": "Test1234!", "plan": "free",       "tokens": 10},
    {"email": "pro_user@test.com",        "password": "Test1234!", "plan": "pro",        "tokens": 100},
    {"email": "enterprise@test.com",      "password": "Test1234!", "plan": "enterprise", "tokens": 99999},
    {"email": "empty_tokens@test.com",    "password": "Test1234!", "plan": "free",       "tokens": 0},
]


async def seed():
    await create_tables()
    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        for u in TEST_USERS:
            res = await db.execute(select(User).where(User.email == u["email"]))
            if res.scalar_one_or_none():
                print(f"[skip] {u['email']} already exists")
                continue
            user = User(
                email=u["email"],
                password_hash=hash_password(u["password"]),
                plan=u["plan"],
                tokens_left=u["tokens"],
                consent_given=True,
            )
            db.add(user)
            print(f"[seed] {u['email']} ({u['plan']}, {u['tokens']} tokens)")
        await db.commit()
    print("✓ Seed complete.")


if __name__ == "__main__":
    asyncio.run(seed())
