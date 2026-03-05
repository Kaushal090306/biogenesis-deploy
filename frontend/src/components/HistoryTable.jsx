import { RefreshCw, ChevronLeft, ChevronRight, Eye } from 'lucide-react'

function StatusBadge({ status }) {
  const map = {
    done: 'bg-green-900/40 text-green-300 border-green-800/40',
    pending: 'bg-amber-900/40 text-amber-300 border-amber-800/40',
    failed: 'bg-rose-900/40 text-rose-300 border-rose-800/40',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${map[status] || map.pending}`}>
      {status}
    </span>
  )
}

function Skeleton() {
  return (
    <tr>
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-white/[0.04] rounded shimmer-bg" />
        </td>
      ))}
    </tr>
  )
}

export default function HistoryTable({ items, total, page, onPageChange, loading, onRefresh, onView }) {
  const totalPages = Math.max(1, Math.ceil(total / 10))

  return (
    <div className="glass-card border border-white/[0.07]">
      <div className="px-5 py-4 border-b border-white/[0.05] flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-white text-sm">Prediction History</h2>
          <p className="text-xs text-slate-500 mt-0.5">{total} total runs</p>
        </div>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-slate-500 hover:text-slate-300 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="leads-table w-full min-w-[600px]">
          <thead>
            <tr>
              <th>#</th>
              <th>Sequence (preview)</th>
              <th>Leads Found</th>
              <th>Top Affinity</th>
              <th>Status</th>
              <th>Date</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {loading
              ? [1, 2, 3].map((i) => <Skeleton key={i} />)
              : items.length === 0
              ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-600">
                    No predictions yet. Run your first pipeline!
                  </td>
                </tr>
              )
              : items.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="font-mono text-xs text-slate-500">#{item.id}</td>
                  <td>
                    <button
                      onClick={() => onView && onView(item)}
                      className="font-mono text-xs text-brand-400 hover:text-brand-300 max-w-[200px] block truncate text-left transition-colors"
                      title={item.sequence}
                    >
                      {item.sequence}
                    </button>
                  </td>
                  <td>
                    <span className="font-bold text-brand-300">{item.lead_count}</span>
                  </td>
                  <td>
                    <span className="font-mono text-xs text-green-400">{item.top_affinity ?? '—'}</span>
                  </td>
                  <td><StatusBadge status={item.status} /></td>
                  <td>
                    <span className="text-xs text-slate-500">
                      {new Date(item.created_at).toLocaleDateString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </span>
                  </td>
                  <td>
                    {item.status === 'done' && (
                      <button
                        onClick={() => onView && onView(item)}
                        className="flex items-center gap-1 text-xs text-slate-400 hover:text-brand-300 bg-white/[0.04] hover:bg-brand-900/30 border border-white/[0.06] px-2.5 py-1 rounded-lg transition-all"
                      >
                        <Eye size={12} />
                        View
                      </button>
                    )}
                  </td>
                </tr>
              ))
            }
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-5 py-3 border-t border-white/[0.04] flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg border border-white/[0.07] text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded-lg border border-white/[0.07] text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
