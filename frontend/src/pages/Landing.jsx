import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { WavyBackground } from '@/components/ui/wavy-background'
import {
  ArrowRight, Shield, Zap, Database, FlaskConical, Lock, ChevronRight,
  CheckCircle2, Star, BarChart3, Clock, Dna, Microscope, Target, ChevronDown, Menu, X,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: FlaskConical,
    title: 'De Novo Generation',
    desc: 'Conditional VAE generates novel SMILES molecules conditioned on your protein target   ranked by predicted binding affinity.',
    color: 'from-brand-600/20 to-brand-800/10',
    border: 'border-brand-700/30',
    tag: 'CVAE · ESM2',
  },
  {
    icon: Zap,
    title: 'Dual-Engine Prediction',
    desc: 'Simultaneously predict activity class (Inhibitor/Activator) and pAffinity score for every generated candidate.',
    color: 'from-violet-600/20 to-violet-900/10',
    border: 'border-violet-700/30',
    tag: 'Gradient Boosting',
  },
  {
    icon: Shield,
    title: 'Lipinski Filtering',
    desc: 'Auto-apply Rule-of-5 compliance, QED scoring, TPSA, and synthesizability metrics to prioritize drug-like leads.',
    color: 'from-rose-600/20 to-rose-900/10',
    border: 'border-rose-700/30',
    tag: 'RDKit · SA Score',
  },
  {
    icon: Database,
    title: 'Encrypted Results',
    desc: 'All discovery outputs (SMILES, affinities, structures) are Fernet-encrypted and securely stored per-user.',
    color: 'from-amber-600/20 to-amber-900/10',
    border: 'border-amber-700/30',
    tag: 'AES-256 · JWT',
  },
  {
    icon: BarChart3,
    title: 'Ranked Leads Dashboard',
    desc: 'Interactive dashboard with sortable metrics, 2D structure previews, and one-click CSV export for downstream analysis.',
    color: 'from-sky-600/20 to-sky-900/10',
    border: 'border-sky-700/30',
    tag: 'React · RDKit.js',
  },
  {
    icon: Clock,
    title: 'Sub-60s Inference',
    desc: 'Optimized GPU inference pipeline delivers ranked drug candidate lists in under 60 seconds for any protein target.',
    color: 'from-emerald-600/20 to-emerald-900/10',
    border: 'border-emerald-700/30',
    tag: 'CUDA · Triton',
  },
]

const STEPS = [
  {
    number: '01',
    icon: Dna,
    title: 'Input Your Target',
    desc: 'Paste a protein sequence in FASTA or raw amino acid format. Our pipeline accepts any length with full ESM2 context windows.',
    color: 'text-brand-400',
    bg: 'bg-brand-900/40 border-brand-700/40',
  },
  {
    number: '02',
    icon: Microscope,
    title: 'AI Generates Leads',
    desc: 'Our Conditional VAE encodes the protein embedding and decodes novel SMILES candidates. RDKit filters for drug-likeness in real time.',
    color: 'text-violet-400',
    bg: 'bg-violet-900/40 border-violet-700/40',
  },
  {
    number: '03',
    icon: Target,
    title: 'Review & Export',
    desc: 'Ranked candidates appear in your dashboard with pAffinity, QED, TPSA, and 2D structure previews. Export to CSV with one click.',
    color: 'text-rose-400',
    bg: 'bg-rose-900/40 border-rose-700/40',
  },
]

const PLANS = [
  {
    name: 'Free',
    monthlyPrice: 0,
    runs: '10 runs / month',
    features: ['Basic generation', '50 SMILES candidates', 'CSV export', 'History (7 days)', 'Community support'],
    highlighted: false,
    cta: 'Get started free',
  },
  {
    name: 'Pro',
    monthlyPrice: 10,
    runs: '100 runs / month',
    features: ['Priority GPU inference', '200 SMILES candidates', 'Full history', 'Encrypted storage', 'API access', 'Email support'],
    highlighted: true,
    cta: 'Start Pro trial',
  },
  {
    name: 'Enterprise',
    monthlyPrice: null,
    runs: 'Unlimited',
    features: ['Dedicated compute cluster', 'Custom model fine-tuning', 'SLA guarantee (99.9%)', 'SSO / SAML', 'On-prem deployment', 'Dedicated engineer'],
    highlighted: false,
    cta: 'Contact sales',
  },
]

const STATS = [
  { value: '2B+', label: 'ESM2 Parameters' },
  { value: '<60s', label: 'Avg Inference Time' },
  { value: 'AES-256', label: 'Encryption Standard' },
  { value: '99.9%', label: 'Uptime SLA' },
]

const TESTIMONIALS = [
  {
    name: 'Dr. Sarah Chen',
    role: 'Computational Chemist',
    institution: 'Stanford University',
    avatar: 'SC',
    color: 'from-brand-700 to-brand-500',
    quote: 'BioGenesis AI reduced our hit-to-lead identification from months to hours. The ESM2-powered embeddings capture structural context that traditional ECFP fingerprints miss entirely.',
    stars: 5,
  },
  {
    name: 'Dr. Marcus Webb',
    role: 'Drug Discovery Lead',
    institution: 'ETH Zürich',
    avatar: 'MW',
    color: 'from-violet-700 to-violet-500',
    quote: 'We integrated BioGenesis into our KRAS G12C campaign and surfaced 3 novel scaffolds our internal DFT pipeline had overlooked. Remarkable tool for early-stage discovery.',
    stars: 5,
  },
  {
    name: 'Dr. Priya Rajan',
    role: 'AI Research Scientist',
    institution: 'MIT CSAIL',
    avatar: 'PR',
    color: 'from-rose-700 to-rose-500',
    quote: 'First platform to tightly integrate de novo generation AND multi-target prediction in a single inference pass. Encrypted storage gives our IP team confidence in cloud deployment.',
    stars: 5,
  },
]

const TECH_STACK = [
  { name: 'ESM2', desc: 'Protein LM' },
  { name: 'PyTorch', desc: 'Deep Learning' },
  { name: 'RDKit', desc: 'Cheminformatics' },
  { name: 'FastAPI', desc: 'Backend API' },
  { name: 'PostgreSQL', desc: 'Encrypted DB' },
  { name: 'React', desc: 'Frontend' },
  { name: 'Fernet', desc: 'Encryption' },
  { name: 'AlphaFold', desc: 'Structure Ref.' },
]

const PIPELINE_STEPS = ['Protein Sequence', 'ESM2 Embedding', 'VAE Generation', 'RDKit Filtering', 'Affinity Prediction', 'Ranked Leads']

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.6, ease: 'easeOut' } }),
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Landing() {
  const [annual, setAnnual] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <WavyBackground
      backgroundFill="#0a0f1e"
      colors={['#14b8a6', '#0d9488', '#2dd4bf', '#0f766e', '#5eead4']}
      blur={14}
      speed="slow"
      waveOpacity={0.3}
      waveWidth={60}
      fixed={true}
      containerClassName="min-h-screen bg-surface-900 text-white overflow-x-hidden"
    >

      {/* ── Navbar ── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-surface-900/80 backdrop-blur-xl border-b border-white/[0.05]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 sm:gap-3">
            <span className="text-2xl">🧬</span>
            <span className="font-bold text-base sm:text-lg tracking-tight">
              <span className="text-gradient">BioGenesis</span>
              <span className="text-slate-400 font-normal"> AI</span>
            </span>
          </a>

          {/* Desktop nav links */}
          <div className="hidden md:flex items-center gap-8 text-sm text-slate-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
              Sign In
            </Link>
            <Link to="/register" className="btn-primary text-sm py-2 px-5">
              Get Started Free
            </Link>
          </div>

          {/* Mobile: sign in + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 transition-colors">
              Sign In
            </Link>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="p-2 text-slate-400 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface-900/98 backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 space-y-1">
            <a href="#how-it-works" onClick={() => setMobileMenuOpen(false)}
               className="block px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-xl text-sm transition-colors">
              How it works
            </a>
            <a href="#features" onClick={() => setMobileMenuOpen(false)}
               className="block px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-xl text-sm transition-colors">
              Features
            </a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)}
               className="block px-3 py-2.5 text-slate-300 hover:text-white hover:bg-white/[0.04] rounded-xl text-sm transition-colors">
              Pricing
            </a>
            <div className="pt-2 pb-1 border-t border-white/[0.06]">
              <Link to="/register" onClick={() => setMobileMenuOpen(false)}
                    className="btn-primary block text-center text-sm py-2.5 mt-2">
                Get Started Free
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">

            {/* Left   copy */}
            <div>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 bg-brand-900/50 border border-brand-700/40
                           text-brand-300 text-xs font-medium px-4 py-1.5 rounded-full mb-6"
              >
                <span className="w-1.5 h-1.5 bg-brand-400 rounded-full animate-pulse" />
                Powered by ESM2 · ConditionalVAE · RDKit
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7 }}
                className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight mb-5"
              >
                <span className="text-gradient">AI-Powered</span>
                <br />
                Drug Discovery.
                <br />
                <span className="text-slate-300">In seconds.</span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="text-base sm:text-lg text-slate-400 mb-8 leading-relaxed max-w-xl"
              >
                Input a protein sequence. Get ranked drug candidates with binding affinities,
                QED scores, Lipinski compliance, and 2D structures   in under 60 seconds.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base py-3 px-8">
                  Start Free   10 Runs
                  <ArrowRight size={18} />
                </Link>
                <a href="#how-it-works" className="btn-outline flex items-center justify-center gap-2 text-base py-3 px-8">
                  See how it works
                  <ChevronDown size={18} />
                </a>
              </motion.div>

              {/* Trust indicators */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.7 }}
                className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-slate-500"
              >
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500" /> No credit card required
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500" /> 10 free runs on signup
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-brand-500" /> AES-256 encrypted
                </span>
              </motion.div>
            </div>

            {/* Right — App dashboard preview */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.8 }}
              className="relative hidden sm:block"
            >
              {/* Glow */}
              <div className="absolute -inset-3 bg-brand-600/10 rounded-3xl blur-2xl pointer-events-none" />

              {/* Browser chrome */}
              <div className="relative glass-card border-white/[0.10] overflow-hidden rounded-2xl shadow-2xl shadow-black/40">

                {/* Browser top bar */}
                <div className="flex items-center gap-3 px-4 py-3 bg-surface-750/80 border-b border-white/[0.06]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-brand-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 bg-surface-900/60 border border-white/[0.07] rounded-lg px-3 py-1 text-xs text-slate-500 font-mono w-48 justify-center">
                      <span className="w-2 h-2 rounded-full bg-brand-500 animate-pulse" />
                      app.biogenesis.ai
                    </div>
                  </div>
                </div>

                {/* App content */}
                <div className="p-4 bg-surface-900/60 space-y-3">

                  {/* Input row */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-surface-800/80 border border-white/[0.07] rounded-xl px-3 py-2 text-xs text-slate-400 font-mono truncate">
                      MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPILS…
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.04, 1] }}
                      transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
                      className="flex items-center gap-1.5 bg-brand-600 text-white text-xs font-semibold px-3 py-2 rounded-xl whitespace-nowrap shadow-lg shadow-brand-900/50"
                    >
                      <Zap size={12} />
                      Run
                    </motion.div>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Candidates', value: '32', sub: 'drug-like', color: 'text-brand-400' },
                      { label: 'Avg pAffinity', value: '8.61', sub: 'nM range', color: 'text-violet-400' },
                      { label: 'Time', value: '38.4s', sub: 'inference', color: 'text-amber-400' },
                    ].map(stat => (
                      <div key={stat.label} className="bg-surface-800/60 border border-white/[0.05] rounded-xl p-2.5 text-center">
                        <div className={`text-base font-bold ${stat.color}`}>{stat.value}</div>
                        <div className="text-[10px] text-slate-500">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  {/* Results table */}
                  <div className="bg-surface-800/50 border border-white/[0.05] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-12 px-3 py-2 border-b border-white/[0.05] text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                      <div className="col-span-1">#</div>
                      <div className="col-span-4">SMILES</div>
                      <div className="col-span-2">pAff</div>
                      <div className="col-span-2">QED</div>
                      <div className="col-span-3 pl-3">Class</div>
                    </div>
                    {[
                      { rank: 1, smiles: 'CC1=CC(=O)N(C)N1C', paff: 9.21, qed: 0.87, cls: 'Inhibitor', clsColor: 'text-rose-400 bg-rose-900/30 border-rose-700/30' },
                      { rank: 2, smiles: 'O=C(O)c1ccncc1N',   paff: 8.94, qed: 0.82, cls: 'Inhibitor', clsColor: 'text-rose-400 bg-rose-900/30 border-rose-700/30' },
                      { rank: 3, smiles: 'CC(=O)Nc1ccc(O)cc1',paff: 8.67, qed: 0.79, cls: 'Activator', clsColor: 'text-brand-400 bg-brand-900/30 border-brand-700/30' },
                      { rank: 4, smiles: 'Cc1ccc(NC(=O)c2ccc', paff: 8.41, qed: 0.75, cls: 'Inhibitor', clsColor: 'text-rose-400 bg-rose-900/30 border-rose-700/30' },
                    ].map((row, i) => (
                      <motion.div
                        key={row.rank}
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 + i * 0.12, duration: 0.4 }}
                        className="grid grid-cols-12 px-3 py-2 border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] text-xs items-center"
                      >
                        <div className="col-span-1 text-slate-500 font-semibold">{row.rank}</div>
                        <div className="col-span-4 text-slate-300 font-mono truncate text-[10px]">{row.smiles}</div>
                        <div className="col-span-2 text-brand-400 font-bold">{row.paff}</div>
                        <div className="col-span-2">
                          <div className="flex items-center gap-1">
                            <div className="flex-1 bg-surface-700 rounded-full h-1">
                              <div className="bg-brand-500 h-1 rounded-full" style={{ width: `${row.qed * 100}%` }} />
                            </div>
                            <span className="text-slate-400 text-[10px]">{row.qed}</span>
                          </div>
                        </div>
                        <div className="col-span-3 pl-3">
                          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${row.clsColor}`}>
                            {row.cls}
                          </span>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Bottom action row */}
                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-0.5">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 size={11} className="text-brand-500" />
                      Results encrypted &amp; saved
                    </span>
                    <span className="flex items-center gap-1.5 text-brand-400 font-medium">
                      Export CSV <ArrowRight size={11} />
                    </span>
                  </div>

                </div>
              </div>
            </motion.div>

          </div>

          {/* Stats strip */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.7 }}
            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {STATS.map((s) => (
              <div key={s.label} className="glass-card p-5 text-center hover:border-brand-700/40 transition-colors">
                <div className="text-2xl font-bold text-gradient">{s.value}</div>
                <div className="text-xs text-slate-500 mt-1 font-medium">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 border-t border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 text-brand-400 text-xs font-medium uppercase tracking-widest mb-4">
              <span className="w-6 h-px bg-brand-600" />
              Workflow
              <span className="w-6 h-px bg-brand-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How BioGenesis works</h2>
            <p className="text-slate-400 max-w-xl mx-auto">Three steps from protein target to ranked drug candidates</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.number}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                <div className={`glass-card p-7 border ${step.bg} h-full`}>
                  <div className={`inline-flex items-center justify-center w-12 h-12 rounded-xl border ${step.bg} mb-5`}>
                    <step.icon size={24} className={step.color} />
                  </div>
                  <div className={`text-xs font-bold tracking-widest ${step.color} mb-2`}>{step.number}</div>
                  <h3 className="font-bold text-lg text-white mb-3">{step.title}</h3>
                  <p className="text-slate-400 text-sm leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>



      {/* ── Features ── */}
      <section id="features" className="py-16 sm:py-24 border-b border-white/[0.04]">
        {/* Heading — keep centred inside normal max-width */}
        <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center mb-10 sm:mb-16">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 text-brand-400 text-xs font-medium uppercase tracking-widest mb-4"
          >
            <span className="w-6 h-px bg-brand-600" />
            Features
            <span className="w-6 h-px bg-brand-600" />
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Everything you need</h2>
          <p className="text-slate-400 max-w-xl mx-auto">
            A complete platform for in-silico drug lead generation   secure, fast, and reproducible.
          </p>
        </div>

        {/* Full-viewport rail — no max-width, no horizontal padding */}
        <div className="overflow-hidden w-screen" style={{ marginLeft: 'calc(50% - 50vw)' }}>
          <div className="flex gap-3 sm:gap-4 py-3 rail-track" style={{ width: 'max-content' }}>
            {[...FEATURES, ...FEATURES].map((f, i) => (
              <div
                key={i}
                style={{ width: 'min(85vw, 340px)', minHeight: '240px', flexShrink: 0 }}
                className={`glass-card p-8 border ${f.border} bg-gradient-to-br ${f.color} group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex flex-col`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="p-3 rounded-xl bg-white/[0.05] group-hover:bg-white/[0.09] transition-colors">
                    <f.icon size={26} className="text-brand-400" />
                  </div>
                  <span className="text-[10px] font-mono text-slate-500 bg-white/[0.04] px-2 py-1 rounded border border-white/[0.06]">
                    {f.tag}
                  </span>
                </div>
                <h3 className="font-semibold text-white text-lg mb-3">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed flex-1">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech stack ── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto text-center">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-semibold mb-8">
            Powered by world-class technology
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            {TECH_STACK.map((tech) => (
              <div
                key={tech.name}
                className="flex items-center gap-2 glass-card px-4 py-2 text-sm border-white/[0.07] hover:border-brand-700/40 transition-colors"
              >
                <span className="font-semibold text-white">{tech.name}</span>
                <span className="text-slate-500 text-xs">{tech.desc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Security ── */}
      <section className="py-10 sm:py-14 px-4 sm:px-6 border-b border-white/[0.04]">
        <div className="max-w-4xl mx-auto glass-card p-5 sm:p-8 border border-brand-900/40 bg-gradient-to-br from-brand-900/20 to-transparent">
          <div className="flex flex-col md:flex-row items-center gap-8 text-center md:text-left">
            <div className="p-5 bg-brand-900/50 rounded-2xl border border-brand-700/30 flex-shrink-0">
              <Lock size={36} className="text-brand-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-xl mb-2">Enterprise-grade security built in</h3>
              <p className="text-slate-400 text-sm leading-relaxed mb-4">
                ML models never leave the backend. All compute runs server-side. Drug discovery outputs are
                Fernet-encrypted before DB storage. JWT auth on every protected route. Rate-limited inference.
                No model weights or proprietary logic are ever transmitted to the browser.
              </p>
              <div className="flex flex-wrap gap-2">
                {['AES-256 Encryption', 'JWT Authentication', 'Rate Limiting', 'Server-side ML', 'Role-based Access'].map(badge => (
                  <span key={badge} className="text-xs bg-brand-900/50 text-brand-300 border border-brand-700/40 px-3 py-1 rounded-full">
                    {badge}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-brand-400 text-xs font-medium uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-px bg-brand-600" />
              Researchers
              <span className="w-6 h-px bg-brand-600" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Trusted by researchers</h2>
            <p className="text-slate-400">From academic labs to biotech startups</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className="glass-card p-7 flex flex-col gap-5 hover:border-brand-700/30 transition-colors"
              >
                <div className="flex gap-0.5">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={14} className="text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-slate-300 text-sm leading-relaxed flex-1">"{t.quote}"</p>
                <div className="flex items-center gap-3 pt-2 border-t border-white/[0.05]">
                  <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${t.color} flex items-center justify-center text-xs font-bold text-white flex-shrink-0`}>
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{t.name}</div>
                    <div className="text-xs text-slate-500">{t.role} · {t.institution}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="py-16 sm:py-24 px-4 sm:px-6 border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              className="inline-flex items-center gap-2 text-brand-400 text-xs font-medium uppercase tracking-widest mb-4"
            >
              <span className="w-6 h-px bg-brand-600" />
              Pricing
              <span className="w-6 h-px bg-brand-600" />
            </motion.div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">Simple, transparent pricing</h2>
            <p className="text-slate-400 mb-8">Start free. Scale as you discover.</p>

            {/* Billing toggle */}
            <div className="inline-flex items-center gap-1 bg-surface-800 border border-white/[0.06] rounded-xl p-1.5">
              <button
                onClick={() => setAnnual(false)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${!annual ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Monthly
              </button>
              <button
                onClick={() => setAnnual(true)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${annual ? 'bg-brand-600 text-white' : 'text-slate-400 hover:text-white'}`}
              >
                Annual
                <span className="text-[10px] bg-brand-900 text-brand-300 px-1.5 py-0.5 rounded font-semibold">-20%</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PLANS.map((plan, i) => (
              <motion.div
                key={plan.name}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                className={`glass-card p-7 flex flex-col relative ${
                  plan.highlighted
                    ? 'border-brand-600/60 ring-1 ring-brand-500/30 shadow-xl shadow-brand-900/40'
                    : 'border-white/[0.06]'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-brand-900/40">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm text-slate-400 mb-1 font-medium">{plan.name}</div>
                  {plan.monthlyPrice !== null ? (
                    <div className="flex items-end gap-1 mb-1">
                      <span className="text-4xl font-extrabold text-white">
                        ${annual ? Math.round(plan.monthlyPrice * 0.8) : plan.monthlyPrice}
                      </span>
                      <span className="text-slate-400 text-sm mb-1.5">/ month</span>
                    </div>
                  ) : (
                    <div className="text-4xl font-extrabold text-white mb-1">Custom</div>
                  )}
                  <div className={`text-sm font-medium ${plan.highlighted ? 'text-brand-400' : 'text-slate-500'}`}>
                    {plan.runs}
                  </div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 size={15} className="text-brand-500 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/register"
                  className={plan.highlighted ? 'btn-primary text-center text-sm' : 'btn-outline text-center text-sm'}
                >
                  {plan.cta}
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="py-14 sm:py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-card p-7 sm:p-10 md:p-12 border border-brand-700/30 bg-gradient-to-br from-brand-900/30 to-violet-900/20 relative overflow-hidden text-center"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-4xl mb-4">🧬</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4">
                Ready to accelerate discovery?
              </h2>
              <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">
                Join researchers worldwide. Your first 10 runs are completely free   no credit card required.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base py-3 px-10">
                  Start Free Now
                  <ArrowRight size={18} />
                </Link>
                <Link to="/login" className="btn-outline flex items-center justify-center gap-2 text-base py-3 px-8">
                  Sign In
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🧬</span>
                <span className="font-bold text-lg">
                  <span className="text-gradient">BioGenesis</span>
                  <span className="text-slate-400 font-normal"> AI</span>
                </span>
              </div>
              <p className="text-slate-500 text-sm leading-relaxed max-w-xs">
                AI-powered in-silico drug discovery platform. For academic and research use only.
              </p>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Product</div>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="#how-it-works" className="hover:text-slate-300 transition-colors">How it works</a></li>
                <li><a href="#features" className="hover:text-slate-300 transition-colors">Features</a></li>
                <li><a href="#pricing" className="hover:text-slate-300 transition-colors">Pricing</a></li>
                <li><Link to="/register" className="hover:text-slate-300 transition-colors">Get started</Link></li>
              </ul>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider font-semibold mb-4">Legal</div>
              <ul className="space-y-2.5 text-sm text-slate-500">
                <li><a href="#" className="hover:text-slate-300 transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Terms of Service</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Data Consent</a></li>
                <li><a href="#" className="hover:text-slate-300 transition-colors">Cookie Policy</a></li>
              </ul>
            </div>
          </div>
          <div className="glow-line mb-6" />
          <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <span>BioGenesis AI © 2026   For research use only. Not for clinical or commercial use.</span>
            <span className="flex items-center gap-1">
              Built with <span className="text-rose-500 mx-1">♥</span> for the drug discovery community
            </span>
          </div>
        </div>
      </footer>

    </WavyBackground>
  )
}
