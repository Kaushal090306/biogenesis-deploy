import logging
import math
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import User
from fastapi import HTTPException, status
from services.razorpay_service import PLAN_TOKENS_MAP

logger = logging.getLogger(__name__)


async def check_and_deduct(user: User, db: AsyncSession, num_leads: int) -> None:
    """Check token balance for a requested run and deduct required tokens.

    Token accounting: 1 Token = 10 leads. Tokens needed = ceil(num_leads / 10).
    Raises HTTP 402 if insufficient tokens.
    """
    tokens_needed = math.ceil(num_leads / 10)
    if user.tokens_left < tokens_needed:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail=f"Insufficient tokens: this run requires {tokens_needed} token(s). Please top-up.",
        )
    user.tokens_left -= tokens_needed
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("User %d: deducted %d token(s) for %d leads (remaining: %d)", user.id, tokens_needed, num_leads, user.tokens_left)


async def replenish_tokens(user_id: int, plan: str, db: AsyncSession) -> None:
    """Called after successful payment. Adds tokens from the plan mapping and updates plan."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("replenish_tokens: user %d not found", user_id)
        return
    new_tokens = PLAN_TOKENS_MAP.get(plan, 0)
    user.plan = plan
    user.tokens_left = (user.tokens_left or 0) + new_tokens
    db.add(user)
    await db.commit()
    logger.info("User %d upgraded to %s (%d tokens added, now %d)", user_id, plan, new_tokens, user.tokens_left)
