import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowRight, Shield, Zap, Database, FlaskConical, Lock, ChevronRight } from 'lucide-react'

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'De Novo Generation',
    desc: 'Conditional VAE generates novel SMILES molecules conditioned on your protein target — ranked by predicted binding affinity.',
    color: 'from-brand-600/20 to-brand-800/10',
    border: 'border-brand-700/30',
  },
  {
    icon: Zap,
    title: 'Dual-Engine Prediction',
    desc: 'Simultaneously predict activity class (Inhibitor/Activator) and pAffinity score for every generated candidate.',
    color: 'from-violet-600/20 to-violet-900/10',
    border: 'border-violet-700/30',
  },
  {
    icon: Shield,
    title: 'Lipinski Filtering',
    desc: 'Auto-apply Rule-of-5 compliance, QED scoring, TPSA, and synthesizability metrics to prioritize drug-like leads.',
    color: 'from-rose-600/20 to-rose-900/10',
    border: 'border-rose-700/30',
  },
  {
    icon: Database,
    title: 'Encrypted Results',
    desc: 'All discovery outputs (SMILES, affinities, structures) are Fernet-encrypted and securely stored per-user.',
    color: 'from-amber-600/20 to-amber-900/10',
    border: 'border-amber-700/30',
  },
]

const PLANS = [
  { name: 'Free', price: '$0', runs: '10 runs/mo', features: ['Basic generation', 'CSV export', 'History (7 days)'], highlighted: false },
  { name: 'Pro', price: '$10', runs: '100 runs/mo', features: ['Priority inference', 'Full history', 'Encrypted storage', 'API access'], highlighted: true },
  { name: 'Enterprise', price: 'Custom', runs: 'Unlimited', features: ['Dedicated compute', 'Custom models', 'SLA guarantee', 'SSO/SAML'], highlighted: false },
]

const STATS = [
  { value: '2B+', label: 'Parameters (ESM2)' },
  { value: '<60s', label: 'Avg Inference' },
  { value: 'AES-256', label: 'Encryption' },
  { value: '99.9%', label: 'Uptime SLA' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-surface-900 text-white overflow-x-hidden">
      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🧬</span>
            <span className="font-bold text-lg tracking-tight">
              <span className="text-gradient">BioGenesis</span>
              <span className="text-slate-400 font-normal"> AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-5">
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative pt-32 pb-24 px-6">
        {/* Background grid */}
        <div className="absolute inset-0 bg-grid-pattern bg-[size:32px_32px] opacity-100 pointer-events-none" />
        <div className="absolute inset-0 bg-hero-gradient pointer-events-none" />

        {/* Glowing orbs */}
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-40 right-1/4 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 bg-brand-900/50 border border-brand-700/40 
                       text-brand-300 text-xs font-medium px-4 py-1.5 rounded-full mb-8"
          >
            <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
            Powered by ESM2 · ConditionalVAE · RDKit
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.7 }}
            className="text-5xl md:text-7xl font-extrabold leading-[1.1] tracking-tight mb-6"
          >
            <span className="text-gradient">AI-Powered</span>
            <br />
            Drug Discovery
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7 }}
            className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            Input a protein sequence. Get ranked drug candidates with binding affinities,
            QED scores, Lipinski compliance, and 2D structures — in under 60 seconds.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.7 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base py-3 px-8">
              Start Free — 10 Runs
              <ArrowRight size={18} />
            </Link>
            <Link to="/login" className="btn-outline flex items-center justify-center gap-2 text-base py-3 px-8">
              Sign In
            </Link>
          </motion.div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.7 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6"
          >
            {STATS.map((s) => (
              <div key={s.label} className="glass-card p-5 text-center">
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Pipeline visual ── */}
      <section className="py-16 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold mb-2">Inference Pipeline</h2>
            <p className="text-slate-500 text-sm">From sequence to ranked drug candidates</p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {['Protein Sequence', 'ESM2 Embedding', 'VAE Generation', 'RDKit Filtering', 'Affinity Prediction', 'Ranked Leads'].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <div className="glass-card px-4 py-2.5 text-sm font-medium text-brand-300 border border-brand-800/40">
                  <span className="text-slate-500 text-xs mr-1.5">{String(i + 1).padStart(2, '0')}</span>
                  {step}
                </div>
                {i < 5 && <ChevronRight size={16} className="text-slate-600 flex-shrink-0" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need</h2>
            <p className="text-slate-400 max-w-xl mx-auto">
              A complete platform for in-silico drug lead generation — secure, fast, and reproducible.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`glass-card p-6 border ${f.border} bg-gradient-to-br ${f.color} group hover:scale-[1.01] transition-transform duration-300`}
              >
                <div className="flex items-start gap-4">
                  <div className="p-2.5 rounded-xl bg-white/[0.05] group-hover:bg-white/[0.08] transition-colors">
                    <f.icon size={22} className="text-brand-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white mb-1.5">{f.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security badge ── */}
      <section className="py-10 px-6">
        <div className="max-w-4xl mx-auto glass-card p-6 border border-brand-900/40">
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="p-4 bg-brand-900/40 rounded-2xl border border-brand-700/30 flex-shrink-0">
              <Lock size={32} className="text-brand-400" />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-1">Enterprise-grade security</h3>
              <p className="text-slate-400 text-sm leading-relaxed">
                ML models never leave the backend. All compute runs server-side. Drug discovery outputs are
                Fernet-encrypted before DB storage. JWT auth on every protected route. Rate-limited inference.
                No model weights, source code, or proprietary logic are ever transmitted to the browser.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section className="py-20 px-6 border-t border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple pricing</h2>
            <p className="text-slate-400">Start free. Scale as you discover.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                className={`glass-card p-7 flex flex-col relative ${
                  plan.highlighted
                    ? 'border-brand-600/60 ring-1 ring-brand-500/30 shadow-lg shadow-brand-900/40'
                    : 'border-white/[0.06]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm text-slate-400 mb-1 font-medium">{plan.name}</div>
                  <div className="text-4xl font-extrabold text-white mb-1">{plan.price}</div>
                  <div className="text-brand-400 text-sm font-medium">{plan.runs}</div>
                </div>
                <ul className="space-y-2.5 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                      <span className="text-brand-500">✓</span>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={plan.highlighted ? 'btn-primary text-center text-sm' : 'btn-outline text-center text-sm'}
                >
                  Get started
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span>🧬</span>
            <span>BioGenesis AI © 2026 — For research use only.</span>
          </div>
          <div className="flex gap-6 text-xs text-slate-600">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
            <span>Data Consent</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
