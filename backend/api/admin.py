"""
Admin API — all routes require is_admin=True on the JWT user.
"""
import asyncio
import logging
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, update, delete

from db.database import get_db
from db import models as db_models
from models.schemas import (
    AdminUserItem, AdminPaginatedUsers, AdminEditUser,
    AdminPredictionItem, AdminPaginatedPredictions,
    PredictionDetail,
)
from core.dependencies import get_admin_user
from utils.encryption import decrypt_data
from services.ml_pipeline import generate_structure_image

router = APIRouter(prefix="/admin", tags=["admin"])
logger = logging.getLogger(__name__)


# ──────────────────────────────────────────────
# Users
# ──────────────────────────────────────────────

@router.get("/users", response_model=AdminPaginatedUsers)
async def admin_list_users(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    search: str = Query(default=""),
    plan: str = Query(default=""),
    verified: bool | None = Query(default=None),
    admin_only: bool | None = Query(default=None),
    db: AsyncSession = Depends(get_db),
    _: db_models.User = Depends(get_admin_user),
):
    q = select(db_models.User)
    count_q = select(func.count()).select_from(db_models.User)
    if search:
        like = f"%{search}%"
        q = q.where(
            db_models.User.email.ilike(like) | db_models.User.username.ilike(like)
        )
        count_q = count_q.where(
            db_models.User.email.ilike(like) | db_models.User.username.ilike(like)
        )
    if plan:
        q = q.where(db_models.User.plan == plan)
        count_q = count_q.where(db_models.User.plan == plan)
    if verified is not None:
        q = q.where(db_models.User.email_verified == verified)
        count_q = count_q.where(db_models.User.email_verified == verified)
    if admin_only is not None:
        q = q.where(db_models.User.is_admin == admin_only)
        count_q = count_q.where(db_models.User.is_admin == admin_only)

    total = (await db.execute(count_q)).scalar_one()
    users = (
        await db.execute(
            q.order_by(db_models.User.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).scalars().all()

    return AdminPaginatedUsers(
        items=[AdminUserItem.model_validate(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/users/{user_id}", response_model=AdminUserItem)
async def admin_get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    _: db_models.User = Depends(get_admin_user),
):
    user = (await db.execute(select(db_models.User).where(db_models.User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return AdminUserItem.model_validate(user)


@router.patch("/users/{user_id}", response_model=AdminUserItem)
async def admin_edit_user(
    user_id: int,
    body: AdminEditUser,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_admin_user),
):
    user = (await db.execute(select(db_models.User).where(db_models.User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    # Prevent de-admining yourself accidentally
    if body.is_admin is False and user.id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot remove your own admin privilege.")

    for field, value in body.model_dump(exclude_none=True).items():
        setattr(user, field, value)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("Admin %d edited user %d: %s", admin.id, user_id, body.model_dump(exclude_none=True))
    return AdminUserItem.model_validate(user)


@router.delete("/users/{user_id}")
async def admin_delete_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    admin: db_models.User = Depends(get_admin_user),
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own account via admin panel.")
    user = (await db.execute(select(db_models.User).where(db_models.User.id == user_id))).scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    email = user.email
    # Delete predictions first to avoid ORM nullification conflict with NOT NULL FK
    await db.execute(delete(db_models.Prediction).where(db_models.Prediction.user_id == user_id))
    await db.delete(user)
    await db.commit()
    logger.info("Admin %d deleted user %d (%s)", admin.id, user_id, email)
    return {"detail": "User deleted."}


# ──────────────────────────────────────────────
# Predictions
# ──────────────────────────────────────────────

@router.get("/predictions", response_model=AdminPaginatedPredictions)
async def admin_list_predictions(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    user_id: int = Query(default=0),
    status: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
    _: db_models.User = Depends(get_admin_user),
):
    q = (
        select(db_models.Prediction, db_models.User.email)
        .join(db_models.User, db_models.Prediction.user_id == db_models.User.id)
    )
    count_q = select(func.count()).select_from(db_models.Prediction)

    if user_id:
        q = q.where(db_models.Prediction.user_id == user_id)
        count_q = count_q.where(db_models.Prediction.user_id == user_id)
    if status:
        q = q.where(db_models.Prediction.status == status)
        count_q = count_q.where(db_models.Prediction.status == status)

    total = (await db.execute(count_q)).scalar_one()
    rows = (
        await db.execute(
            q.order_by(db_models.Prediction.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
        )
    ).all()

    items = [
        AdminPredictionItem(
            id=pred.id,
            user_id=pred.user_id,
            user_email=email,
            sequence=pred.sequence,
            lead_count=pred.lead_count,
            top_affinity=pred.top_affinity,
            status=pred.status,
            num_leads=pred.num_leads,
            min_qed=pred.min_qed,
            temperature=pred.temperature,
            created_at=pred.created_at,
        )
        for pred, email in rows
    ]
    return AdminPaginatedPredictions(items=items, total=total, page=page, page_size=page_size)


@router.get("/predictions/{prediction_id}", response_model=PredictionDetail)
async def admin_get_prediction(
    prediction_id: int,
    db: AsyncSession = Depends(get_db),
    _: db_models.User = Depends(get_admin_user),
):
    pred = (
        await db.execute(select(db_models.Prediction).where(db_models.Prediction.id == prediction_id))
    ).scalar_one_or_none()
    if not pred:
        raise HTTPException(status_code=404, detail="Prediction not found.")
    if pred.status != "done" or not pred.results_encrypted:
        raise HTTPException(status_code=404, detail="Results not available.")

    try:
        data = decrypt_data(pred.results_encrypted)
    except Exception:
        raise HTTPException(status_code=500, detail="Failed to decrypt results.")

    leads = data.get("leads", [])
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
