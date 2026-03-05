import logging
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from db.models import User
from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

PLAN_TOKENS = {"free": 10, "pro": 100, "enterprise": 99999}


async def check_and_deduct(user: User, db: AsyncSession) -> None:
    """Raises 402 if no tokens left; otherwise deducts 1 token and commits."""
    if user.tokens_left <= 0:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="No prediction tokens remaining. Please upgrade your plan.",
        )
    user.tokens_left -= 1
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("User %d: deducted 1 token (remaining: %d)", user.id, user.tokens_left)


async def replenish_tokens(user_id: int, plan: str, db: AsyncSession) -> None:
    """Called after successful Stripe subscription. Updates plan + token balance."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        logger.warning("replenish_tokens: user %d not found", user_id)
        return
    new_tokens = PLAN_TOKENS.get(plan, PLAN_TOKENS["free"])
    user.plan = plan
    user.tokens_left = new_tokens
    db.add(user)
    await db.commit()
    logger.info("User %d upgraded to %s (%d tokens)", user_id, plan, new_tokens)
