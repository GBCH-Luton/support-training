'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [success, setSuccess] = useState('')

  async function handleForgotPassword() {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setLoading(true)
    setError('')
    setSuccess('')

    // Only allow resets for registered staff members
    const { data: staffRecord } = await supabase
      .from('staff')
      .select('id')
      .ilike('email', email.trim())
      .single()

    if (!staffRecord) {
      setLoading(false)
      setError('No account found with that email address. Please use your work email.')
      return
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    })
    setLoading(false)
    if (error) {
      const msg = error.message
      setError(msg && msg !== '{}' && msg !== '[]'
        ? msg
        : 'Failed to send reset email. Please try again in a few minutes.')
    } else {
      setSuccess('Check your inbox — we sent a password reset link.')
    }
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) { setError('Please enter your email and password'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#F4F3EF 0%,#E8F2EA 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', width: '100%', maxWidth: '420px', boxShadow: '0 12px 40px rgba(45,122,58,0.12)', border: '1px solid rgba(255,255,255,0.8)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg,#5BA86A,#2D7A3A)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 12px rgba(45,122,58,0.3)' }}>ST</div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#1A1A18' }}>Support Training</div>
            <div style={{ fontSize: '12px', color: '#8A8A82' }}>Staff learning portal</div>
          </div>
        </div>

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>
          {mode === 'login' ? 'Welcome 👋' : 'Reset password'}
        </h1>
        <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '24px' }}>
          {mode === 'login' ? 'Sign in with your work email and password.' : "Enter your work email and we'll send you a reset link."}
        </p>

        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '7px' }}>Work email</label>
        <input
          type="email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@greenbridgehousing.org"
          style={inputStyle}
        />

        {mode === 'login' && (
          <>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '7px', marginTop: '16px' }}>Password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="Enter your password"
              style={inputStyle}
            />
          </>
        )}

        {error && (
          <div style={{ padding: '11px 14px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', borderRadius: '10px', fontSize: '13px', marginTop: '16px' }}>⚠️ {error}</div>
        )}
        {success && (
          <div style={{ padding: '11px 14px', background: 'rgba(45,122,58,0.08)', color: '#2D7A3A', borderRadius: '10px', fontSize: '13px', marginTop: '16px' }}>✓ {success}</div>
        )}

        {mode === 'login' ? (
          <button onClick={handleLogin} disabled={loading}
            style={{ width: '100%', padding: '14px', marginTop: '20px', background: loading ? '#8A8A82' : 'linear-gradient(135deg,#5BA86A,#2D7A3A)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(45,122,58,0.3)' }}>
            {loading ? 'Signing in...' : 'Sign in →'}
          </button>
        ) : (
          <button onClick={handleForgotPassword} disabled={loading || !!success}
            style={{ width: '100%', padding: '14px', marginTop: '20px', background: (loading || success) ? '#8A8A82' : 'linear-gradient(135deg,#5BA86A,#2D7A3A)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: (loading || success) ? 'not-allowed' : 'pointer', boxShadow: (loading || success) ? 'none' : '0 4px 14px rgba(45,122,58,0.3)' }}>
            {loading ? 'Sending...' : 'Send reset link →'}
          </button>
        )}

        <p style={{ fontSize: '12px', color: '#8A8A82', marginTop: '18px', textAlign: 'center' }}>
          {mode === 'login' ? (
            <>Forgot your password?{' '}
              <span onClick={() => { setMode('forgot'); setError(''); setSuccess('') }} style={{ color: '#2D7A3A', cursor: 'pointer', fontWeight: 600 }}>Reset it</span>
            </>
          ) : (
            <span onClick={() => { setMode('login'); setError(''); setSuccess('') }} style={{ color: '#2D7A3A', cursor: 'pointer', fontWeight: 600 }}>← Back to sign in</span>
          )}
        </p>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 15px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '12px', background: '#F8F9FC', color: '#1A1A18', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }