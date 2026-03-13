import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'
import { getProfile, getHistory, getPredictionDetail } from '../services/api'
import Navbar from '../components/Navbar'
import PredictForm from '../components/PredictForm'
import ResultsPanel from '../components/ResultsPanel'
import HistoryTable from '../components/HistoryTable'
import UpgradeModal from '../components/UpgradeModal'

export default function DashboardPage() {
  const { user, updateUser } = useAuth()
  const { isDark } = useTheme()
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyPage, setHistoryPage] = useState(1)
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    if (!user) refreshProfile()
  }, [user])

  useEffect(() => {
    if (showHistory) fetchHistory()
  }, [showHistory, historyPage])

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
      setShowHistory(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
      toast.success(`Loaded prediction #${item.id}`, { id: tid })
    } catch {
      toast.error('Could not load prediction results.', { id: tid })
    } finally {
      setLoadingDetail(false)
    }
  }

  return (
    <div className={`min-h-screen bg-surface-900 text-white${isDark ? '' : ' theme-light'}`}>
      <Navbar onUpgrade={() => setShowUpgrade(true)} onHistory={() => { setShowHistory(true) }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col gap-6"
        >
          <PredictForm
            onResult={handlePredictionComplete}
            onTokensExhausted={handleTokensLow}
            userTokens={user?.tokens_left ?? 0}
            userPlan={user?.plan ?? 'free'}
            onClearResult={() => setResult(null)}
            onUpgrade={() => setShowUpgrade(true)}
          />
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
      </div>

      {/* History Modal */}
      <AnimatePresence>
        {showHistory && (
          <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-20 pb-8 overflow-y-auto">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowHistory(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-5xl glass-card border border-white/[0.08] rounded-2xl p-6"
            >
              <button
                onClick={() => setShowHistory(false)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors z-10"
              >
                <X size={18} />
              </button>
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
          </div>
        )}
      </AnimatePresence>

      <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
    </div>
  )
}
