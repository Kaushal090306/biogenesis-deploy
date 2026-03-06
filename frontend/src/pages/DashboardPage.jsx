import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { getProfile, getHistory, getPredictionDetail } from '../services/api'
import Navbar from '../components/Navbar'
import PredictForm from '../components/PredictForm'
import ResultsPanel from '../components/ResultsPanel'
import HistoryTable from '../components/HistoryTable'
import UpgradeModal from '../components/UpgradeModal'

const TABS = [
  { id: 'predict', label: ' Predict' },
  { id: 'history', label: ' History' },
]

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [activeTab, setActiveTab] = useState('predict') // 'predict' | 'history'
  const tabsRef = useRef([])
  const [cursorPos, setCursorPos] = useState({ left: 0, width: 0, opacity: 0 })

  useEffect(() => {
    refreshProfile()
  }, [])

  useEffect(() => {
    if (activeTab === 'history') fetchHistory()
  }, [activeTab, historyPage])

  useEffect(() => {
    const idx = TABS.findIndex(t => t.id === activeTab)
    const el = tabsRef.current[idx]
    if (el) {
      setCursorPos({ left: el.offsetLeft, width: el.getBoundingClientRect().width, opacity: 1 })
    }
  }, [activeTab])

  async function refreshProfile() {
    try {
      const res = await getProfile()
      updateUser(res.data)
    } catch {}
  }

  async function fetchHistory() {
    setLoadingHistory(true)
    try {
      const res = await getHistory(historyPage, 10)
      setHistory(res.data.items)
      setHistoryTotal(res.data.total)
    } catch {
      toast.error('Failed to load history')
    } finally {
      setLoadingHistory(false)
    }
  }

  function handlePredictionComplete(data, updatedTokens) {
    setResult(data)
    updateUser({ tokens_left: updatedTokens })
    setActiveTab('predict')
  }

  function handleTokensLow() {
    setShowUpgrade(true)
  }

  async function handleHistoryView(item) {
    setLoadingDetail(true)
    const tid = toast.loading('Loading prediction results…')
    try {
      const res = await getPredictionDetail(item.id)
      const { leads, csv_str, image_base64, sequence } = res.data
      setResult({ leads, csv_str, image_base64, sequence, prediction_id: item.id })
      setActiveTab('predict')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success(`Loaded prediction #${item.id}`, { id: tid })
    } catch {
      toast.error('Could not load prediction results.', { id: tid })
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar onUpgrade={() => setShowUpgrade(true)} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
        {/* Tabs */}
        <ul
          onMouseLeave={() => {
            const idx = TABS.findIndex(t => t.id === activeTab)
            const el = tabsRef.current[idx]
            if (el) {
              setCursorPos({ left: el.offsetLeft, width: el.getBoundingClientRect().width, opacity: 1 })
            }
          }}
          className="relative flex p-1 bg-surface-800/60 rounded-xl border border-white/[0.05] w-fit mb-8"
        >
          {TABS.map((t, i) => (
            <li
              key={t.id}
              ref={(el) => (tabsRef.current[i] = el)}
              onClick={() => setActiveTab(t.id)}
              onMouseEnter={() => {
                const el = tabsRef.current[i]
                if (!el) return
                setCursorPos({ left: el.offsetLeft, width: el.getBoundingClientRect().width, opacity: 1 })
              }}
              className={`relative z-10 px-5 py-2 rounded-lg text-sm font-medium cursor-pointer select-none transition-colors duration-150 ${
                activeTab === t.id ? 'text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              {t.label}
            </li>
          ))}
          <motion.li
            animate={{ ...cursorPos }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="absolute z-0 top-1 h-[calc(100%-8px)] rounded-lg bg-brand-700/80 shadow-sm"
          />
        </ul>

        {/* Content */}
        {activeTab === 'predict' && (
          <motion.div
            key="predict"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-6"
          >
            {/* Form — always full width at top */}
            <PredictForm
              onResult={handlePredictionComplete}
              onTokensExhausted={handleTokensLow}
              userTokens={user?.tokens_left ?? 0}
              userPlan={user?.plan ?? 'free'}
              onClearResult={() => setResult(null)}
              onUpgrade={() => setShowUpgrade(true)}
            />
            {/* Results — full width below */}
            {result
              ? <ResultsPanel result={result} />
              : (
                <div className="flex flex-col items-center justify-center text-center py-16 glass-card border border-white/[0.05]">
                  <div className="text-5xl mb-4 animate-float">🧬</div>
                  <h3 className="text-base font-semibold text-slate-300 mb-2">Awaiting Pipeline Run</h3>
                  <p className="text-slate-600 text-sm max-w-xs leading-relaxed">
                    Enter a protein sequence, configure parameters, and click Run Discovery Pipeline.
                  </p>
                </div>
              )
            }
          </motion.div>
        )}

        {activeTab === 'history' && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <HistoryTable
              items={history}
              total={historyTotal}
              page={historyPage}
              onPageChange={setHistoryPage}
              loading={loadingHistory}
              onRefresh={fetchHistory}
              onView={handleHistoryView}
            />
          </motion.div>
        )}
      </div>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}
