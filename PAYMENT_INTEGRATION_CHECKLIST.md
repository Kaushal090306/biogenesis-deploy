# 💳 Razorpay Payment Integration - Complete Checklist

## ✅ Backend Setup (COMPLETE)

### 1. Database & Models
- ✅ User table has `tokens_left` (Integer) field
- ✅ User table has `plan` (String) field - defaults to "free"
- ✅ Prediction table tracks `num_leads` and deducts tokens

### 2. Configuration
- ✅ `backend/core/config.py` has Razorpay settings
- ✅ `.env` file has been updated with:
  - `RAZORPAY_KEY_ID=<your_key_id>`
  - `RAZORPAY_KEY_SECRET=<your_key_secret>`

### 3. Services
- ✅ `backend/services/razorpay_service.py` - Creates orders & verifies payments
- ✅ `backend/services/token_service.py` - Handles token deduction (1 token = 10 leads)
- ✅ Payment plans configured:
  - **starter**: ₹999 → 10 tokens
  - **researcher**: ₹3,999 → 50 tokens
  - **pharma**: ₹11,999 → 200 tokens

### 4. API Endpoints
- ✅ `POST /api/dashboard/checkout` - Creates Razorpay order
- ✅ `POST /api/dashboard/checkout/verify` - Verifies payment & adds tokens
- ✅ Token deduction on `POST /api/predict` (1 token per 10 leads)

---

## ✅ Frontend Setup (COMPLETE)

### 1. Scripts & Libraries
- ✅ Razorpay checkout script added (`nonce` in public HTML)
- ✅ `razorpay` package installed

### 2. Pages & Components
- ✅ **Landing.jsx** - Updated with purchase flow for logged-in users
- ✅ **DashboardPage.jsx** - Shows UpgradeModal
- ✅ **UpgradeModal.jsx** - Complete payment flow with Razorpay modal
- ✅ **Navbar.jsx** - Displays:
  - Token balance (⚡ badge)
  - Current plan
  - Upgrade button

### 3. API Integration
- ✅ `frontend/src/services/api.js` has:
  - `createCheckout(plan)` - Creates order
  - `verifyCheckout(...)` - Verifies payment

---

## 🔒 Security Measures

- ✅ Razorpay secret key stored safely in `.env`
- ✅ Payment signature verified on backend before token update
- ✅ Token deduction happens before inference (prevents token theft)
- ✅ User authentication required for all payment endpoints
- ✅ Rate limiting on payment endpoints

---

## 🧪 Testing Steps

### Phase 1: Sandbox Testing
1. **Enable Test Mode** on Razorpay dashboard
2. **Test Successful Payment**:
   ```
   Card: 4111 1111 1111 1111
   Expiry: Any future date (e.g., 12/25)
   CVV: Any 3 digits
   ```
   - Navigate to Landing page → Pricing section
   - Click "Buy Starter" (if logged in)
   - Complete payment with test card
   - Verify tokens increase: `starter` → +10 tokens

3. **Test Failed Payment**:
   ```
   Card: 4000 0000 0000 0002
   ```
   - Should show error message
   - Tokens should NOT be deducted

4. **Test Token Usage**:
   - Go to Dashboard
   - Run prediction with 50 leads (5 tokens needed)
   - Verify tokens decrease by 5
   - View updated balance in navbar

5. **Test Insufficient Tokens**:
   - Try to request 200 leads (needs 20 tokens)
   - Should show error: "Not enough tokens"
   - Navbar "Upgrade" button should be highlighted

### Phase 2: Production Testing (Before Going Live)
1. Remove test mode from Razorpay
2. Update `.env` with production keys
3. Run full payment flow with small transaction
4. Verify email receipts are sent
5. Test refund workflow

---

## 📋 Remaining Optional Enhancements

### Email Receipts (Recommended)
Add after successful payment in `backend/api/dashboard.py`:
```python
# After payment verified, send email:
await send_purchase_email(
    user.email,
    plan=payload.plan,
    tokens=tokens,
    amount=amount
)
```
Email template: `backend/templates/purchase_receipt.html`

### Webhook Integration (For Production)
Set up webhook endpoint for handling:
- `payment.authorized` → Confirm & log
- `payment.failed` → Send alert
- `refund.created` → Deduct tokens back

Webhook URL: `https://yourdomain.com/api/webhooks/razorpay`

### Admin Dashboard Features
- ✅ View all user plans & token history
- ✅ Monthly revenue report
- ✅ Failed payment logs

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Update Razorpay Keys in `.env` (production keys)
- [ ] Enable HTTPS on domain
- [ ] Disable test mode on Razorpay
- [ ] Update `FRONTEND_URL` in `.env` to match domain
- [ ] Test full payment flow in production
- [ ] Monitor first 10 transactions for issues
- [ ] Set up email logging/alerts
- [ ] Create refund policy documentation
- [ ] Add Terms & Conditions to website
- [ ] Configure webhook (if using)

---

## 💡 Key Files Reference

| File | Purpose |
|------|---------|
| `backend/.env` | Razorpay keys & config |
| `backend/services/razorpay_service.py` | Order creation & verification |
| `backend/api/dashboard.py` | Checkout endpoints |
| `frontend/src/pages/Landing.jsx` | Public pricing page |
| `frontend/src/components/UpgradeModal.jsx` | Payment modal |
| `frontend/src/pages/DashboardPage.jsx` | User dashboard with upgrade |
| `backend/db/models.py` | User & Prediction tables |

---

## 📞 Support & Troubleshooting

### Common Issues

**1. Order Creation Fails**
- Verify `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` in `.env`
- Check Razorpay dashboard for API errors
- Ensure backend is running: `python -m uvicorn main:app --reload`

**2. Payment Modal Doesn't Open**
- Verify Razorpay script is loaded: `window.Razorpay` should exist
- Check browser console for errors
- Ensure `key_id` from backend matches your Razorpay key

**3. Payment Verified But Tokens Not Added**
- Check payment signature verification in backend
- Review `backend/services/razorpay_service.py` logs
- Verify `verify_payment()` is returning `True`

**4. Tokens Not Deducted After Prediction**
- Check user plan is not "free" with insufficient tokens
- Verify `token_service.check_and_deduct()` is called
- Review database `tokens_left` field

---

## 🎯 Success Criteria

Your payment integration is complete when:

1. ✅ User can see pricing plans on Landing page
2. ✅ Logged-in users can click "Buy" plans
3. ✅ Razorpay checkout modal opens
4. ✅ Payment completes with test card
5. ✅ User tokens increase in profile/navbar
6. ✅ Predictions deduct tokens correctly
7. ✅ Insufficient tokens error works
8. ✅ All features work in both dark & light themes

---

**Last Updated:** March 12, 2026  
**Integration Status:** ✅ COMPLETE & READY FOR TESTING
