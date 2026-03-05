from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Any


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    consent: bool = Field(..., description="Must accept scientific data consent")


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class SendOtpRequest(BaseModel):
    email: EmailStr


class VerifyOtpRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)


class GoogleAuthRequest(BaseModel):
    credential: str   # Google ID token from GSI


class OtpRequiredResponse(BaseModel):
    requires_verification: bool = True
    email: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserPublic"


# ---------- User ----------
class UserPublic(BaseModel):
    id: int
    email: str
    tokens_left: int
    plan: str
    email_verified: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Prediction ----------
class PredictParams(BaseModel):
    min_qed: float = Field(default=0.6, ge=0.1, le=1.0)
    temperature: float = Field(default=0.8, ge=0.1, le=2.0)
    min_smiles_len: int = Field(default=40, ge=10, le=100)
    max_smiles_len: int = Field(default=100, ge=50, le=200)
    num_leads: int = Field(default=9, ge=1, le=50)


class PredictRequest(BaseModel):
    sequence: str = Field(min_length=10, description="Target protein amino acid sequence")
    params: PredictParams = PredictParams()


class LeadCompound(BaseModel):
    compound_id: str
    smiles: str
    mw: float
    logp: float
    hbd: int
    hba: int
    tpsa: float
    qed: float
    synthetizability: float
    ro5_pass: str
    predicted_p_affinity: float
    activity_class: str


class PredictResponse(BaseModel):
    prediction_id: int
    leads: list[LeadCompound]
    image_base64: str
    csv_str: str
    tokens_left: int


class PredictionHistoryItem(BaseModel):
    id: int
    sequence: str
    lead_count: int
    top_affinity: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class PaginatedHistory(BaseModel):
    items: list[PredictionHistoryItem]
    total: int
    page: int
    page_size: int


# ---------- Stripe ----------
class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(pro|enterprise)$")


class CheckoutResponse(BaseModel):
    checkout_url: str


# ---------- Health ----------
class HealthResponse(BaseModel):
    status: str
    ml_loaded: bool
    db_connected: bool
    version: str = "1.0.0"


TokenResponse.model_rebuild()
