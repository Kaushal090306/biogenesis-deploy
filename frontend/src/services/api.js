import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

// Attach JWT on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('bg_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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
export const register = (email, password, consent) =>
  api.post('/auth/register', { email, password, consent })

export const login = (email, password) =>
  api.post('/auth/login', { email, password })

// ── Prediction ──
export const runPrediction = (sequence, params) =>
  api.post('/predict', { sequence, params }, { timeout: 600_000 }) // 10 min timeout for heavy inference

// ── Dashboard ──
export const getProfile = () => api.get('/dashboard/me')

export const getHistory = (page = 1, pageSize = 10) =>
  api.get('/dashboard/history', { params: { page, page_size: pageSize } })

export const createCheckout = (plan) =>
  api.post('/dashboard/checkout', { plan })

// ── Health ──
export const healthCheck = () => api.get('/health')

export default api
