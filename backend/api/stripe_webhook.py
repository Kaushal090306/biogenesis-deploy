import logging
from fastapi import APIRouter, Request, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db import models as db_models
from services.stripe_service import construct_event
from services.token_service import replenish_tokens, PLAN_TOKENS

router = APIRouter(prefix="/stripe", tags=["stripe"])
logger = logging.getLogger(__name__)


@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")

    try:
        event = construct_event(payload, sig)
    except Exception as exc:
        logger.warning("Stripe webhook signature error: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event["type"]
    data = event["data"]["object"]
    logger.info("Stripe event: %s", event_type)

    if event_type == "checkout.session.completed":
        customer_email = data.get("customer_email") or data.get("customer_details", {}).get("email")
        plan = data.get("metadata", {}).get("plan", "pro")
        subscription_id = data.get("subscription")
        customer_id = data.get("customer")

        if customer_email:
            result = await db.execute(select(db_models.User).where(db_models.User.email == customer_email))
            user = result.scalar_one_or_none()
            if user:
                user.plan = plan
                user.tokens_left = PLAN_TOKENS.get(plan, 10)
                user.stripe_customer_id = customer_id
                user.stripe_subscription_id = subscription_id
                db.add(user)
                await db.commit()
                logger.info("User %s upgraded to plan: %s", customer_email, plan)

    elif event_type in ("invoice.paid", "customer.subscription.updated"):
        # Monthly renewal: replenish tokens
        customer_id = data.get("customer")
        if customer_id:
            result = await db.execute(
                select(db_models.User).where(db_models.User.stripe_customer_id == customer_id)
            )
            user = result.scalar_one_or_none()
            if user:
                await replenish_tokens(user.id, user.plan, db)

    elif event_type == "customer.subscription.deleted":
        customer_id = data.get("customer")
        if customer_id:
            result = await db.execute(
                select(db_models.User).where(db_models.User.stripe_customer_id == customer_id)
            )
            user = result.scalar_one_or_none()
            if user:
                user.plan = "free"
                user.tokens_left = PLAN_TOKENS["free"]
                db.add(user)
                await db.commit()
                logger.info("Subscription cancelled for customer %s → downgraded to free", customer_id)

    return {"received": True}
