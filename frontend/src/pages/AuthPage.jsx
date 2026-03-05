import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Mail, Lock, ArrowRight, FlaskConical, RefreshCw } from 'lucide-react'
import { login, register, sendOtp, verifyOtp, googleAuth } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_CLIENT_ID = '178577348386-rt0558cgue3b1uiu2qq9fjd42mjakpb8.apps.googleusercontent.com'

export default function AuthPage({ mode }) {
  const navigate = useNavigate()
  const { saveAuth } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)

  // OTP step
  const [otpStep, setOtpStep] = useState(false)
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)

  const isRegister = mode === 'register'

  // ── Google Sign-in ────────────────────────────────────────────────────────
  const handleGoogleResponse = useCallback(async (response) => {
    setLoading(true)
    try {
      const res = await googleAuth(response.credential)
      const { access_token, user } = res.data
      saveAuth(access_token, user)
      toast.success(`Welcome, ${user.email}!`)
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google sign-in failed.')
    } finally {
      setLoading(false)
    }
  }, [navigate, saveAuth])

  useEffect(() => {
    const tryInit = () => {
      if (!window.google) return
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
      })
      const container = document.getElementById('google-btn')
      if (container) {
        window.google.accounts.id.renderButton(container, {
          theme: 'filled_black',
          size: 'large',
          width: 368,
          text: isRegister ? 'signup_with' : 'signin_with',
        })
      }
    }
    // Script may already be loaded or still loading
    if (window.google) {
      tryInit()
    } else {
      const interval = setInterval(() => {
        if (window.google) { clearInterval(interval); tryInit() }
      }, 200)
      return () => clearInterval(interval)
    }
  }, [handleGoogleResponse, isRegister, otpStep])

  // ── Resend cooldown timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  // ── Submit register/login ─────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault()
    if (isRegister && !consent) {
      toast.error('You must accept the data consent to register.')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        const res = await register(email, password, consent)
        // Backend returns { requires_verification: true, email }
        setOtpEmail(res.data.email || email)
        setOtpStep(true)
        setResendCooldown(60)
        toast.success('Account created! Check your email for the verification code.')
      } else {
        try {
          const res = await login(email, password)
          const { access_token, user } = res.data
          saveAuth(access_token, user)
          toast.success('Welcome back!')
          navigate('/dashboard')
        } catch (err) {
          if (err.response?.status === 403) {
            // Email not verified — switch to OTP step
            setOtpEmail(email)
            setOtpStep(true)
            setResendCooldown(0)
            toast('Please verify your email first.', { icon: '📧' })
          } else {
            throw err
          }
        }
      }
    } catch (err) {
      const msg = err.response?.data?.detail || 'Something went wrong.'
      toast.error(typeof msg === 'string' ? msg : 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  // ── Submit OTP ────────────────────────────────────────────────────────────
  async function handleOtpSubmit(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const res = await verifyOtp(otpEmail, otp)
      const { access_token, user } = res.data
      saveAuth(access_token, user)
      toast.success('Email verified! Welcome to BioGenesis.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Verification failed.'
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Resend OTP ────────────────────────────────────────────────────────────
  async function handleResend() {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      await sendOtp(otpEmail)
      setResendCooldown(60)
      toast.success('New code sent!')
    } catch {
      toast.error('Could not resend. Try again.')
    } finally {
      setLoading(false)
    }
  }

  // ── OTP view ──────────────────────────────────────────────────────────────
  if (otpStep) {
    return (
      <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-50 pointer-events-none" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md relative"
        >
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex items-center gap-2 mb-6">
              <span className="text-3xl">🧬</span>
              <span className="font-bold text-xl tracking-tight">
                <span className="text-gradient">BioGenesis</span>
                <span className="text-slate-400 font-normal"> AI</span>
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-white mb-1">Verify your email</h1>
            <p className="text-slate-400 text-sm">
              We sent a 6-digit code to{' '}
              <span className="text-brand-400 font-medium">{otpEmail}</span>
            </p>
          </div>

          <div className="glass-card p-8 border border-white/[0.07]">
            <form onSubmit={handleOtpSubmit} className="space-y-5">
              <div>
                <label className="label-text">Verification code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                  placeholder="000000"
                  autoFocus
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Verifying…
                  </span>
                ) : (
                  <>Verify &amp; Continue <ArrowRight size={16} /></>
                )}
              </button>

              <button
                type="button"
                onClick={handleResend}
                disabled={resendCooldown > 0 || loading}
                className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40"
              >
                <RefreshCw size={13} />
                {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
              </button>

              <button
                type="button"
                onClick={() => { setOtpStep(false); setOtp('') }}
                className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors"
              >
                ← Back
              </button>
            </form>
          </div>

          <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
            <FlaskConical size={12} />
            <span>For research use only · All results encrypted</span>
          </div>
        </motion.div>
      </div>
    )
  }

  // ── Main auth view ────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md relative"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🧬</span>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-gradient">BioGenesis</span>
              <span className="text-slate-400 font-normal"> AI</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-white mb-1">
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h1>
          <p className="text-slate-400 text-sm">
            {isRegister
              ? 'Start with 10 free prediction runs'
              : 'Sign in to your research dashboard'}
          </p>
        </div>

        <div className="glass-card p-8 border border-white/[0.07]">
          {/* Google button */}
          <div className="flex justify-center mb-5">
            <div id="google-btn" />
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-xs text-slate-600">or continue with email</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="label-text">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11"
                  placeholder="you@lab.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="label-text">Password</label>
              <div className="relative">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11"
                  placeholder="Min. 8 characters"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Consent (register only) */}
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input
                        type="checkbox"
                        checked={consent}
                        onChange={(e) => setConsent(e.target.checked)}
                        className="sr-only"
                      />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                          ${consent ? 'bg-brand-600 border-brand-500' : 'border-slate-600 group-hover:border-brand-600'}`}
                        onClick={() => setConsent(!consent)}
                      >
                        {consent && <span className="text-white text-xs font-bold">✓</span>}
                      </div>
                    </div>
                    <span className="text-xs text-slate-400 leading-relaxed">
                      I consent to my protein sequences and drug discovery outputs being{' '}
                      <span className="text-brand-400">encrypted and stored</span> for my personal research
                      history. Data is used solely for result retrieval.
                    </span>
                  </label>
                </motion.div>
              )}
            </AnimatePresence>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegister ? 'Creating account…' : 'Signing in…'}
                </span>
              ) : (
                <>
                  {isRegister ? 'Create Account' : 'Sign In'}
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              {isRegister ? (
                <>Already have an account?{' '}
                  <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                </>
              ) : (
                <>Don't have an account?{' '}
                  <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Sign up free</Link>
                </>
              )}
            </p>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <FlaskConical size={12} />
          <span>For research use only · All results encrypted</span>
        </div>
      </motion.div>
    </div>
  )
}
