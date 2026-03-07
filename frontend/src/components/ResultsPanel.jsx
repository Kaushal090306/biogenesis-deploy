import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { Download, ChevronUp, ChevronDown, Dna, FlaskConical, FileSpreadsheet, Image as ImageIcon, ArrowUp } from 'lucide-react'

// Matches backend ml_pipeline.py lead entry fields
const COL_DEFS = [
  { key: 'compound_id',         label: 'Compound_ID',        mono: true },
  { key: 'smiles',              label: 'SMILES',             mono: true, truncate: true },
  { key: 'mw',                  label: 'MW',                 sortable: true },
  { key: 'logp',                label: 'LogP',               sortable: true },
  { key: 'tpsa',                label: 'TPSA' },
  { key: 'qed',                 label: 'QED',                sortable: true },
  { key: 'sa_score',            label: 'SA_Score',           sortable: true },
  { key: 'hia_absorption',      label: 'HIA_Absorption' },
  { key: 'bbb_permeability',    label: 'BBB_Permeability' },
  { key: 'toxicity',            label: 'Toxicity' },
  { key: 'tox_detail',          label: 'Tox_Detail' },
  { key: 'ro5_pass',            label: 'Ro5_Pass' },
  { key: 'ro5_violations',      label: 'Ro5_Violations' },
  { key: 'hbd_count',           label: 'HBD' },
  { key: 'hba_count',           label: 'HBA' },
  { key: 'predicted_p_affinity',label: 'Predicted_pAffinity',sortable: true, highlight: true },
  { key: 'activity_class',      label: 'Activity_Class' },
]

export default function ResultsPanel({ result }) {
  const [sortKey, setSortKey] = useState('predicted_p_affinity')
  const [sortAsc, setSortAsc] = useState(false)
  const [expandImg, setExpandImg] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const tableScrollRef = useRef(null)

  function handleTableScroll(e) {
    setShowScrollTop(e.currentTarget.scrollTop > 160)
  }

  function scrollTableToTop() {
    tableScrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!result) {
    return (
      <div className="glass-card border border-white/[0.07] flex flex-col items-center justify-center min-h-[500px] text-center p-12">
        <div className="text-5xl mb-4 animate-float">🧬</div>
        <h3 className="text-lg font-semibold text-slate-300 mb-2">Awaiting Prediction</h3>
        <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
          Configure parameters and run the pipeline to see ranked drug candidates, structures, and analytics here.
        </p>
        <div className="mt-8 flex flex-wrap gap-2 justify-center text-xs text-slate-700">
          {['SMILES','MW','LogP','TPSA','QED','SA_Score','HIA','BBB','Toxicity','Ro5','pAffinity','Structures'].map(l => (
            <span key={l} className="px-3 py-1.5 bg-surface-800 rounded-lg border border-white/[0.04]">{l}</span>
          ))}
        </div>
      </div>
    )
  }

  const { leads, image_base64, csv_str, prediction_id, sequence } = result

  const sorted = [...leads].sort((a, b) => {
    const va = a[sortKey] ?? 0, vb = b[sortKey] ?? 0
    return sortAsc ? va - vb : vb - va
  })

  function toggleSort(key) {
    if (sortKey === key) setSortAsc(!sortAsc)
    else { setSortKey(key); setSortAsc(false) }
  }

  function downloadCSV() {
    const blob = new Blob([csv_str], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `Discovery_Report_${prediction_id}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  function downloadImage() {
    const a = document.createElement('a')
    a.href = `data:image/png;base64,${image_base64}`
    a.download = `Structure_Report_300DPI_${prediction_id}.png`; a.click()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-5"
    >
      {/* ── 1. Protein Sequence Echo ── */}
      <div className="glass-card border border-white/[0.07] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Dna size={15} className="text-brand-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Target Protein Sequence</span>
          <span className="ml-auto text-xs text-slate-600">{sequence?.length} residues · Run #{prediction_id}</span>
        </div>
        <div className="bg-surface-800/60 rounded-lg border border-white/[0.05] px-4 py-3 font-mono text-xs text-brand-300 leading-relaxed break-all">
          {sequence}
        </div>
      </div>

      {/* ── 2. Structure Image (Top Candidates ranked by Affinity) ── */}
      <div className="glass-card border border-white/[0.07] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon size={14} className="text-brand-400" />
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
              Top Candidate Structures (Ranked by Affinity)
            </span>
            <span className="text-xs text-slate-600">· {leads.length} structures</span>
          </div>
          <button
            onClick={() => setExpandImg(!expandImg)}
            className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
          >
            {expandImg ? 'Shrink' : 'Expand'}
          </button>
        </div>
        <div className={`bg-white ${expandImg ? '' : 'max-h-[520px]'} overflow-hidden`}>
          {image_base64 ? (
            <img
              src={`data:image/png;base64,${image_base64}`}
              alt="Molecule structure grid"
              className="w-full h-auto block"
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 bg-surface-900">
              <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-600 mb-3"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <p className="text-slate-500 text-sm">Structure image not available for this prediction.</p>
              <p className="text-slate-600 text-xs mt-1">Run a new prediction to generate structure images.</p>
            </div>
          )}
        </div>
      </div>

      {/* ── 3. Download Buttons (CSV + PNG side by side, like Gradio) ── */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={downloadCSV}
          className="btn-outline flex items-center justify-center gap-2 py-3 text-sm"
        >
          <FileSpreadsheet size={16} />
          Download Full CSV Report
        </button>
        <button
          onClick={downloadImage}
          disabled={!image_base64}
          className="btn-outline flex items-center justify-center gap-2 py-3 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Download size={16} />
          Download 300 DPI Structure Grid
        </button>
      </div>

      {/* ── 4. Full Lead Analysis Table (all Gradio columns) ── */}
      <div className="glass-card border border-white/[0.07] overflow-hidden">
        <div className="px-4 py-3 border-b border-white/[0.05] flex items-center gap-2">
          <FlaskConical size={14} className="text-brand-400" />
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider">Comprehensive Lead Analysis Table</span>
          <span className="ml-auto text-xs bg-brand-900/60 text-brand-300 border border-brand-800/40 px-2 py-0.5 rounded-full">
            {leads.length} leads
          </span>
        </div>

        {/* Fixed-height box: shows 20 rows, both axes scroll, sticky header */}
        <div className="relative">
        <div
          ref={tableScrollRef}
          onScroll={handleTableScroll}
          className="overflow-x-auto overflow-y-auto max-h-[640px] border border-white/[0.04] rounded-b-xl"
        >
          <table className="leads-table w-full text-xs">
            <thead className="sticky top-0 z-10 bg-surface-900">
              <tr>
                {COL_DEFS.map((col) => (
                  <th
                    key={col.key}
                    onClick={col.sortable ? () => toggleSort(col.key) : undefined}
                    className={`whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-brand-400 select-none' : ''}`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.sortable && (
                        <span className={sortKey === col.key ? 'text-brand-400' : 'text-slate-700'}>
                          {sortKey === col.key ? (sortAsc ? <ChevronUp size={11}/> : <ChevronDown size={11}/>) : <ChevronDown size={11} className="opacity-30"/>}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((lead, i) => (
                <tr key={lead.compound_id} className={i === 0 ? 'bg-brand-950/25' : ''}>
                  {COL_DEFS.map((col) => {
                    const val = lead[col.key]
                    return (
                      <td key={col.key} className={`whitespace-nowrap ${col.highlight ? 'font-bold text-brand-300' : ''}`}>
                        {col.key === 'smiles' ? (
                          <span
                            className="font-mono block max-w-[180px] truncate"
                            title={String(val)}
                          >
                            {val}
                          </span>
                        ) : col.key === 'compound_id' ? (
                          <span className="font-mono text-slate-300">{val}</span>
                        ) : col.key === 'ro5_pass' ? (
                          <span className={val === 'Yes' ? 'text-green-400 font-semibold' : 'text-rose-400 font-semibold'}>{val}</span>
                        ) : col.key === 'toxicity' ? (
                          <span className={val === 'Safe' ? 'text-green-400 font-semibold' : 'text-amber-400 font-semibold'}>{val}</span>
                        ) : col.key === 'hia_absorption' || col.key === 'bbb_permeability' ? (
                          <span className={val === 'High' ? 'text-brand-300 font-semibold' : 'text-slate-500'}>{val}</span>
                        ) : col.key === 'activity_class' ? (
                          <span className={`px-2 py-0.5 rounded-full ${
                            val === 'Inhibitor' ? 'bg-rose-900/50 text-rose-300' : 'bg-green-900/50 text-green-300'
                          }`}>{val}</span>
                        ) : (
                          val
                        )}
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scroll-to-top button — appears after scrolling down */}
        {showScrollTop && (
          <button
            onClick={scrollTableToTop}
            className="absolute bottom-4 right-4 z-20 flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold bg-brand-600/90 hover:bg-brand-500 text-white shadow-lg backdrop-blur-sm border border-brand-500/40 transition-all"
          >
            <ArrowUp size={13} />
            
          </button>
        )}
        </div>
      </div>
    </motion.div>
  )
}
