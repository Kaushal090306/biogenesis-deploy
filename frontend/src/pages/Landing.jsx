import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { WavyBackground } from '@/components/ui/wavy-background'
import RotatingText from '@/components/ui/RotatingText'
import { useAuth } from '../contexts/AuthContext'
import { createCheckout, verifyCheckout } from '../services/api'
import {
  ArrowRight, Shield, Zap, Database, FlaskConical, ChevronRight,
  CheckCircle2, Star, BarChart3, Target, ChevronDown, Menu, X,
} from 'lucide-react'

// ─── Data ────────────────────────────────────────────────────────────────────

const FEATURES = [
  {
    icon: BarChart3,
    title: 'Dynamic Volume Scaling',
    desc: 'Custom Lead Counts: Forge exactly what you need — from 5 high-priority candidates to libraries of 500+ leads for expanded screening.',
    color: 'from-sky-600/20 to-sky-900/10',
    border: 'border-sky-700/30',
    tag: 'Custom Counts',
  },
  {
    icon: Target,
    title: 'Dimensional Precision',
    desc: 'Targeted SMILES Length: Define exact Min/Max character limits to match the specific volume of your target protein’s binding pocket.',
    color: 'from-emerald-600/20 to-emerald-900/10',
    border: 'border-emerald-700/30',
    tag: 'SMILES Length',
  },
  {
    icon: Zap,
    title: 'Innovation Control',
    desc: 'Generative Temperature Tuning: Adjust the "Innovation Dial" — lower temperatures for stable leads, higher to explore novel chemical space.',
    color: 'from-violet-600/20 to-violet-900/10',
    border: 'border-violet-700/30',
    tag: 'Temperature Tuning',
  },
  {
    icon: CheckCircle2,
    title: 'Integrated Quality Gates',
    desc: 'QED-Based Filtering: Set a baseline for drug-likeness so the model only forges molecules that meet your pharmaceutical quality standards.',
    color: 'from-rose-600/20 to-rose-900/10',
    border: 'border-rose-700/30',
    tag: 'QED Filter',
  },
  {
    icon: FlaskConical,
    title: 'Docking-Ready Fidelity',
    desc: 'Validated Chemical Objects: Every output is a strictly valid RDKit object, ready for immediate 3D coordinate generation and docking simulations.',
    color: 'from-brand-600/20 to-brand-800/10',
    border: 'border-brand-700/30',
    tag: 'RDKit Ready',
  },
]

// Additional detail cards for the "How it works" section
const HOW_DETAILS = [
  {
    icon: Star,
    title: 'Novel Chemical Scaffolds',
    desc: 'Forge unique, non-obvious chemical entities that provide a clear path for IPR and patent protection in unexplored chemical spaces.',
  },
  {
    icon: BarChart3,
    title: 'pAffinity Forecasting',
    desc: 'Utilize the v17 predictive engine to rank every generated lead by its statistical probability of binding strength before running a docking job.',
  },
  {
    icon: Shield,
    title: 'Advanced Toxicity Profiling',
    desc: 'Proactively identify risk with fragment-based screening for Nitro-groups, Azo-bonds, and other reactive toxicophores.',
  },
  {
    icon: CheckCircle2,
    title: 'Synthesisability (SA) Metrics',
    desc: 'Prioritize lab resources with a realistic SA Score estimating the complexity of bringing your in silico design to the bench.',
  },
  {
    icon: Shield,
    title: 'Lipinski Rule-of-5 Audit',
    desc: 'Get a granular breakdown of Molecular Weight, LogP, HBD, and HBA to ensure leads are optimized for oral bioavailability.',
  },
  {
    icon: Database,
    title: 'Unified Discovery Reports',
    desc: 'Receive a consolidated .CSV containing 17+ physicochemical and ADMET parameters, streamlining transitions into AutoDock Vina or Schrödinger.',
  },
]

// NOTE: STEPS removed per UX request (first three How-it-Works cards hidden)

const PLANS = [
  {
    key: 'starter',
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
    key: 'researcher',
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
    key: 'pharma',
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
    quote: 'PharmForge AI reduced our hit-to-lead identification from months to hours. The ESM2-powered embeddings capture structural context that traditional ECFP fingerprints miss entirely.',
    stars: 5,
  },
  {
    name: 'Dr. Marcus Webb',
    role: 'Drug Discovery Lead',
    institution: 'ETH Zürich',
    avatar: 'MW',
    color: 'from-violet-700 to-violet-500',
    quote: 'We integrated PharmForge AI into our KRAS G12C campaign and surfaced 3 novel scaffolds our internal DFT pipeline had overlooked. Remarkable tool for early-stage discovery.',
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
  const { user } = useAuth()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

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
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${
        scrolled
          ? 'bg-white/[0.04] backdrop-blur-2xl shadow-lg shadow-black/20'
          : 'bg-transparent backdrop-blur-lg'
      }`}>

        {/* Teal gradient accent line at top */}
        <div className="h-[2px] w-full" style={{
          background: 'linear-gradient(90deg, transparent 0%, #0d9488 30%, #14b8a6 50%, #0d9488 70%, transparent 100%)'
        }} />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-15 flex items-center justify-between gap-4" style={{ height: '64px' }}>

          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group flex-shrink-0">
            <div className="relative">
              <div className="absolute inset-0 bg-brand-500/30 rounded-full blur-md group-hover:bg-brand-400/50 transition-all duration-300" />
              <img src="/dna.svg" alt="PharmForge AI" className="relative w-8 h-8" />
            </div>
              <div className="flex flex-col leading-none">
              <span className="font-extrabold text-sm sm:text-base tracking-tight text-gradient">PharmForge AI</span>
              <span className="text-[10px] text-slate-500 font-medium tracking-widest uppercase">Drug Discovery AI</span>
            </div>
          </a>

          {/* Desktop nav links — centered pill style */}
          <div className="hidden md:flex items-center gap-1">
            {[['#how-it-works', 'How it works'], ['#features', 'Features'], ['#pricing', 'Pricing']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                className="relative px-4 py-1.5 text-sm text-slate-400 hover:text-white rounded-xl
                           hover:bg-white/[0.06] transition-all duration-200 group"
              >
                {label}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-0 group-hover:w-4 h-[2px]
                                 bg-brand-400 rounded-full transition-all duration-300" />
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3 flex-shrink-0">
            <Link
              to="/login"
              className="text-slate-400 hover:text-white text-sm font-medium px-4 py-2 rounded-xl
                         hover:bg-white/[0.05] border border-transparent hover:border-white/[0.08] transition-all duration-200"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="relative overflow-hidden text-sm font-semibold px-5 py-2 rounded-xl text-white
                         transition-all duration-200 hover:scale-[1.03] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 50%, #0d9488 100%)',
                boxShadow: '0 0 18px rgba(20,184,166,0.35), 0 2px 8px rgba(0,0,0,0.4)'
              }}
            >
              <span className="relative z-10 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" />
                Get Started Free
              </span>
            </Link>
          </div>

          {/* Mobile: sign in + hamburger */}
          <div className="flex md:hidden items-center gap-1">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm font-medium px-3 py-2 transition-colors">
              Sign In
            </Link>
            <button
              onClick={() => setMobileMenuOpen(o => !o)}
              className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-white/[0.06]"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.18 }}
            className="md:hidden border-t border-white/[0.06] px-4 py-4 space-y-1"
            style={{ background: 'rgba(10,15,30,0.5)', backdropFilter: 'blur(24px)' }}
          >
            {[['#how-it-works', 'How it works', '→'], ['#features', 'Features', '→'], ['#pricing', 'Pricing', '→']].map(([href, label]) => (
              <a
                key={href}
                href={href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between px-4 py-3 text-slate-300 hover:text-white
                           hover:bg-white/[0.05] rounded-xl text-sm font-medium transition-colors border border-transparent hover:border-white/[0.07]"
              >
                {label}
                <ChevronRight size={14} className="text-slate-600" />
              </a>
            ))}
            <div className="pt-3 pb-1 border-t border-white/[0.06]">
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-center gap-2 w-full text-sm font-semibold py-3 rounded-xl text-white mt-1"
                style={{
                  background: 'linear-gradient(135deg, #0d9488 0%, #14b8a6 100%)',
                  boxShadow: '0 0 16px rgba(20,184,166,0.3)'
                }}
              >
                <span className="w-1.5 h-1.5 bg-white/70 rounded-full animate-pulse" />
                Get Started Free
              </Link>
            </div>
          </motion.div>
        )}
      </nav>

      {/* ── Hero ── */}
      <section className="min-h-screen pt-24 sm:pt-28 pb-12 sm:pb-16 px-4 sm:px-6">
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
                className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold leading-[1.05] tracking-tight mb-5"
              >
                <span className="text-gradient">PharmForge AI:</span>
                <br />
                High-Velocity
                <br />
                <RotatingText
                  texts={['Molecular Engineering', 'Drug Design', 'Compound Generation', 'Ligand Design']}
                  mainClassName="whitespace-nowrap"
                  splitLevelClassName="overflow-hidden pb-0.5"
                  elementLevelClassName="text-teal-300"
                  staggerFrom="last"
                  initial={{ y: '100%' }}
                  animate={{ y: 0 }}
                  exit={{ y: '-120%' }}
                  staggerDuration={0.025}
                  transition={{ type: 'spring', damping: 30, stiffness: 400 }}
                  rotationInterval={2500}
                />
                <br />
                for Targeted Discovery.
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.7 }}
                className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-xl"
              >
                A precision de novo design suite providing researchers with total control over lead novelty, physicochemical properties, and ADMET-readiness for downstream in silico validation.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-3 mb-10"
              >
                <Link to="/register" className="btn-primary flex items-center justify-center gap-2 text-base py-3 px-8">
                  Start Free  20 Leads
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
                  <CheckCircle2 size={14} className="text-brand-500" /> 2 free tokens on signup (each token = 10 leads)
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
                      app.pharmforge.ai
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
            <h2 className="text-3xl md:text-4xl font-bold mb-3">How PharmForge AI works</h2>
            <p className="text-slate-300 max-w-xl mx-auto text-base">Three steps from protein target to ranked drug candidates</p>
          </motion.div>
          {/* First three step cards removed to simplify workflow UI */}
          <div className="mt-10 max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {HOW_DETAILS.map((d, i) => (
                <div key={i} className="glass-morph p-5 h-full">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-white/[0.03] mb-3">
                    <d.icon size={18} className="text-brand-400" />
                  </div>
                  <h4 className="text-white font-semibold mb-2">{d.title}</h4>
                  <p className="text-slate-400 text-sm leading-relaxed">{d.desc}</p>
                </div>
              ))}
            </div>
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
                className={`glass-morph p-8 border ${f.border} bg-gradient-to-br ${f.color} group hover:scale-[1.02] hover:shadow-lg transition-all duration-300 flex flex-col`}
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

      {/* ── Comparison: Standard VS PharmForge (table) ── */}
      <section id="comparison" className="py-16 sm:py-20 px-4 sm:px-6 border-b border-white/[0.04]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 text-brand-400 text-xs font-medium uppercase tracking-widest mb-4">
              <span className="w-6 h-px bg-brand-600" />
              Compare
              <span className="w-6 h-px bg-brand-600" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-3">PharmForge AI Advantage</h2>
            <p className="text-slate-400 max-w-xl mx-auto">How PharmForge AI compares to standard virtual screening workflows</p>
          </div>

          <div className="glass-morph p-0 overflow-hidden">
            <div className="grid grid-cols-3 gap-0 divide-x divide-white/[0.04]">
              {/* Header row */}
              <div className="col-span-3 bg-surface-800/60 p-4">
                <div className="grid grid-cols-3 items-center gap-4">
                  <div className="text-sm text-slate-400 font-medium">Feature</div>
                  <div className="text-sm text-slate-400 font-medium">Standard Virtual Screening</div>
                  <div className="text-sm text-brand-400 font-semibold">PharmForge AI</div>
                </div>
              </div>

              {/* Rows */}
              <div className="p-5 border-t border-white/[0.03]">
                <div className="text-sm text-slate-300 font-medium">Search Space</div>
              </div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Limited to static vendor libraries.</div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Infinite. De novo generation of novel chemistry.</div>

              <div className="p-5 border-t border-white/[0.03]">
                <div className="text-sm text-slate-300 font-medium">Process Control</div>
              </div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Passive (Filtering only).</div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Active. Targeted engineering via user parameters.</div>

              <div className="p-5 border-t border-white/[0.03]">
                <div className="text-sm text-slate-300 font-medium">Lead Quality</div>
              </div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Manual multi-step analysis.</div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Automated. Integrated ADMET &amp; Toxicity audit.</div>

              <div className="p-5 border-t border-white/[0.03]">
                <div className="text-sm text-slate-300 font-medium">Time-to-Dock</div>
              </div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Days/Weeks (Library prep).</div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">Minutes. Direct output of dock-ready candidates.</div>

              <div className="p-5 border-t border-white/[0.03]">
                <div className="text-sm text-slate-300 font-medium">Chemical Innovation</div>
              </div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">High risk of existing patents.</div>
              <div className="p-5 border-t border-white/[0.03] text-slate-300">High probability of novel, patentable hits.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Tech stack and security sections removed per request */}

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
                className="glass-morph p-7 flex flex-col gap-5 hover:border-brand-700/30 transition-colors"
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
            <p className="text-slate-400">One-time token bundles. No subscriptions, no surprises.</p>
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
                className={`glass-morph p-7 flex flex-col relative ${
                  plan.highlighted
                    ? 'border-brand-600/60 ring-1 ring-brand-500/30 shadow-xl shadow-brand-900/40'
                    : ''
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-brand-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-brand-900/40">
                    MOST POPULAR
                  </div>
                )}
                <div className="mb-6">
                  <div className="text-sm text-white mb-1 font-medium">{plan.name}</div>
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-extrabold text-white">₹{plan.priceINR.toLocaleString('en-IN')}</span>
                    <span className="text-slate-400 text-sm mb-1.5">one-time</span>
                  </div>
                  <div className="text-sm font-medium text-white">{plan.runs}</div>
                  <div className="text-xs text-slate-200 mt-1 leading-snug">{plan.audience}</div>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-slate-100">
                      <CheckCircle2 size={15} className="text-brand-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => {
                    if (!user) {
                      navigate('/register')
                    } else {
                      setShowUpgradeModal(true)
                    }
                  }}
                  className={plan.highlighted ? 'btn-primary text-center text-sm w-full' : 'btn-outline text-center text-sm w-full'}
                >
                  {plan.cta}
                </button>
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
            className="glass-morph p-7 sm:p-10 md:p-12 border border-brand-700/30 bg-gradient-to-br from-brand-900/30 to-violet-900/20 relative overflow-hidden text-center"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
            <div className="relative">
              <div className="text-4xl mb-4">🧬</div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold mb-4">
                Ready to accelerate discovery?
              </h2>
              <p className="text-slate-400 text-base sm:text-lg mb-8 max-w-xl mx-auto">
                Join researchers worldwide. Get 2 free tokens on signup (each token = 10 leads). Try two 10-lead runs — no credit card required.
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

      {/* Upgrade Modal (only show when user is logged in) */}
      {showUpgradeModal && user && (
        <UpgradeModalComponent open={showUpgradeModal} onClose={() => setShowUpgradeModal(false)} />
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-white/[0.04] py-10 sm:py-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🧬</span>
                <span className="font-bold text-lg">
                  <span className="text-gradient">PharmForge AI</span>
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
            <span>PharmForge AI © 2026   For research use only. Not for clinical or commercial use.</span>
            <span className="flex items-center gap-1">
              Built with <span className="text-rose-500 mx-1">♥</span> for the drug discovery community
            </span>
          </div>
        </div>
      </footer>

    </WavyBackground>
  )
}

// Inline upgrade modal component for Landing page
function UpgradeModalComponent({ open, onClose }) {
  const { updateUser } = useAuth()
  const [loading, setLoading] = useState(null)

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
        description: `${planId.charAt(0).toUpperCase() + planId.slice(1)} Plan`,
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
            toast.success(`🎉 Upgraded! ${verifyRes.data.tokens_left} tokens added.`)
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
      toast.error(err.response?.data?.detail || 'Failed to start checkout.')
      setLoading(null)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div initial={{ opacity: 0, scale: 0.92 }} animate={{ opacity: 1, scale: 1 }}
        className="relative glass-card border border-white/[0.08] w-full max-w-sm p-7 rounded-2xl"
      >
        <h2 className="text-2xl font-bold mb-6">Choose Your Pack</h2>
        <div className="space-y-4">
          {PLANS.map((plan) => (
            <div key={plan.key} className="p-4 border border-white/[0.1] rounded-lg hover:bg-white/[0.05] transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-semibold text-white">{plan.name}</h3>
                  <p className="text-sm text-slate-400">₹{plan.priceINR.toLocaleString('en-IN')} one-time</p>
                </div>
                <button
                  onClick={() => handleUpgrade(plan.key)}
                  disabled={loading === plan.key}
                  className="px-3 py-1.5 bg-brand-600 hover:bg-brand-500 rounded-lg text-sm font-medium text-white disabled:opacity-50 transition-colors"
                >
                  {loading === plan.key ? '...' : 'Buy'}
                </button>
              </div>
              <p className="text-xs text-slate-500">{plan.runs}</p>
            </div>
          ))}
        </div>
        <button
          onClick={onClose}
          className="mt-6 w-full py-2 text-slate-400 hover:text-white text-sm font-medium transition-colors"
        >
          Cancel
        </button>
      </motion.div>
    </div>
  )
}
