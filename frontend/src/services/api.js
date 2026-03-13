import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bg_token')
  if (token) {
    // Keep app JWT available in dedicated headers because private HF proxy may
    // reserve Authorization for Space access.
    config.headers.Authorization = `Bearer ${token}`
    config.headers['X-User-Authorization'] = `Bearer ${token}`
    config.headers['X-User-Token'] = token
  }
  return config
})

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('bg_token')
      localStorage.removeItem('bg_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// ── Auth ──
export const register = (username, email, password, consent, organization, role) =>
  api.post('/auth/register', { username, email, password, consent, organization, role })

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

export const sendOtp = (email) =>
  api.post('/auth/send-otp', { email })

export const verifyOtp = (email, otp) =>
  api.post('/auth/verify-otp', { email, otp })

export const googleAuth = (credential) =>
  api.post('/auth/google', { credential })

// ── Prediction ──
export const runPrediction = (sequence, params) =>
  api.post('/predict', { sequence, params }, { timeout: 600_000 }) // 10 min timeout for heavy inference

// ── Dashboard ──
export const getProfile = () => api.get('/dashboard/me')

export const updateUsername = (username) => api.patch('/dashboard/username', { username })

export const updateProfile = (organization, role) =>
  api.patch('/dashboard/profile', { organization, role })

export const getHistory = (page = 1, pageSize = 10) =>
  api.get('/dashboard/history', { params: { page, page_size: pageSize } })

export const createCheckout = (plan) =>
  api.post('/dashboard/checkout', { plan })

export const verifyCheckout = (payment_id, order_id, signature, plan) =>
  api.post('/dashboard/checkout/verify', { payment_id, order_id, signature, plan })

export const getPredictionDetail = (id) =>
  api.get(`/dashboard/history/${id}`)

export const changePassword = (current_password, new_password) =>
  api.post('/auth/change-password', { current_password, new_password })

export const forgotPassword = (email) =>
  api.post('/auth/forgot-password', { email })

export const resetPassword = (email, otp, new_password) =>
  api.post('/auth/reset-password', { email, otp, new_password })

// ── Health ──
export const healthCheck = () => api.get('/health')

// ── Admin ──
export const adminGetUsers = (page = 1, pageSize = 20, search = '', plan = '', verified = null, adminOnly = null) =>
  api.get('/admin/users', { params: { page, page_size: pageSize, search, plan, ...(verified !== null && { verified }), ...(adminOnly !== null && { admin_only: adminOnly }) } })

export const adminGetUser = (id) => api.get(`/admin/users/${id}`)

export const adminEditUser = (id, data) => api.patch(`/admin/users/${id}`, data)

export const adminDeleteUser = (id) => api.delete(`/admin/users/${id}`)

export const adminGetPredictions = (page = 1, pageSize = 20, userId = 0, status = '') =>
  api.get('/admin/predictions', { params: { page, page_size: pageSize, user_id: userId, ...(status && { status }) } })

export const adminGetPrediction = (id) => api.get(`/admin/predictions/${id}`)

export default api
