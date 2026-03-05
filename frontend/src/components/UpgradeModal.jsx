import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Zap, Check } from 'lucide-react'
import toast from 'react-hot-toast'
import { createCheckout } from '../services/api'

const PLANS = [
  {
    id: 'pro',
    name: 'Pro',
    price: '$10',
    period: '/month',
    tokens: 100,
    features: ['100 prediction runs/month', 'Full prediction history', 'Encrypted storage', 'Priority compute'],
    cta: 'Upgrade to Pro',
    highlight: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Contact us',
    period: '',
    tokens: 'Unlimited',
    features: ['Unlimited runs', 'Custom model support', 'Dedicated infrastructure', 'SLA + support'],
    cta: 'Contact Sales',
    highlight: false,
  },
]

export default function UpgradeModal({ open, onClose }) {
  const [loading, setLoading] = useState(null)

  async function handleUpgrade(planId) {
    if (planId === 'enterprise') {
      toast('Contact us at hello@biogenesis.ai', { icon: '📧' })
      return
    }
    setLoading(planId)
    try {
      const res = await createCheckout(planId)
      window.location.href = res.data.checkout_url
    } catch {
      toast.error('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="relative glass-card border border-white/[0.08] w-full max-w-2xl p-8"
          >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-900/50 border border-brand-700/40 rounded-2xl mb-4">
                <Zap size={24} className="text-brand-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Upgrade Your Plan</h2>
              <p className="text-slate-400 text-sm">
                You've used all your free tokens. Upgrade to continue drug discovery.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {PLANS.map((plan) => (
                <div
                  key={plan.id}
                  className={`rounded-2xl p-6 border flex flex-col ${
                    plan.highlight
                      ? 'border-brand-600/60 bg-gradient-to-b from-brand-950/50 to-surface-800/50 ring-1 ring-brand-500/20'
                      : 'border-white/[0.07] bg-surface-800/40'
                  }`}
                >
                  {plan.highlight && (
                    <span className="text-xs bg-brand-600 text-white font-bold px-3 py-1 rounded-full w-fit mb-3">
                      RECOMMENDED
                    </span>
                  )}
                  <div className="mb-4">
                    <div className="text-sm text-slate-400 font-medium mb-1">{plan.name}</div>
                    <div className="text-3xl font-extrabold text-white">
                      {plan.price}
                      <span className="text-sm font-normal text-slate-400">{plan.period}</span>
                    </div>
                    <div className="text-brand-400 text-sm font-medium mt-1">
                      {typeof plan.tokens === 'number' ? `${plan.tokens} runs/month` : plan.tokens}
                    </div>
                  </div>

                  <ul className="space-y-2 mb-6 flex-1">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <Check size={14} className="text-brand-500 flex-shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={!!loading}
                    className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 
                      disabled:opacity-50 flex items-center justify-center gap-2
                      ${plan.highlight
                        ? 'bg-brand-600 hover:bg-brand-500 text-white'
                        : 'border border-white/[0.1] hover:border-white/20 text-white hover:bg-white/[0.05]'
                      }`}
                  >
                    {loading === plan.id ? (
                      <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : plan.highlight ? (
                      <><Zap size={14} /> {plan.cta}</>
                    ) : plan.cta}
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-slate-600 mt-6">
              Payments powered by Stripe · Cancel anytime · All major cards accepted
            </p>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
