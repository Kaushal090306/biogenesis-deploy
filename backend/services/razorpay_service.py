import logging
import razorpay
from core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Amount in paise (INR). 1 INR = 100 paise.
# We offer token bundles (one-time purchases) — keys are plan slugs used by the frontend.
PLAN_AMOUNT_MAP = {
    "starter": 99900,     # ₹999 — Starter Pack (10 tokens)
    "researcher": 399900, # ₹3,999 — Researcher Pack (50 tokens)
    "pharma": 1199900,    # ₹11,999 — Pharma / Lab Pack (200 tokens)
}

PLAN_TOKENS_MAP = {
    "starter": 10,
    "researcher": 50,
    "pharma": 200,
}


def _client() -> razorpay.Client:
    return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))


def create_order(plan: str) -> dict:
    """Create a Razorpay order and return order details for client-side checkout."""
    amount = PLAN_AMOUNT_MAP.get(plan)
    if amount is None:
        raise ValueError(f"Unknown plan: {plan}")

    client = _client()
    order = client.order.create({
        "amount": amount,
        "currency": "INR",
        "payment_capture": 1,
        "notes": {"plan": plan},
    })
    logger.info("Razorpay order created: %s for plan=%s", order["id"], plan)
    return {
        "order_id": order["id"],
        "key_id": settings.RAZORPAY_KEY_ID,
        "amount": amount,
        "currency": "INR",
        "plan": plan,
    }


def verify_payment(payment_id: str, order_id: str, signature: str) -> bool:
    """Verify Razorpay payment signature using the official SDK utility."""
    try:
        client = _client()
        client.utility.verify_payment_signature({
            "razorpay_order_id": order_id,
            "razorpay_payment_id": payment_id,
            "razorpay_signature": signature,
        })
        return True
    except Exception:
        return False
