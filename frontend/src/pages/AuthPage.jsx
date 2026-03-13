import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Eye, EyeOff, Mail, Lock, ArrowRight, FlaskConical,
  RefreshCw, User, KeyRound, CheckCircle2, Building2, ChevronDown,
} from 'lucide-react'
import { login, register, sendOtp, verifyOtp, forgotPassword, resetPassword } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const GOOGLE_POPUP_MESSAGE_TYPE = 'pharmforge_google_auth'
// -- Shared card shell
function AuthShell({ children }) {
  return (
    <div className="min-h-screen bg-surface-900 flex items-center justify-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-50 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-brand-700/10 rounded-full blur-3xl pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <span className="text-3xl">🧬</span>
            <span className="font-bold text-xl tracking-tight">
              <span className="text-gradient">PharmForge</span>
              <span className="text-slate-400 font-normal"> AI</span>
            </span>
          </Link>
          {children.header}
        </div>
        <div className="glass-card p-8 border border-white/[0.07]">
          {children.body}
        </div>
        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-slate-600">
          <FlaskConical size={12} />
          <span>For research use only - All results encrypted</span>
        </div>
      </motion.div>
    </div>
  )
}

// -- Google button (server-side OAuth popup flow)
function GoogleButton({ onClick, isRegister, disabled }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-slate-600">or continue with Google</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full flex items-center justify-center gap-3 py-[11px] px-4 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-white/20 text-slate-200 text-sm font-medium transition-all duration-200 active:scale-[0.98]"
      >
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] flex-shrink-0" aria-hidden="true">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {disabled ? 'Opening Google...' : (isRegister ? 'Sign up with Google' : 'Sign in with Google')}
      </button>
    </div>
  )
}

export default function AuthPage({ mode }) {
  const navigate = useNavigate()
  const { saveAuth } = useAuth()

  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [consent, setConsent] = useState(false)
  const [organization, setOrganization] = useState('')
  const [role, setRole] = useState('')
  const [loading, setLoading] = useState(false)

  const [view, setView] = useState('form')
  const [otpEmail, setOtpEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const googlePopupRef = useRef(null)

  const isRegister = mode === 'register'

  const showOtpDeliveryToast = useCallback((data, kind = 'verification') => {
    if (!data || data.otp_delivery !== 'unavailable') return false

    const otpLabel = kind === 'reset' ? 'reset code' : 'verification code'
    if (data.debug_otp) {
      toast.error(`Email service unavailable. Use this ${otpLabel}: ${data.debug_otp}`, { duration: 10000 })
    } else {
      toast.error('Email service unavailable right now. Please try again shortly.')
    }
    return true
  }, [])

  useEffect(() => {
    setView('form')
    setOtp('')
    setOtpEmail('')
  }, [mode])

  const handleGooglePopupMessage = useCallback((event) => {
    if (!googlePopupRef.current || event.source !== googlePopupRef.current) return

    const payload = event.data
    if (!payload || payload.type !== GOOGLE_POPUP_MESSAGE_TYPE) return

    googlePopupRef.current = null
    setLoading(false)

    if (payload.success && payload.access_token && payload.user) {
      saveAuth(payload.access_token, payload.user)
      toast.success(`Welcome, ${payload.user.email}!`)
      navigate('/dashboard')
      return
    }

    toast.error(payload.error || 'Google sign-in failed.')
  }, [navigate, saveAuth])

  useEffect(() => {
    window.addEventListener('message', handleGooglePopupMessage)
    return () => {
      window.removeEventListener('message', handleGooglePopupMessage)
    }
  }, [handleGooglePopupMessage])

  const handleGoogleClick = useCallback(() => {
    if (loading) return

    const popupUrl = `/api/auth/google/start?frontend_origin=${encodeURIComponent(window.location.origin)}`
    const popup = window.open(
      popupUrl,
      'pharmforge-google-auth',
      'popup=yes,width=520,height=700,menubar=no,toolbar=no,status=no'
    )

    if (!popup) {
      toast.error('Popup was blocked. Please allow popups and try again.')
      return
    }

    googlePopupRef.current = popup
    popup.focus()
    setLoading(true)

    const watcher = window.setInterval(() => {
      if (!googlePopupRef.current) {
        window.clearInterval(watcher)
        return
      }
      if (googlePopupRef.current.closed) {
        googlePopupRef.current = null
        window.clearInterval(watcher)
        setLoading(false)
      }
    }, 500)
  }, [loading])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  async function handleSubmit(e) {
    e.preventDefault()
    if (isRegister && !consent) {
      toast.error('You must accept the data consent to register.')
      return
    }
    setLoading(true)
    try {
      if (isRegister) {
        const res = await register(username, email, password, consent, organization || undefined, role || undefined)
        setOtpEmail(res.data.email || email)
        setView('verify-otp')
        setResendCooldown(60)
        if (!showOtpDeliveryToast(res.data, 'verification')) {
          toast.success('Account created! Check your email for the verification code.')
        } else {
          toast('Account created. Continue with OTP verification.', { icon: 'INFO' })
        }
      } else {
        try {
          const res = await login(email, password)
          saveAuth(res.data.access_token, res.data.user)
          toast.success('Welcome back!')
          navigate('/dashboard')
        } catch (err) {
          if (err.response?.status === 403) {
            setOtpEmail(email)
            setView('verify-otp')
            setResendCooldown(0)
            const detail = err.response?.data?.detail
            if (!showOtpDeliveryToast(detail, 'verification')) {
              const fallback = typeof detail === 'string'
                ? detail
                : detail?.message || 'Please verify your email first.'
              toast(fallback, { icon: 'EMAIL' })
            }
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

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code.'); return }
    setLoading(true)
    try {
      const res = await verifyOtp(otpEmail, otp)
      saveAuth(res.data.access_token, res.data.user)
      toast.success('Email verified! Welcome to PharmForge AI.')
      navigate('/dashboard')
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  async function handleResendVerify() {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      const res = await sendOtp(otpEmail)
      setResendCooldown(60)
      if (!showOtpDeliveryToast(res.data, 'verification')) {
        toast.success('New code sent!')
      }
    } catch {
      toast.error('Could not resend. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleForgotEmail(e) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await forgotPassword(otpEmail)
      setResendCooldown(60)
      setOtp('')
      setView('forgot-otp')
      if (!showOtpDeliveryToast(res.data, 'reset')) {
        toast.success('Reset code sent - check your email.')
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to send reset code.')
    } finally {
      setLoading(false)
    }
  }

  function handleForgotOtp(e) {
    e.preventDefault()
    if (otp.length !== 6) { toast.error('Enter the 6-digit code.'); return }
    setView('new-password')
  }

  async function handleResendReset() {
    if (resendCooldown > 0) return
    setLoading(true)
    try {
      const res = await forgotPassword(otpEmail)
      setResendCooldown(60)
      if (!showOtpDeliveryToast(res.data, 'reset')) {
        toast.success('New reset code sent!')
      }
    } catch {
      toast.error('Could not resend. Try again.')
    } finally {
      setLoading(false)
    }
  }

  async function handleNewPassword(e) {
    e.preventDefault()
    if (newPassword.length < 8) { toast.error('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await resetPassword(otpEmail, otp, newPassword)
      toast.success('Password reset! You can now sign in.')
      setView('form')
      setOtp('')
      setNewPassword('')
    } catch (err) {
      const msg = err.response?.data?.detail || 'Reset failed.'
      toast.error(msg)
      if (msg.toLowerCase().includes('code')) setView('forgot-otp')
    } finally {
      setLoading(false)
    }
  }

  if (view === 'verify-otp') return (
    <AuthShell>
      {{
        header: (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Verify your email</h1>
            <p className="text-slate-400 text-sm">
              We sent a 6-digit code to <span className="text-brand-400 font-medium">{otpEmail}</span>
            </p>
          </>
        ),
        body: (
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div>
              <label className="label-text">Verification code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000" autoFocus required
              />
            </div>
            <button type="submit" disabled={loading || otp.length !== 6}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verifying</>
                : <>Verify and Continue <ArrowRight size={16} /></>}
            </button>
            <button type="button" onClick={handleResendVerify}
              disabled={resendCooldown > 0 || loading}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40">
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => { setView('form'); setOtp('') }}
              className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Back
            </button>
          </form>
        ),
      }}
    </AuthShell>
  )

  if (view === 'forgot-email') return (
    <AuthShell>
      {{
        header: (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Forgot password?</h1>
            <p className="text-slate-400 text-sm">Enter your email and we will send a reset code.</p>
          </>
        ),
        body: (
          <form onSubmit={handleForgotEmail} className="space-y-5">
            <div>
              <label className="label-text">Email address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" value={otpEmail} onChange={(e) => setOtpEmail(e.target.value)}
                  className="input-field pl-11" placeholder="you@lab.com" required autoFocus
                />
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Sending</>
                : <>Send Reset Code <ArrowRight size={16} /></>}
            </button>
            <button type="button" onClick={() => setView('form')}
              className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Back to sign in
            </button>
          </form>
        ),
      }}
    </AuthShell>
  )

  if (view === 'forgot-otp') return (
    <AuthShell>
      {{
        header: (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Check your email</h1>
            <p className="text-slate-400 text-sm">
              We sent a 6-digit reset code to <span className="text-brand-400 font-medium">{otpEmail}</span>
            </p>
          </>
        ),
        body: (
          <form onSubmit={handleForgotOtp} className="space-y-5">
            <div>
              <label className="label-text">Reset code</label>
              <input
                type="text" inputMode="numeric" maxLength={6} value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000" autoFocus required
              />
            </div>
            <button type="submit" disabled={otp.length !== 6}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50">
              Continue <ArrowRight size={16} />
            </button>
            <button type="button" onClick={handleResendReset}
              disabled={resendCooldown > 0 || loading}
              className="w-full flex items-center justify-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-40">
              <RefreshCw size={13} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
            </button>
            <button type="button" onClick={() => { setView('forgot-email'); setOtp('') }}
              className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Back
            </button>
          </form>
        ),
      }}
    </AuthShell>
  )

  if (view === 'new-password') return (
    <AuthShell>
      {{
        header: (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">Set new password</h1>
            <p className="text-slate-400 text-sm">Choose a strong password for your account.</p>
          </>
        ),
        body: (
          <form onSubmit={handleNewPassword} className="space-y-5">
            <div>
              <label className="label-text">New password</label>
              <div className="relative">
                <KeyRound size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showNewPass ? 'text' : 'password'} value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field pl-11 pr-11" placeholder="Min. 8 characters"
                  required minLength={8} autoFocus
                />
                <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showNewPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading || newPassword.length < 8}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-50">
              {loading
                ? <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Resetting</>
                : <><CheckCircle2 size={16} /> Reset Password</>}
            </button>
            <button type="button" onClick={() => setView('forgot-otp')}
              className="w-full text-xs text-slate-600 hover:text-slate-400 transition-colors">
              Back
            </button>
          </form>
        ),
      }}
    </AuthShell>
  )

  return (
    <AuthShell>
      {{
        header: (
          <>
            <h1 className="text-2xl font-bold text-white mb-1">
              {isRegister ? 'Create your account' : 'Welcome back'}
            </h1>
            <p className="text-slate-400 text-sm">
              {isRegister ? 'Start with 10 free tokens (100 leads total) on signup' : 'Sign in to your research dashboard'}
            </p>
          </>
        ),
        body: (
          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence>
              {isRegister && (
                <motion.div
                  key="username-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="label-text">Username</label>
                  <div className="relative mt-1">
                    <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text" value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-field pl-11" placeholder="yourname"
                      minLength={2} maxLength={50} required={isRegister}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="label-text">Email address</label>
              <div className="relative mt-1">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  className="input-field pl-11" placeholder="you@lab.com" required
                />
              </div>
            </div>

            <AnimatePresence>
              {isRegister && (
                <motion.div
                  key="org-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="label-text">Organization Name</label>
                  <div className="relative mt-1">
                    <Building2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text" value={organization}
                      onChange={(e) => setOrganization(e.target.value)}
                      className="input-field pl-11" placeholder="University / Company / Lab"
                      maxLength={255}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <AnimatePresence>
              {isRegister && (
                <motion.div
                  key="role-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="label-text">Role</label>
                  <div className="relative mt-1">
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value)}
                      className="input-field appearance-none pr-10 backdrop-blur-sm bg-surface-800/80"
                    >
                      <option value="">Select your role…</option>
                      <option value="professor">Professor</option>
                      <option value="researcher">Researcher</option>
                      <option value="student">Student</option>
                      <option value="industry_scientist">Industry Scientist</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div>
              <label className="label-text">Password</label>
              <div className="relative mt-1">
                <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPass ? 'text' : 'password'} value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pl-11 pr-11" placeholder="Min. 8 characters"
                  required minLength={8}
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {!isRegister && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => { setOtpEmail(email); setView('forgot-email') }}
                    className="text-xs text-brand-400 hover:text-brand-300 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}
            </div>

            <AnimatePresence>
              {isRegister && (
                <motion.div
                  key="consent-field"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <div className="relative mt-0.5 flex-shrink-0">
                      <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="sr-only" />
                      <div
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${consent ? 'bg-brand-600 border-brand-500' : 'border-slate-600 group-hover:border-brand-600'}`}
                        onClick={() => setConsent(!consent)}
                      >
                        {consent && <span className="text-white text-xs font-bold">v</span>}
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

            <button type="submit" disabled={loading}
              className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-sm">
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isRegister ? 'Creating account...' : 'Signing in...'}
                </span>
              ) : (
                <>{isRegister ? 'Create Account' : 'Sign In'} <ArrowRight size={16} /></>
              )}
            </button>

            <p className="text-center text-sm text-slate-400">
              {isRegister ? (
                <>Already have an account?{' '}
                  <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
                </>
              ) : (
                <>Do not have an account?{' '}
                  <Link to="/register" className="text-brand-400 hover:text-brand-300 font-medium">Sign up free</Link>
                </>
              )}
            </p>

            <GoogleButton onClick={handleGoogleClick} isRegister={isRegister} disabled={loading} />
          </form>
        ),
      }}
    </AuthShell>
  )
}