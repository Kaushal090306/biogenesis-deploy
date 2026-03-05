import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.database import get_db
from db import models as db_models
from models.schemas import RegisterRequest, LoginRequest, TokenResponse, UserPublic
from core.security import hash_password, verify_password, create_access_token
from core.config import get_settings

router = APIRouter(prefix="/auth", tags=["authentication"])
logger = logging.getLogger(__name__)
settings = get_settings()


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest, db: AsyncSession = Depends(get_db)):
    if not payload.consent:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You must accept the scientific data consent to register.",
        )
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered.")

    user = db_models.User(
        email=payload.email,
        password_hash=hash_password(payload.password),
        tokens_left=settings.FREE_TOKENS,
        plan="free",
        consent_given=True,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    logger.info("New user registered: %s (id=%d)", user.email, user.id)

    token = create_access_token(str(user.id))
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(db_models.User).where(db_models.User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")

    token = create_access_token(str(user.id))
    logger.info("User login: %s", user.email)
    return TokenResponse(access_token=token, user=UserPublic.model_validate(user))


@router.get("/me", response_model=UserPublic)
async def get_me(
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(lambda: None),  # replaced in main via dep override
):
    # This endpoint is wired in main with correct dependency
    raise HTTPException(status_code=500, detail="Dependency misconfigured")
