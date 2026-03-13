import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, CheckCircle2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { createCheckout, verifyCheckout } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

const PLANS = [
  {
    id: 'starter',
    name: 'Starter Pack',
    priceINR: 999,
    runs: '10 Tokens · 100 leads total',
    audience: 'Pharmacy students, M.Pharm scholars & hobbyists',
    features: [
      '10 Tokens (1 token = 10 leads)',
      'Up to 100 leads total',
      'Full ADMET & toxicity grid',
      'CSV report download',
      'Structure image download',
      'Encrypted result storage',
    ],
    highlighted: false,
    cta: 'Buy Starter',
  },
  {
    id: 'researcher',
    name: 'Researcher Pack',
    priceINR: 3999,
    runs: '50 Tokens · 500 leads total',
    audience: 'PhD candidates, faculty & IPR / patent agents',
    features: [
      '50 Tokens (1 token = 10 leads)',
      'Up to 500 leads total',
      'Full ADMET & toxicity grid',
      'CSV report download',
      'Structure image download',
      'Priority support',
    ],
    highlighted: true,
    cta: 'Buy Researcher',
  },
  {
    id: 'pharma',
    name: 'Pharma / Lab Pack',
    priceINR: 11999,
    runs: '200 Tokens · 2,000 leads total',
    audience: 'Biotech startups, manufacturers & institutional IPR cells',
    features: [
      '200 Tokens (1 token = 10 leads)',
      'Up to 2,000 leads total',
      'Full ADMET & toxicity grid',
      'CSV report download',
      'Structure image download',
      'Dedicated support',
    ],
    highlighted: false,
    cta: 'Buy Pharma Pack',
  },
]

export default function UpgradeModal({ open, onClose }) {
  const [loading, setLoading] = useState(null)
  const { updateUser } = useAuth()
  const { isDark } = useTheme()

  const modalShellClass = isDark
    ? 'relative glass-card border border-white/[0.08] w-full max-w-4xl p-8'
    : 'relative w-full max-w-4xl p-8 rounded-2xl bg-white border border-slate-200 shadow-2xl shadow-slate-300/40'

  const titleClass = isDark ? 'text-2xl font-bold text-white mb-2' : 'text-2xl font-bold text-slate-900 mb-2'
  const subtitleClass = isDark ? 'text-slate-400 text-sm' : 'text-slate-600 text-sm'

  async function handleUpgrade(planId) {
    setLoading(planId)
    try {
      const res = await createCheckout(planId)
      const { order_id, key_id, amount, currency } = res.data

      const rzp = new window.Razorpay({
        key: key_id,
        amount,
        currency,
        name: 'PharmForge AI',
        description: PLANS.find(p => p.id === planId)?.name ?? planId,
        image: '/dna.svg',
        order_id,
        handler: async function (response) {
          try {
            const verifyRes = await verifyCheckout(
              response.razorpay_payment_id,
              response.razorpay_order_id,
              response.razorpay_signature,
              planId,
            )
            updateUser(verifyRes.data)
            toast.success(`🎉 Payment successful! ${verifyRes.data.tokens_left} tokens available.`)
            onClose()
          } catch {
            toast.error('Payment verified but upgrade failed. Contact support.')
          }
        },
        prefill: {},
        theme: { color: '#14b8a6' },
        modal: {
          ondismiss: () => setLoading(null),
        },
      })
      rzp.open()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to start checkout. Please try again.')
      setLoading(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 py-6 overflow-y-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className={`fixed inset-0 backdrop-blur-sm ${isDark ? 'bg-black/70' : 'bg-slate-900/45'}`}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className={modalShellClass}
          >
            <button
              onClick={onClose}
              className={`absolute top-4 right-4 transition-colors z-10 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-700'}`}
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4 ${isDark ? 'bg-brand-900/50 border border-brand-700/40' : 'bg-brand-100 border border-brand-300/70'}`}>
                <Zap size={24} className={isDark ? 'text-brand-400' : 'text-brand-700'} />
              </div>
              <h2 className={titleClass}>Top Up Tokens</h2>
              <p className={subtitleClass}>One-time token bundles. No subscriptions, no surprises.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 border flex flex-col relative ${
                    plan.highlighted
                      ? (isDark
                        ? 'border-brand-600/60 bg-gradient-to-b from-brand-950/50 to-surface-800/50 ring-1 ring-brand-500/20'
                        : 'border-brand-400/70 bg-brand-50 ring-1 ring-brand-300/60')
                      : (isDark
                        ? 'border-white/[0.07] bg-surface-800/40'
                        : 'border-slate-200 bg-slate-50')
                  }`}
                >
                  {plan.highlighted && (
                    <div className={`absolute -top-3.5 left-1/2 -translate-x-1/2 text-xs font-bold px-4 py-1 rounded-full shadow-lg ${isDark ? 'bg-brand-600 text-white shadow-brand-900/40' : 'bg-brand-600 text-white shadow-brand-500/30'}`}>
                      MOST POPULAR
                    </div>
                  )}
                  <div className="mb-4">
                    <div className={`text-sm font-medium mb-1 ${isDark ? 'text-white' : 'text-slate-800'}`}>{plan.name}</div>
                    <div className="flex items-end gap-1 mb-1">
                      <span className={`text-3xl font-extrabold ${isDark ? 'text-white' : 'text-slate-900'}`}>₹{plan.priceINR.toLocaleString('en-IN')}</span>
                      <span className={`text-sm mb-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>one-time</span>
                    </div>
                    <div className={`text-sm font-medium ${isDark ? 'text-white' : 'text-slate-800'}`}>{plan.runs}</div>
                    <div className={`text-xs mt-1 leading-snug ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{plan.audience}</div>
                  </div>

                  <ul className="space-y-2.5 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className={`flex items-center gap-2.5 text-sm ${isDark ? 'text-slate-100' : 'text-slate-700'}`}>
                        <CheckCircle2 size={14} className="text-brand-400 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!loading}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200
                      disabled:opacity-50 flex items-center justify-center gap-2
                      ${plan.highlighted
                        ? 'bg-brand-600 hover:bg-brand-500 text-white'
                        : (isDark
                          ? 'border border-white/[0.1] hover:border-white/20 text-white hover:bg-white/[0.05]'
                          : 'border border-slate-300 hover:border-slate-400 text-slate-800 hover:bg-slate-100')
                      }`}
                  >
                    {loading === plan.id ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Zap size={14} /> {plan.cta}</>
                    )}
                  </button>
                </div>
              ))}
            </div>

            <p className={`text-center text-xs mt-6 ${isDark ? 'text-slate-600' : 'text-slate-500'}`}>
              Payments powered by Razorpay · Secure · All major cards &amp; UPI accepted
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
