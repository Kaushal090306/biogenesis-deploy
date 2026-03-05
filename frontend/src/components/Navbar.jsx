import { Link, useNavigate } from 'react-router-dom'
import { LogOut, Zap, FlaskConical } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function Navbar({ onUpgrade }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/')
    toast.success('Signed out.')
  }

  return (
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
              <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-surface-700/50 px-3 py-1.5 rounded-lg border border-white/[0.05]">
                <FlaskConical size={12} className="text-brand-400" />
                <span className="font-mono">{user.email?.split('@')[0]}</span>
                <span className="text-slate-600">·</span>
                <span className={user.plan === 'enterprise' ? 'badge-enterprise' : user.plan === 'pro' ? 'badge-pro' : 'badge-free'}>
                  {user.plan}
                </span>
              </div>

              <button
                onClick={onUpgrade}
                className="hidden sm:flex items-center gap-1.5 text-xs font-medium text-brand-400 hover:text-brand-300 
                           bg-brand-900/30 border border-brand-800/40 hover:border-brand-700/60 
                           px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                <Zap size={12} />
                Upgrade
              </button>

              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white 
                           bg-surface-700/50 hover:bg-surface-600/50 border border-white/[0.05] 
                           px-3 py-1.5 rounded-lg transition-all duration-200"
              >
                <LogOut size={13} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
