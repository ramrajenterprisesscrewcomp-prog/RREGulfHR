import { useState, useEffect, useCallback } from 'react'
import CandidateDatabase from './components/CandidateDatabase.jsx'

const LOGIN_EMAIL = import.meta.env.VITE_LOGIN_EMAIL
const LOGIN_PASS = import.meta.env.VITE_LOGIN_PASS
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

export default function App() {
  const [loggedIn, setLoggedIn] = useState(() => sessionStorage.getItem('rre_auth') === 'ok')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [accessToken, setAccessToken] = useState(null)
  const [tokenClient, setTokenClient] = useState(null)

  useEffect(() => {
    if (!loggedIn) return
    const init = () => {
      if (!window.google?.accounts?.oauth2) return
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: 'https://www.googleapis.com/auth/spreadsheets',
        callback: (res) => {
          if (res.access_token) setAccessToken(res.access_token)
        },
      })
      setTokenClient(client)
      client.requestAccessToken({ prompt: '' })
    }
    if (window.google?.accounts?.oauth2) {
      init()
    } else {
      const iv = setInterval(() => {
        if (window.google?.accounts?.oauth2) { init(); clearInterval(iv) }
      }, 300)
      return () => clearInterval(iv)
    }
  }, [loggedIn])

  const handleLogin = (e) => {
    e.preventDefault()
    if (email.trim() === LOGIN_EMAIL && password === LOGIN_PASS) {
      sessionStorage.setItem('rre_auth', 'ok')
      setLoggedIn(true)
      setLoginError('')
    } else {
      setLoginError('Invalid email or password')
    }
  }

  const requestToken = useCallback(() => {
    if (tokenClient) tokenClient.requestAccessToken({ prompt: '' })
  }, [tokenClient])

  if (!loggedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0d1117' }}>
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl mb-3" style={{ background: '#4f8ff7' }}>
              <svg width="24" height="24" fill="white" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">RRE HR</h1>
            <p className="text-sm mt-1" style={{ color: '#8b949e' }}>Consultancy Dashboard</p>
          </div>
          <form onSubmit={handleLogin} className="rounded-2xl p-6 flex flex-col gap-4" style={{ background: '#111620', border: '1px solid #1e2533' }}>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#c9d1d9' }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ background: '#0d1117', border: '1px solid #1e2533', color: '#e6edf3', '--tw-ring-color': '#4f8ff7' }}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#c9d1d9' }}>Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2"
                style={{ background: '#0d1117', border: '1px solid #1e2533', color: '#e6edf3' }}
                required
              />
            </div>
            {loginError && (
              <p className="text-sm" style={{ color: '#f85149' }}>{loginError}</p>
            )}
            <button
              type="submit"
              className="w-full py-2 rounded-lg font-semibold text-white transition-all hover:opacity-90 active:scale-95"
              style={{ background: '#4f8ff7' }}
            >
              Sign In
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col" style={{ minHeight: '100vh', background: '#0d1117' }}>
      <nav className="flex items-center justify-between px-6 py-3 border-b" style={{ background: '#111620', borderColor: '#1e2533' }}>
        <span className="font-bold text-white text-lg">RRE HR</span>
        <button
          onClick={() => { sessionStorage.removeItem('rre_auth'); setLoggedIn(false); setAccessToken(null) }}
          className="text-sm transition-colors hover:text-white"
          style={{ color: '#8b949e' }}
        >
          Sign out
        </button>
      </nav>
      <div className="flex-1 overflow-hidden">
        <CandidateDatabase accessToken={accessToken} onRequestToken={requestToken} />
      </div>
    </div>
  )
}
