import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Zap, FlaskConical, User, KeyRound, ChevronDown, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import { changePassword } from '../services/api'
import toast from 'react-hot-toast'
import { AnimatePresence, motion } from 'framer-motion'

function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (next.length < 8) { toast.error('New password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await changePassword(current, next)
      toast.success('Password updated!')
      onClose()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to change password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }} transition={{ duration: 0.2 }}
        className="relative glass-card border border-white/[0.08] w-full max-w-sm p-7"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-brand-900/60 border border-brand-700/40 flex items-center justify-center">
            <KeyRound size={18} className="text-brand-400" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">Change Password</h3>
            <p className="text-xs text-slate-500">Enter your current & new password</p>
          </div>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-text">Current password</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)}
              className="input-field" placeholder="Current password" required />
          </div>
          <div>
            <label className="label-text">New password</label>
            <input type="password" value={next} onChange={e => setNext(e.target.value)}
              className="input-field" placeholder="Min. 8 characters" required minLength={8} />
          </div>
          <button type="submit" disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-2.5 text-sm mt-2">
            {loading
              ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  )
}

function ProfileModal({ user, onClose, onChangePassword }) {
  const PLAN_COLOR = {
    enterprise: 'text-purple-300 bg-purple-900/30 border-purple-700/30',
    pro: 'text-sky-300 bg-sky-900/30 border-sky-700/30',
    free: 'text-slate-300 bg-slate-800/50 border-slate-700/30',
  }
  const planStyle = PLAN_COLOR[user?.plan] || PLAN_COLOR.free

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.92, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 16 }} transition={{ duration: 0.2 }}
        className="relative glass-card border border-white/[0.08] w-full max-w-sm p-7"
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors">
          <X size={18} />
        </button>
        {/* Avatar + name */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-700 to-brand-900 border border-brand-600/40 flex items-center justify-center mb-3 text-2xl font-bold text-white">
            {user?.email?.[0]?.toUpperCase() ?? '?'}
          </div>
          <p className="font-semibold text-white text-base">{user?.email?.split('@')[0]}</p>
          <p className="text-xs text-slate-500 mt-0.5">{user?.email}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Current Plan</p>
            <span className={`text-xs font-bold uppercase px-2.5 py-0.5 rounded-full border ${planStyle}`}>
              {user?.plan ?? 'free'}
            </span>
          </div>
          <div className="bg-surface-800/60 border border-white/[0.06] rounded-xl p-3 text-center">
            <p className="text-xs text-slate-500 mb-1">Tokens Left</p>
            <p className="text-lg font-bold text-brand-300">{user?.tokens_left ?? 0}</p>
          </div>
        </div>

        {/* Member since */}
        <p className="text-xs text-slate-600 text-center mb-5">
          Member since {user?.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long' }) : '—'}
        </p>

        <button onClick={onChangePassword}
          className="w-full flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white bg-surface-700/50 hover:bg-surface-600/50 border border-white/[0.06] py-2.5 rounded-xl transition-all">
          <KeyRound size={14} />
          Change Password
        </button>
      </motion.div>
    </div>
  )
}

export default function Navbar({ onUpgrade }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showChangePass, setShowChangePass] = useState(false)
  const menuRef = useRef(null)

  // Close dropdown on outside click
  useEffect(() => {
    function handler(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleLogout() {
    logout()
    navigate('/')
    toast.success('Signed out.')
  }

  return (
    <>
      <nav className="fixed top-0 inset-x-0 z-50 bg-surface-900/90 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5">
            <span className="text-2xl">🧬</span>
            <span className="font-bold text-base tracking-tight">
              <span className="text-gradient">BioGenesis</span>
              <span className="text-slate-500 font-normal text-sm"> AI</span>
            </span>
          </Link>

          {/* Right */}
          <div className="flex items-center gap-3">
            {user && (
              <>
                <button
                  onClick={onUpgrade}
                  className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300
                             bg-brand-900/30 border border-brand-800/40 hover:border-brand-700/60
                             px-3 py-1.5 rounded-lg transition-all duration-200"
                >
                  <Zap size={12} />
                  Upgrade
                </button>

                {/* Profile dropdown trigger */}
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="flex items-center gap-2 text-xs text-slate-300 bg-surface-700/50 hover:bg-surface-600/60
                               border border-white/[0.05] px-3 py-1.5 rounded-lg transition-all duration-200"
                  >
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-600 to-brand-900 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.email?.[0]?.toUpperCase()}
                    </div>
                    <span className="hidden sm:inline font-mono">{user.email?.split('@')[0]}</span>
                    <span className={`hidden sm:inline text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full border
                      ${user.plan === 'enterprise' ? 'text-purple-300 bg-purple-900/30 border-purple-700/30'
                        : user.plan === 'pro' ? 'text-sky-300 bg-sky-900/30 border-sky-700/30'
                        : 'text-slate-400 bg-slate-800/40 border-slate-700/30'}`}>
                      {user.plan}
                    </span>
                    <ChevronDown size={12} className={`transition-transform ${menuOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {menuOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.96 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 top-full mt-2 w-48 glass-card border border-white/[0.08] rounded-xl overflow-hidden shadow-2xl z-50"
                      >
                        <button
                          onClick={() => { setMenuOpen(false); setShowProfile(true) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                        >
                          <User size={14} className="text-brand-400" />
                          Profile
                        </button>
                        <button
                          onClick={() => { setMenuOpen(false); setShowChangePass(true) }}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/[0.04] hover:text-white transition-colors"
                        >
                          <KeyRound size={14} className="text-brand-400" />
                          Change Password
                        </button>
                        <div className="border-t border-white/[0.05]" />
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-900/20 hover:text-rose-300 transition-colors"
                        >
                          <LogOut size={14} />
                          Sign Out
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Modals */}
      <AnimatePresence>
        {showProfile && (
          <ProfileModal
            user={user}
            onClose={() => setShowProfile(false)}
            onChangePassword={() => { setShowProfile(false); setShowChangePass(true) }}
          />
        )}
        {showChangePass && (
          <ChangePasswordModal onClose={() => setShowChangePass(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
