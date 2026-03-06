from datetime import datetime, timezone
from sqlalchemy import String, Integer, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    username: Mapped[str | None] = mapped_column(String(100), nullable=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    tokens_left: Mapped[int] = mapped_column(Integer, default=10)
    plan: Mapped[str] = mapped_column(String(50), default="free")
    stripe_customer_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    stripe_subscription_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    consent_given: Mapped[bool] = mapped_column(Boolean, default=False)
    email_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    otp_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    otp_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    google_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    predictions: Mapped[list["Prediction"]] = relationship("Prediction", back_populates="user", lazy="select")


class Prediction(Base):
    __tablename__ = "predictions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    sequence: Mapped[str] = mapped_column(Text, nullable=False)
    # Encrypted JSON stored as text
    results_encrypted: Mapped[str] = mapped_column(Text, nullable=True)
    # Non-sensitive summary (unencrypted for quick display)
    lead_count: Mapped[int] = mapped_column(Integer, default=0)
    top_affinity: Mapped[str | None] = mapped_column(String(50), nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="pending")  # pending/done/failed
    # Settings used for this prediction
    min_qed: Mapped[float | None] = mapped_column(nullable=True)
    temperature: Mapped[float | None] = mapped_column(nullable=True)
    min_smiles_len: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_smiles_len: Mapped[int | None] = mapped_column(Integer, nullable=True)
    num_leads: Mapped[int | None] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship("User", back_populates="predictions")
