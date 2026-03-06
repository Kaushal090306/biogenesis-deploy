import asyncio
import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from db.database import get_db
from db import models as db_models
from models.schemas import (
    PaginatedHistory, PredictionHistoryItem, UserPublic,
    CheckoutRequest, RazorpayOrderResponse, RazorpayVerifyRequest,
    PredictionDetail, UpdateUsernameRequest,
)
from core.dependencies import get_current_user
from core.config import get_settings
from services.razorpay_service import create_order, verify_payment, PLAN_TOKENS_MAP
from services.ml_pipeline import generate_structure_image
from utils.encryption import decrypt_data

router = APIRouter(prefix="/dashboard", tags=["dashboard"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.get("/me", response_model=UserPublic)
async def get_profile(current_user: db_models.User = Depends(get_current_user)):
    return UserPublic.model_validate(current_user)


@router.patch("/username", response_model=UserPublic)
async def update_username(
    body: UpdateUsernameRequest,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    # Check uniqueness
    existing = await db.execute(
        select(db_models.User).where(
            db_models.User.username == body.username,
            db_models.User.id != current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Username already taken.")
    current_user.username = body.username
    await db.commit()
    await db.refresh(current_user)
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


@router.get("/history/{prediction_id}", response_model=PredictionDetail)
async def get_prediction_detail(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    result = await db.execute(
        select(db_models.Prediction).where(
            db_models.Prediction.id == prediction_id,
            db_models.Prediction.user_id == current_user.id,
        )
    )
    pred = result.scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    if pred.status != "done" or not pred.results_encrypted:
        raise HTTPException(status_code=404, detail="Results not available for this prediction.")

    try:
        data = decrypt_data(pred.results_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt results.")

    leads = data.get("leads", [])
    # Always regenerate image from current leads — ensures all N structures are shown
    # (old predictions stored an image capped at 12; regenerating fixes history view)
    image_base64 = await asyncio.to_thread(generate_structure_image, leads) if leads else ""

    return PredictionDetail(
        id=pred.id,
        sequence=pred.sequence,
        leads=leads,
        csv_str=data.get("csv_str", ""),
        image_base64=image_base64,
        lead_count=pred.lead_count,
        top_affinity=pred.top_affinity,
        created_at=pred.created_at,
    )


@router.post("/checkout", response_model=RazorpayOrderResponse)
async def create_checkout(
    payload: CheckoutRequest,
    current_user: db_models.User = Depends(get_current_user),
):
    try:
        order = create_order(payload.plan)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return RazorpayOrderResponse(**order)


@router.post("/checkout/verify")
async def verify_checkout(
    payload: RazorpayVerifyRequest,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    if not verify_payment(payload.payment_id, payload.order_id, payload.signature):
        raise HTTPException(status_code=400, detail="Payment verification failed.")

    tokens = PLAN_TOKENS_MAP.get(payload.plan, 100)
    current_user.plan = payload.plan
    current_user.tokens_left = current_user.tokens_left + tokens
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    logger.info("User %s upgraded to %s (%d tokens added)", current_user.email, payload.plan, tokens)
    return UserPublic.model_validate(current_user)
