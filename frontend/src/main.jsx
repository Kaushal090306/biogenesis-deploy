import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import App from './App.jsx'
import './index.css'

const appTree = (
  <BrowserRouter>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        style: {
          background: '#1a243d',
          color: '#e2e8f0',
          border: '1px solid rgba(20,184,166,0.3)',
          borderRadius: '12px',
          fontSize: '14px',
        },
        success: { iconTheme: { primary: '#14b8a6', secondary: '#fff' } },
        error: { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
      }}
    />
  </BrowserRouter>
)

ReactDOM.createRoot(document.getElementById('root')).render(
  import.meta.env.DEV ? appTree : <React.StrictMode>{appTree}</React.StrictMode>
)
