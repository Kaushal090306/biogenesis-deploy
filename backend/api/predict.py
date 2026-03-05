import asyncio
import logging
from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address

from db.database import get_db
from db import models as db_models
from models.schemas import PredictRequest, PredictResponse
from core.dependencies import get_current_user
from services import ml_pipeline, token_service
from utils.encryption import encrypt_data

router = APIRouter(prefix="/predict", tags=["prediction"])
logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)


@router.post("", response_model=PredictResponse)
@limiter.limit("5/minute")
async def predict(
    request: Request,
    payload: PredictRequest,
    db: AsyncSession = Depends(get_db),
    current_user: db_models.User = Depends(get_current_user),
):
    # 1. Check & deduct token (raises 402 if empty)
    await token_service.check_and_deduct(current_user, db)

    # 2. Create pending prediction record
    pred_record = db_models.Prediction(
        user_id=current_user.id,
        sequence=payload.sequence[:2000],  # trim for storage
        status="pending",
        min_qed=payload.params.min_qed,
        temperature=payload.params.temperature,
        min_smiles_len=payload.params.min_smiles_len,
        max_smiles_len=payload.params.max_smiles_len,
        num_leads=payload.params.num_leads,
    )
    db.add(pred_record)
    await db.commit()
    await db.refresh(pred_record)

    try:
        # 3. Run heavy ML in thread pool (non-blocking)
        result = await asyncio.to_thread(
            ml_pipeline.run_prediction,
            sequence=payload.sequence,
            min_qed=payload.params.min_qed,
            temperature=payload.params.temperature,
            min_smiles_len=payload.params.min_smiles_len,
            max_smiles_len=payload.params.max_smiles_len,
            num_leads=payload.params.num_leads,
        )

        # 4. Encrypt and persist results
        leads = result["leads"]
        encrypted = encrypt_data({"leads": leads, "csv_str": result["csv_str"], "image_base64": result.get("image_base64", "")})
        top_aff = str(leads[0]["predicted_p_affinity"]) if leads else None

        pred_record.results_encrypted = encrypted
        pred_record.lead_count = len(leads)
        pred_record.top_affinity = top_aff
        pred_record.status = "done"
        db.add(pred_record)
        await db.commit()
        await db.refresh(current_user)

        logger.info(
            "Prediction %d completed for user %d (%d leads)", pred_record.id, current_user.id, len(leads)
        )

        return PredictResponse(
            prediction_id=pred_record.id,
            leads=leads,
            image_base64=result["image_base64"],
            csv_str=result["csv_str"],
            tokens_left=current_user.tokens_left,
        )

    except Exception as exc:
        pred_record.status = "failed"
        db.add(pred_record)
        await db.commit()
        logger.error("Prediction %d failed: %s", pred_record.id, exc, exc_info=True)
        raise
