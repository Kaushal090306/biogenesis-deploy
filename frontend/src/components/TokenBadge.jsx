import { Zap, TrendingUp } from 'lucide-react'

export default function TokenBadge({ user, onUpgrade }) {
  if (!user) return null
  const pct = user.plan === 'enterprise' ? 100 : Math.min((user.tokens_left / (user.plan === 'pro' ? 100 : 10)) * 100, 100)
  const color = pct > 50 ? 'bg-brand-500' : pct > 20 ? 'bg-amber-500' : 'bg-rose-500'

  return (
    <div className="glass-card p-4 border border-white/[0.07] flex items-center gap-5 min-w-[260px]">
      <div className="p-2.5 bg-brand-900/50 rounded-xl border border-brand-800/40">
        <Zap size={18} className="text-brand-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-end justify-between mb-1.5">
          <span className="text-xs text-slate-400 font-medium">Prediction Tokens</span>
          <span className="text-sm font-bold text-white font-mono">{user.tokens_left}</span>
        </div>
        <div className="h-1.5 bg-surface-700 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500 ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
      {user.plan === 'free' && user.tokens_left < 5 && (
        <button
          onClick={onUpgrade}
          className="flex items-center gap-1 text-xs font-medium text-brand-400 hover:text-brand-300 
                     whitespace-nowrap bg-brand-900/40 border border-brand-800/40 px-2.5 py-1.5 rounded-lg transition-colors"
        >
          <TrendingUp size={12} />
          Upgrade
        </button>
      )}
    </div>
  )
}
