'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isForced, setIsForced] = useState(false)

  useEffect(() => {
    setIsForced(new URLSearchParams(window.location.search).get('force') === '1')
    // PKCE flow: Supabase delivers a ?code= param — exchange it for a session
    const code = new URLSearchParams(window.location.search).get('code')
    if (code) {
      supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
        if (error) setError('This reset link has expired or is invalid. Please request a new one from the login page.')
      })
    }
  }, [])

  async function handleReset() {
    if (!password.trim()) { setError('Please enter a new password'); return }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return }
    if (password !== confirm) { setError('Passwords do not match'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setLoading(false)
      const msg = error.message
      setError(msg && msg !== '{}' && msg !== '[]' ? msg : 'Unable to update password. Your reset link may have expired — please request a new one from the login page.')
      return
    }
    // Clear the force-reset flag
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (authUser?.email) {
      await supabase.from('staff').update({ must_reset_password: false }).eq('email', authUser.email)
    }
    setLoading(false)
    setSuccess(true)
    setTimeout(() => router.push('/'), 2500)
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

        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>Set new password</h1>
        <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: isForced ? '14px' : '24px' }}>Choose a new password for your account.</p>

        {isForced && (
          <div style={{ padding: '12px 14px', background: 'rgba(186,117,23,0.09)', color: '#854F0B', borderRadius: '10px', fontSize: '13px', marginBottom: '20px', border: '1px solid rgba(186,117,23,0.28)', lineHeight: 1.5 }}>
            🔒 Your password was reset by an administrator. Please set a new password to continue — you cannot access the system until you do.
          </div>
        )}

        {success ? (
          <div style={{ padding: '14px', background: 'rgba(45,122,58,0.08)', color: '#2D7A3A', borderRadius: '12px', fontSize: '14px', textAlign: 'center' }}>
            ✓ Password updated! Redirecting you to sign in…
          </div>
        ) : (
          <>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '7px' }}>New password</label>
            <input
              type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              style={inputStyle}
            />

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '7px', marginTop: '16px' }}>Confirm password</label>
            <input
              type="password" value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleReset()}
              placeholder="Repeat your new password"
              style={inputStyle}
            />

            {error && (
              <div style={{ padding: '11px 14px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', borderRadius: '10px', fontSize: '13px', marginTop: '16px' }}>⚠️ {error}</div>
            )}

            <button onClick={handleReset} disabled={loading}
              style={{ width: '100%', padding: '14px', marginTop: '20px', background: loading ? '#8A8A82' : 'linear-gradient(135deg,#5BA86A,#2D7A3A)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(45,122,58,0.3)' }}>
              {loading ? 'Updating...' : 'Update password →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = { width: '100%', padding: '13px 15px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '12px', background: '#F8F9FC', color: '#1A1A18', fontSize: '15px', outline: 'none', boxSizing: 'border-box' }
