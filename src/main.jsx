import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster, ToastBar, toast } from 'react-hot-toast'
import App from './App.jsx'
import './styles/index.css'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#22c55e',
              secondary: '#fff',
            },
          },
          error: {
            duration: 5000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      >
        {(t) => (
          <ToastBar toast={t}>
            {({ icon, message }) => (
              <>
                {icon}
                {message}
                {t.type !== 'loading' && (
                  <button
                    type="button"
                    aria-label="Close"
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                      marginLeft: 'auto',
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: '0 0 0 8px',
                      fontSize: '1.1rem',
                      lineHeight: 1,
                      opacity: 0.8,
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.opacity = '1'
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.opacity = '0.8'
                    }}
                  >
                    ×
                  </button>
                )}
              </>
            )}
          </ToastBar>
        )}
      </Toaster>
    </BrowserRouter>
  </React.StrictMode>
)
