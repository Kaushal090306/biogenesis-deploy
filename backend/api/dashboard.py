import logging
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from db.database import get_db
from db import models as db_models
from models.schemas import PaginatedHistory, PredictionHistoryItem, UserPublic, CheckoutRequest, CheckoutResponse
from core.dependencies import get_current_user
from core.config import get_settings
from services.stripe_service import create_checkout_session

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.get("/me", response_model=UserPublic)
async def get_profile(current_user: db_models.User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)


@router.get("/history", response_model=PaginatedHistory)
async def get_history(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=10, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    total_result = await db.execute(
        select(func.count()).where(db_models.Prediction.user_id == current_user.id)
    )
    total = total_result.scalar_one()

    result = await db.execute(
        select(db_models.Prediction)
        .where(db_models.Prediction.user_id == current_user.id)
        .order_by(db_models.Prediction.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    predictions = result.scalars().all()

    items = [PredictionHistoryItem.model_validate(p) for p in predictions]
    return PaginatedHistory(items=items, total=total, page=page, page_size=page_size)


@router.post("/checkout", response_model=CheckoutResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: db_models.User = Depends(get_current_user),
):
    url = await create_checkout_session(
        user_email=current_user.email,
        plan=payload.plan,
        success_url=f"{settings.FRONTEND_URL}/dashboard?upgrade=success",
        cancel_url=f"{settings.FRONTEND_URL}/dashboard?upgrade=cancelled",
    )
    return CheckoutResponse(checkout_url=url)
