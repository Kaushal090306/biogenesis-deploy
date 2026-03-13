from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from core.security import decode_access_token
from db.database import get_db
from db import models as db_models
from sqlalchemy import select

bearer_scheme = HTTPBearer(auto_error=False)


def _extract_bearer_token(raw_value: str | None) -> str | None:
    if not raw_value:
        return None
    value = raw_value.strip()
    if not value:
        return None
    if value.lower().startswith("bearer "):
        return value[7:].strip() or None
    return value


async def get_current_user(
    request: Request,
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> db_models.User:
    candidates: list[str] = []
    if credentials and credentials.credentials:
        candidates.append(credentials.credentials)

    x_user_auth = _extract_bearer_token(request.headers.get("x-user-authorization"))
    if x_user_auth:
        candidates.append(x_user_auth)

    x_user_token = _extract_bearer_token(request.headers.get("x-user-token"))
    if x_user_token:
        candidates.append(x_user_token)

    user_id = None
    for token in candidates:
        decoded = decode_access_token(token)
        if decoded:
            user_id = decoded
            break

    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired token")
    result = await db.execute(select(db_models.User).where(db_models.User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


async def get_admin_user(
    current_user: db_models.User = Depends(get_current_user),
) -> db_models.User:
    if not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return current_user
