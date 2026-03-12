from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, Any


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)
    email: EmailStr
    password: str = Field(min_length=8)
    consent: bool = Field(..., description="Must accept scientific data consent")
    organization: Optional[str] = Field(default=None, max_length=255)
    role: Optional[str] = Field(default=None, max_length=50)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8)


class UpdateUsernameRequest(BaseModel):
    username: str = Field(min_length=2, max_length=50)


class UpdateProfileRequest(BaseModel):
    organization: Optional[str] = Field(default=None, max_length=255)
    role: Optional[str] = Field(default=None, max_length=50)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    otp: str = Field(min_length=6, max_length=6)
    new_password: str = Field(min_length=8)


class RazorpayOrderResponse(BaseModel):
    order_id: str
    key_id: str
    amount: int
    currency: str
    plan: str


class RazorpayVerifyRequest(BaseModel):
    payment_id: str
    order_id: str
    signature: str
    plan: str


class PredictionDetail(BaseModel):
    id: int
    sequence: str
    leads: list
    csv_str: str
    image_base64: str
    lead_count: int
    top_affinity: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


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
    username: Optional[str] = None
    tokens_left: int
    plan: str
    email_verified: bool = False
    is_admin: bool = False
    organization: Optional[str] = None
    role: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


# ---------- Prediction ----------
class PredictParams(BaseModel):
    min_qed: float = Field(default=0.6, ge=0.1, le=1.0)
    temperature: float = Field(default=0.8, ge=0.1, le=2.0)
    min_smiles_len: int = Field(default=40, ge=10, le=100)
    max_smiles_len: int = Field(default=100, ge=50, le=200)
    num_leads: int = Field(default=9, ge=1, le=300)


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
    sa_score: float
    hia_absorption: str
    bbb_permeability: str
    toxicity: str
    tox_detail: str
    ro5_pass: str
    ro5_violations: int
    hbd_count: int
    hba_count: int
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


# ---------- Checkout ----------
class CheckoutRequest(BaseModel):
    plan: str = Field(..., pattern="^(starter|researcher|pharma)$")


# ---------- Health ----------
class HealthResponse(BaseModel):
    status: str
    ml_loaded: bool
    db_connected: bool
    version: str = "1.0.0"


# ---------- Admin ----------
class AdminUserItem(BaseModel):
    id: int
    email: str
    username: Optional[str] = None
    organization: Optional[str] = None
    role: Optional[str] = None
    tokens_left: int
    plan: str
    email_verified: bool
    is_admin: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class AdminPaginatedUsers(BaseModel):
    items: list[AdminUserItem]
    total: int
    page: int
    page_size: int


class AdminEditUser(BaseModel):
    username: Optional[str] = Field(default=None, min_length=2, max_length=50)
    tokens_left: Optional[int] = Field(default=None, ge=0)
    plan: Optional[str] = Field(default=None, pattern="^(free|pro|enterprise)$")
    email_verified: Optional[bool] = None
    is_admin: Optional[bool] = None


class AdminPredictionItem(BaseModel):
    id: int
    user_id: int
    user_email: str
    sequence: str
    lead_count: int
    top_affinity: Optional[str]
    status: str
    num_leads: Optional[int]
    min_qed: Optional[float]
    temperature: Optional[float]
    created_at: datetime


class AdminPaginatedPredictions(BaseModel):
    items: list[AdminPredictionItem]
    total: int
    page: int
    page_size: int



TokenResponse.model_rebuild()
