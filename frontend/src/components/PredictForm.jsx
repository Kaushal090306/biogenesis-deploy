import { useState } from 'react'
import toast from 'react-hot-toast'
import { Play, RotateCcw, ChevronDown, ChevronUp, Info } from 'lucide-react'
import { runPrediction } from '../services/api'

const EXAMPLE_SEQ = 'MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQAPLADQFALGDGAVGRFKVETEADVGVDSTDAIRRLAKEAGLDGVIADKNDVTIEDPGT'

const SLIDER_CONFIG = [
  { key: 'min_qed', label: 'Min QED Score', min: 0.1, max: 1.0, step: 0.05, default: 0.6, desc: 'Drug-likeness threshold (0–1). Higher = more drug-like.' },
  { key: 'temperature', label: 'Generation Temperature', min: 0.1, max: 2.0, step: 0.05, default: 0.8, desc: 'Controls diversity. Higher = more creative molecules.' },
  { key: 'min_smiles_len', label: 'Min SMILES Length', min: 10, max: 100, step: 1, default: 40, desc: 'Minimum molecule size.' },
  { key: 'max_smiles_len', label: 'Max SMILES Length', min: 50, max: 200, step: 1, default: 100, desc: 'Maximum molecule size.' },
  { key: 'num_leads', label: 'Number of Leads', min: 1, max: 50, step: 1, default: 9, desc: 'How many drug candidates to generate.' },
]

export default function PredictForm({ onResult, onTokensExhausted, userTokens }) {
  const [sequence, setSequence] = useState('')
  const [params, setParams] = useState(() =>
    Object.fromEntries(SLIDER_CONFIG.map((s) => [s.key, s.default]))
  )
  const [advanced, setAdvanced] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState('')

  function setParam(key, val) {
    setParams((p) => ({ ...p, [key]: parseFloat(val) }))
  }

  function reset() {
    setSequence('')
    setParams(Object.fromEntries(SLIDER_CONFIG.map((s) => [s.key, s.default])))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const trimmed = sequence.trim()
    if (!trimmed) { toast.error('Please enter a protein sequence.'); return }
    if (trimmed.length < 10) { toast.error('Sequence must be at least 10 amino acid residues.'); return }
    if (userTokens <= 0) { onTokensExhausted(); return }

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
        toast.error('No tokens remaining. Please upgrade your plan.')
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
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white text-sm">Configure Pipeline</h2>
          <p className="text-xs text-slate-500 mt-0.5">Input your target protein sequence</p>
        </div>
        <button onClick={reset} className="text-slate-500 hover:text-slate-300 transition-colors">
          <RotateCcw size={15} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-5">
        {/* Sequence input */}
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
            rows={5}
            className="input-field resize-none leading-relaxed tracking-wider text-brand-300"
            placeholder="MKTAYIAKQRQISFVKSHFSRQLEERLGLIEVQ…
Paste your target protein amino acid sequence here."
            required
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-slate-600">
              {sequence.length > 0 ? `${sequence.length} residues` : 'Standard single-letter codes'}
            </span>
          </div>
        </div>

        {/* Quick params */}
        <div className="grid grid-cols-2 gap-4">
          {SLIDER_CONFIG.slice(0, 2).map((s) => (
            <SliderField key={s.key} config={s} value={params[s.key]} onChange={(v) => setParam(s.key, v)} />
          ))}
        </div>

        {/* Num leads */}
        <SliderField
          config={SLIDER_CONFIG[4]}
          value={params.num_leads}
          onChange={(v) => setParam('num_leads', v)}
          full
        />

        {/* Advanced toggle */}
        <button
          type="button"
          onClick={() => setAdvanced(!advanced)}
          className="flex items-center gap-2 text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          {advanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {advanced ? 'Hide' : 'Show'} advanced parameters
        </button>

        {advanced && (
          <div className="grid grid-cols-2 gap-4 pt-1">
            {SLIDER_CONFIG.slice(2, 4).map((s) => (
              <SliderField key={s.key} config={s} value={params[s.key]} onChange={(v) => setParam(s.key, v)} />
            ))}
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading || userTokens <= 0}
          className="btn-primary w-full flex items-center justify-center gap-2 py-3"
        >
          {loading ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              <span className="font-mono text-xs">{progress || 'Running…'}</span>
            </span>
          ) : (
            <>
              <Play size={16} fill="currentColor" />
              <span>Run Discovery Pipeline</span>
              <span className="ml-auto text-xs bg-white/10 px-2 py-0.5 rounded-md">
                {userTokens} left
              </span>
            </>
          )}
        </button>

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
          <div className="group relative">
            <Info size={11} className="text-slate-600 hover:text-slate-400 cursor-help" />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-44 bg-surface-700 text-slate-300 text-xs p-2.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10 shadow-xl border border-white/[0.07]">
              {config.desc}
            </div>
          </div>
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
