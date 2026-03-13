import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Play, RotateCcw, Info } from 'lucide-react'
import { runPrediction } from '../services/api'
import { Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip'

const EXAMPLE_SEQ = 'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPLADQFALGDGAVGRFKVETEADVGVDSTDAIRRLAKEAGLDGVIADKNDVTIEDPGT'

const SLIDER_CONFIG = [
  { key: 'min_qed', label: 'Min QED Score', min: 0.1, max: 1.0, step: 0.05, default: 0.6, desc: 'Drug-likeness threshold (0–1). Higher = more drug-like.' },
  { key: 'temperature', label: 'Generation Temperature', min: 0.1, max: 2.0, step: 0.05, default: 0.8, desc: 'Controls diversity. Higher = more creative molecules.' },
  { key: 'min_smiles_len', label: 'Min SMILES Length', min: 10, max: 100, step: 1, default: 40, desc: 'Minimum molecule size.' },
  { key: 'max_smiles_len', label: 'Max SMILES Length', min: 50, max: 200, step: 1, default: 100, desc: 'Maximum molecule size.' },
  { key: 'num_leads', label: 'Number of Leads', min: 10, max: 300, step: 10, default: 10, desc: 'How many drug candidates to generate. Must be a multiple of 10 (1 token = 10 leads).' },
]

export default function PredictForm({ onResult, onTokensExhausted, userTokens, userPlan = 'free', onClearResult, onUpgrade }) {
  const [sequence, setSequence] = useState('')
  const [params, setParams] = useState(
    Object.fromEntries(SLIDER_CONFIG.map((s) => [s.key, s.default]))
  )
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  function setParam(key, val) {
    setParams((p) => ({ ...p, [key]: parseFloat(val) }))
  }

  function reset() {
    setSequence('')
    setParams(Object.fromEntries(SLIDER_CONFIG.map((s) => [s.key, s.default])))
    onClearResult?.()
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = sequence.trim()
    if (!trimmed) { toast.error('Please enter a protein sequence.'); return }
    if (trimmed.length < 10) { toast.error('Sequence must be at least 10 amino acid residues.'); return }
    const requestedLeads = Math.round(params.num_leads)
    const tokensNeeded = Math.ceil(requestedLeads / 10)
    if (userTokens < tokensNeeded) { onTokensExhausted(); toast.error('Not enough tokens for this run. Please top-up.'); return }

    setLoading(true)
    setProgress('Encoding protein with ESM2…')
    const toastId = toast.loading('Running inference pipeline… (~30–90s)')

    try {
      // Simulate progress messages
      const msgs = [
        'Encoding protein with ESM2…',
        'Generating candidate molecules (VAE)…',
        'Filtering by QED and Lipinski…',
        'Predicting binding affinities…',
        'Generating structure images…',
        'Finalizing results…',
      ]
      let mi = 0
      const interval = setInterval(() => {
        if (mi < msgs.length) { setProgress(msgs[mi++]) }
      }, 8000)

      const res = await runPrediction(trimmed, {
        min_qed: params.min_qed,
        temperature: params.temperature,
        min_smiles_len: Math.round(params.min_smiles_len),
        max_smiles_len: Math.round(params.max_smiles_len),
        num_leads: Math.round(params.num_leads),
      })
      clearInterval(interval)

      const { leads, image_base64, csv_str, tokens_left, prediction_id } = res.data
      toast.dismiss(toastId)
      toast.success(`✓ ${leads.length} drug leads found! (Run #${prediction_id})`)
      onResult({ leads, image_base64, csv_str, prediction_id, sequence: trimmed }, tokens_left)
    } catch (err) {
      toast.dismiss(toastId)
      if (err.response?.status === 402) {
        onTokensExhausted()
        toast.error(err.response?.data?.detail || 'Not enough tokens. Please top-up.')
      } else if (err.response?.status === 403) {
        toast.error(err.response?.data?.detail || 'Lead limit reached for your plan. Upgrade to Pro.')
        onUpgrade?.()
      } else if (err.response?.status === 429) {
        toast.error('Rate limit reached. Please wait a minute.')
      } else if (err.response?.status === 422) {
        // Pydantic validation error — detail is [{loc, msg, type, ...}]
        const detail = err.response?.data?.detail
        let msg = 'Validation error.'
        if (Array.isArray(detail)) {
          msg = detail.map(e => `${e.loc?.slice(1).join(' → ') || 'field'}: ${e.msg}`).join('\n')
        } else if (typeof detail === 'string') {
          msg = detail
        }
        console.error('422 detail:', detail)
        toast.error(`Validation error: ${msg}`)
      } else {
        const detail = err.response?.data?.detail
        const msg = typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(e => e.msg).join('; ')
            : 'Inference failed. Check your sequence and try again.'
        toast.error(msg)
      }
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="glass-card border border-white/[0.07] overflow-hidden">
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white text-sm">Start Your Analysis</h2>
          <p className="text-xs text-slate-500 mt-0.5">Input your target protein sequence and parameters</p>
        </div>
        <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RotateCcw size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-4">
        {/* Row 1: Sequence textarea */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="label-text mb-0">Protein Sequence</label>
            <button
              type="button"
              onClick={() => setSequence(EXAMPLE_SEQ)}
              className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
            >
              Use example
            </button>
          </div>
          <textarea
            value={sequence}
            onChange={(e) => setSequence(e.target.value)}
            rows={3}
            className="input-field resize-none leading-relaxed tracking-wider text-brand-300 text-xs"
            placeholder="Enter Valid FASTA Sequence.."
            required
          />
          <span className="text-xs text-slate-600 mt-1 block">
            {sequence.length > 0 ? `${sequence.length} residues` : 'Standard single-letter codes · min 10 residues'}
          </span>
        </div>

        {/* Row 2: Min QED Score + Generation Temperature */}
        <div className="grid grid-cols-2 gap-4">
          {['min_qed', 'temperature'].map((key) => {
            const s = SLIDER_CONFIG.find((c) => c.key === key)
            return (
              <SliderField
                key={s.key}
                config={s}
                value={params[s.key]}
                onChange={(v) => setParam(s.key, v)}
              />
            )
          })}
        </div>

        {/* Row 3: Min SMILES Length + Max SMILES Length */}
        <div className="grid grid-cols-2 gap-4">
          {['min_smiles_len', 'max_smiles_len'].map((key) => {
            const s = SLIDER_CONFIG.find((c) => c.key === key)
            return (
              <SliderField
                key={s.key}
                config={s}
                value={params[s.key]}
                onChange={(v) => setParam(s.key, v)}
              />
            )
          })}
        </div>

        {/* Row 4: Number of Leads counter */}
        {(() => {
          const s = SLIDER_CONFIG.find((c) => c.key === 'num_leads')
          return (
            <CounterField
              config={s}
              value={params.num_leads}
              onChange={(v) => setParam('num_leads', v)}
            />
          )
        })()}
        <p className="text-xs text-slate-600 -mt-2">
          1 token = 10 leads · min 10 leads per run
        </p>

        {/* Row 5: Submit */}
        <div className="flex flex-col items-end gap-1.5">
          <button
            type="submit"
            disabled={loading || userTokens <= 0}
            className="discovery-btn"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-sm">
                <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                <span className="font-mono text-xs">{progress || 'Running…'}</span>
              </span>
            ) : (
              <>
                <span>Start Discovery</span>
                <div className="discovery-btn-icon">
                  <svg height={24} width={24} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M0 0h24v24H0z" fill="none" />
                    <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor" />
                  </svg>
                </div>
              </>
            )}
          </button>
          <p className="text-xs text-slate-600">
            {userTokens} token{userTokens !== 1 ? 's' : ''} remaining
          </p>
          <p className="text-xs text-slate-500 text-center mt-1">
            This run costs {Math.ceil(Math.round(params.num_leads) / 10)} token{Math.ceil(Math.round(params.num_leads) / 10) !== 1 ? 's' : ''} ({Math.round(params.num_leads)} leads)
          </p>
        </div>

        {userTokens === 0 && (
          <p className="text-xs text-rose-400 text-center">
            No tokens remaining — upgrade to continue.
          </p>
        )}
      </form>
    </div>
  )
}

function SliderField({ config, value, onChange, full }) {
  return (
    <div className={full ? 'col-span-2' : ''}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <label className="label-text mb-0 text-xs">{config.label}</label>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="cursor-help focus:outline-none">
                <Info size={11} className="text-slate-600 hover:text-slate-400 transition-colors" />
              </button>
            </TooltipTrigger>
            <TooltipContent variant="light" side="top">{config.desc}</TooltipContent>
          </Tooltip>
        </div>
        <span className="text-xs font-mono text-brand-400 bg-brand-900/30 px-2 py-0.5 rounded">
          {Number.isInteger(config.step) ? Math.round(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        min={config.min}
        max={config.max}
        step={config.step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-1.5 rounded-full bg-surface-600 appearance-none cursor-pointer accent-brand-500"
      />
      <div className="flex justify-between text-xs text-slate-600 mt-1">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  )
}

function CounterField({ config, value, onChange }) {
  const [inputVal, setInputVal] = useState(String(Math.round(value)))

  useEffect(() => {
    setInputVal(String(Math.round(value)))
  }, [value])

  const step = config.step || 1

  function clamp(v) { return Math.min(Math.max(v, config.min), config.max) }
  function snapToStep(v) { return Math.round(v / step) * step }

  function handleDecrease() { onChange(clamp(snapToStep(value) - step)) }
  function handleIncrease() { onChange(clamp(snapToStep(value) + step)) }

  function handleInput(e) {
    setInputVal(e.target.value)
    const n = parseInt(e.target.value, 10)
    if (!isNaN(n)) onChange(clamp(n))
  }

  function handleBlur() {
    const n = parseInt(inputVal, 10)
    if (isNaN(n)) { const c = clamp(snapToStep(config.default)); setInputVal(String(c)); onChange(c) }
    else { const c = clamp(snapToStep(n)); setInputVal(String(c)); onChange(c) }
  }

  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <label className="label-text mb-0 text-xs">{config.label}</label>
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" className="cursor-help focus:outline-none">
              <Info size={11} className="text-slate-600 hover:text-slate-400 transition-colors" />
            </button>
          </TooltipTrigger>
          <TooltipContent variant="light" side="top">{config.desc}</TooltipContent>
        </Tooltip>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleDecrease}
          disabled={value <= config.min}
          className="w-8 h-8 rounded-xl bg-surface-700/60 border border-white/[0.07] text-slate-300 hover:bg-brand-900/50 hover:text-brand-300 hover:border-brand-700/50 disabled:opacity-30 transition-all flex items-center justify-center text-base font-bold select-none"
        >
          −
        </button>
        <input
          type="number"
          min={config.min}
          max={config.max}
          value={inputVal}
          onChange={handleInput}
          onBlur={handleBlur}
          className="flex-1 text-center input-field py-1.5 font-mono text-brand-300 font-bold text-base [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          type="button"
          onClick={handleIncrease}
          disabled={value >= config.max}
          className="w-8 h-8 rounded-xl bg-surface-700/60 border border-white/[0.07] text-slate-300 hover:bg-brand-900/50 hover:text-brand-300 hover:border-brand-700/50 disabled:opacity-30 transition-all flex items-center justify-center text-base font-bold select-none"
        >
          +
        </button>
      </div>
      <div className="flex justify-between text-xs text-slate-600 mt-1.5">
        <span>{config.min}</span>
        <span>{config.max}</span>
      </div>
    </div>
  )
}
