import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import {
  Users, List, Search, Edit2, Trash2, Eye, ChevronLeft, ChevronRight,
  ShieldCheck, X, Check, RefreshCw, FlaskConical,
} from 'lucide-react'
import {
  adminGetUsers, adminEditUser, adminDeleteUser,
  adminGetPredictions, adminGetPrediction,
} from '../services/api'
import ResultsPanel from '../components/ResultsPanel'
import Navbar from '../components/Navbar'

const TABS = [
  { id: 'users', label: 'Users', icon: Users },
  { id: 'predictions', label: 'Predictions', icon: FlaskConical },
]

const PLANS = ['free', 'pro', 'enterprise']

// ── Edit User Modal ──────────────────────────────────────────────────────────
function EditUserModal({ user, onClose, onSaved }) {
  const [form, setForm] = useState({
    username: user.username ?? '',
    tokens_left: user.tokens_left,
    plan: user.plan,
    email_verified: user.email_verified,
    is_admin: user.is_admin,
  })
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try {
      const payload = {
        username: form.username || null,
        tokens_left: Number(form.tokens_left),
        plan: form.plan,
        email_verified: form.email_verified,
        is_admin: form.is_admin,
      }
      await adminEditUser(user.id, payload)
      toast.success(`User #${user.id} updated`)
      onSaved()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card border border-white/[0.1] w-full max-w-md p-6 space-y-4"
      >
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-white">Edit User #{user.id}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        <p className="text-xs text-slate-500">{user.email}</p>

        <div className="space-y-3">
          <label className="block">
            <span className="label-text text-xs">Username</span>
            <input className="input-field mt-1" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
          </label>
          <label className="block">
            <span className="label-text text-xs">Tokens Left</span>
            <input type="number" min="0" className="input-field mt-1" value={form.tokens_left}
              onChange={e => setForm(f => ({ ...f, tokens_left: e.target.value }))} />
          </label>
          <label className="block">
            <span className="label-text text-xs">Plan</span>
            <select className="input-field mt-1" value={form.plan} onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
              {PLANS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.email_verified} onChange={e => setForm(f => ({ ...f, email_verified: e.target.checked }))}
                className="accent-brand-500" />
              <span className="text-xs text-slate-300">Email Verified</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.is_admin} onChange={e => setForm(f => ({ ...f, is_admin: e.target.checked }))}
                className="accent-amber-500" />
              <span className="text-xs text-amber-400">Admin</span>
            </label>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="btn-outline flex-1 py-2 text-sm">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 py-2 text-sm flex items-center justify-center gap-2">
            {saving ? <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
            Save
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Prediction Detail Modal ──────────────────────────────────────────────────
function PredictionModal({ predId, onClose }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    adminGetPrediction(predId)
      .then(r => setDetail(r.data))
      .catch(() => toast.error('Could not load prediction.'))
      .finally(() => setLoading(false))
  }, [predId])

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-5xl mt-8 mb-8"
      >
        <div className="flex items-center justify-between mb-4 glass-card border border-white/[0.08] px-4 py-3">
          <span className="text-sm font-semibold text-white">Prediction #{predId} — Full Results</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors"><X size={18} /></button>
        </div>
        {loading
          ? <div className="text-center py-16 text-slate-500">Loading…</div>
          : detail
            ? <ResultsPanel result={{ ...detail, prediction_id: detail.id }} />
            : <div className="text-center py-16 text-rose-400">Failed to load results.</div>
        }
      </motion.div>
    </div>
  )
}

// ── Pagination Controls ──────────────────────────────────────────────────────
function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return (
    <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
      <span>{total} total</span>
      <div className="flex items-center gap-2">
        <button disabled={page <= 1} onClick={() => onChange(page - 1)}
          className="p-1.5 rounded hover:bg-surface-700 disabled:opacity-30 transition-colors">
          <ChevronLeft size={14} />
        </button>
        <span className="text-slate-300">{page} / {totalPages}</span>
        <button disabled={page >= totalPages} onClick={() => onChange(page + 1)}
          className="p-1.5 rounded hover:bg-surface-700 disabled:opacity-30 transition-colors">
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  )
}

// ── Users Tab ────────────────────────────────────────────────────────────────
function UsersTab() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('')   // '' | 'true' | 'false'
  const [adminFilter, setAdminFilter] = useState('')         // '' | 'true' | 'false'
  const [loading, setLoading] = useState(false)
  const [editUser, setEditUser] = useState(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const verified = verifiedFilter === '' ? null : verifiedFilter === 'true'
      const adminOnly = adminFilter === '' ? null : adminFilter === 'true'
      const res = await adminGetUsers(page, 20, search, planFilter, verified, adminOnly)
      setUsers(res.data.items)
      setTotal(res.data.total)
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }, [page, search, planFilter, verifiedFilter, adminFilter])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  async function handleDelete(user) {
    if (!window.confirm(`Delete user ${user.email}? This cannot be undone.`)) return
    try {
      await adminDeleteUser(user.id)
      toast.success(`User ${user.email} deleted`)
      fetchUsers()
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Delete failed')
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  function clearAllFilters() {
    setSearchInput('')
    setSearch('')
    setPlanFilter('')
    setVerifiedFilter('')
    setAdminFilter('')
    setPage(1)
  }

  const planColor = { free: 'text-slate-400', pro: 'text-brand-400', enterprise: 'text-amber-400' }
  const ROLE_LABELS = { professor: 'Professor', researcher: 'Researcher', student: 'Student', industry_scientist: 'Industry Scientist', other: 'Other' }

  return (
    <div>
      {/* Search + Filters */}
      <form onSubmit={handleSearch} className="flex flex-wrap gap-2 mb-4">
        <input
          className="input-field flex-1 min-w-[180px]"
          placeholder="Search by email or username…"
          value={searchInput}
          onChange={e => setSearchInput(e.target.value)}
        />
        <select
          value={planFilter}
          onChange={e => { setPlanFilter(e.target.value); setPage(1) }}
          className="input-field w-32"
        >
          <option value="">All Plans</option>
          <option value="free">Free</option>
          <option value="pro">Pro</option>
          <option value="enterprise">Enterprise</option>
        </select>
        <select
          value={verifiedFilter}
          onChange={e => { setVerifiedFilter(e.target.value); setPage(1) }}
          className="input-field w-36"
        >
          <option value="">All Verified</option>
          <option value="true">Verified</option>
          <option value="false">Unverified</option>
        </select>
        <select
          value={adminFilter}
          onChange={e => { setAdminFilter(e.target.value); setPage(1) }}
          className="input-field w-32"
        >
          <option value="">All Roles</option>
          <option value="true">Admins</option>
          <option value="false">Users</option>
        </select>
        <button type="submit" className="btn-primary px-4 py-2 flex items-center gap-1.5 text-sm">
          <Search size={14} /> Search
        </button>
        <button type="button" onClick={clearAllFilters}
          className="btn-outline px-3 py-2" title="Clear all filters">
          <RefreshCw size={14} />
        </button>
      </form>

      {loading
        ? <div className="text-center py-12 text-slate-500">Loading…</div>
        : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-800/60 text-slate-400 uppercase tracking-wider">
                  {['ID', 'Email', 'Username', 'Organization', 'Role', 'Plan', 'Tokens', 'Verified', 'Admin', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} className={`border-t border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-surface-800/20'} hover:bg-surface-800/40 transition-colors`}>
                    <td className="px-3 py-2.5 text-slate-500 font-mono">#{u.id}</td>
                    <td className="px-3 py-2.5 text-slate-200 max-w-[160px] truncate">{u.email}</td>
                    <td className="px-3 py-2.5 text-slate-400">{u.username || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400 max-w-[140px] truncate">{u.organization || '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400 whitespace-nowrap">{u.role ? (ROLE_LABELS[u.role] || u.role) : '—'}</td>
                    <td className={`px-3 py-2.5 font-medium ${planColor[u.plan] ?? 'text-slate-400'}`}>{u.plan}</td>
                    <td className="px-3 py-2.5 text-slate-300 font-mono">{u.tokens_left.toLocaleString()}</td>
                    <td className="px-3 py-2.5">
                      {u.email_verified
                        ? <span className="text-emerald-400">✓</span>
                        : <span className="text-rose-400">✗</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      {u.is_admin
                        ? <span className="text-amber-400 flex items-center gap-1"><ShieldCheck size={12} /> Yes</span>
                        : <span className="text-slate-600">No</span>}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {new Date(u.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setEditUser(u)} className="text-brand-400 hover:text-brand-300 transition-colors" title="Edit">
                          <Edit2 size={13} />
                        </button>
                        <button onClick={() => handleDelete(u)} className="text-rose-500 hover:text-rose-400 transition-colors" title="Delete">
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={11} className="text-center py-10 text-slate-600">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />

      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSaved={() => { setEditUser(null); fetchUsers() }}
        />
      )}
    </div>
  )
}

// ── Predictions Tab ──────────────────────────────────────────────────────────
function PredictionsTab() {
  const [preds, setPreds] = useState([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [userIdFilter, setUserIdFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [loading, setLoading] = useState(false)
  const [viewId, setViewId] = useState(null)

  const fetchPreds = useCallback(async () => {
    setLoading(true)
    try {
      const res = await adminGetPredictions(page, 20, Number(userIdFilter) || 0, statusFilter)
      setPreds(res.data.items)
      setTotal(res.data.total)
    } catch {
      toast.error('Failed to load predictions')
    } finally {
      setLoading(false)
    }
  }, [page, userIdFilter, statusFilter])

  useEffect(() => { fetchPreds() }, [fetchPreds])

  const statusColor = { done: 'text-emerald-400', failed: 'text-rose-400', pending: 'text-amber-400' }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-4">
        <input
          type="number"
          className="input-field w-40"
          placeholder="Filter by User ID…"
          value={userIdFilter}
          onChange={e => { setUserIdFilter(e.target.value); setPage(1) }}
        />
        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          className="input-field w-36"
        >
          <option value="">All Statuses</option>
          <option value="done">Done</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
        <button onClick={() => { setUserIdFilter(''); setStatusFilter(''); setPage(1) }} className="btn-outline px-3 py-2" title="Clear filters">
          <RefreshCw size={14} />
        </button>
      </div>

      {loading
        ? <div className="text-center py-12 text-slate-500">Loading…</div>
        : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-800/60 text-slate-400 uppercase tracking-wider">
                  {['ID', 'User', 'User Email', 'Leads', 'Top Affinity', 'QED', 'Temp', 'Status', 'Date', 'View'].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preds.map((p, i) => (
                  <tr key={p.id} className={`border-t border-white/[0.04] ${i % 2 === 0 ? '' : 'bg-surface-800/20'} hover:bg-surface-800/40 transition-colors`}>
                    <td className="px-3 py-2.5 text-slate-500 font-mono">#{p.id}</td>
                    <td className="px-3 py-2.5 text-slate-400 font-mono">#{p.user_id}</td>
                    <td className="px-3 py-2.5 text-slate-300 max-w-[160px] truncate">{p.user_email}</td>
                    <td className="px-3 py-2.5 text-slate-300">{p.lead_count}</td>
                    <td className="px-3 py-2.5 text-brand-400 font-mono">{p.top_affinity ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400">{p.min_qed ?? '—'}</td>
                    <td className="px-3 py-2.5 text-slate-400">{p.temperature ?? '—'}</td>
                    <td className={`px-3 py-2.5 font-medium ${statusColor[p.status] ?? 'text-slate-400'}`}>{p.status}</td>
                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-3 py-2.5">
                      {p.status === 'done' && (
                        <button onClick={() => setViewId(p.id)} className="text-brand-400 hover:text-brand-300 transition-colors" title="View results">
                          <Eye size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {preds.length === 0 && (
                  <tr><td colSpan={10} className="text-center py-10 text-slate-600">No predictions found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )
      }
      <Pagination page={page} total={total} pageSize={20} onChange={setPage} />

      {viewId && <PredictionModal predId={viewId} onClose={() => setViewId(null)} />}
    </div>
  )
}

// ── Main AdminPage ────────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users')

  return (
    <div className="min-h-screen bg-surface-900 text-white">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 pt-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
            <ShieldCheck size={18} className="text-amber-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-slate-500">Manage users, predictions and platform data</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-surface-800/60 rounded-xl border border-white/[0.05] w-fit p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.id
                  ? 'bg-amber-600/80 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <t.icon size={14} />
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="glass-card border border-white/[0.07] p-5"
        >
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'predictions' && <PredictionsTab />}
        </motion.div>
      </div>
    </div>
  )
}
