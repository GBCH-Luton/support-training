'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin() {
    if (!email.trim()) { setError('Please enter your email address'); return }
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
    else { setSent(true); setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(160deg,#F4F3EF 0%,#E8ECF8 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '20px' }}>
      <div style={{ background: '#FFFFFF', borderRadius: '24px', padding: '36px 32px', width: '100%', maxWidth: '420px', boxShadow: '0 12px 40px rgba(45,91,227,0.12)', border: '1px solid rgba(255,255,255,0.8)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '28px' }}>
          <div style={{ width: '46px', height: '46px', background: 'linear-gradient(135deg,#5B8DEF,#2D5BE3)', borderRadius: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, boxShadow: '0 4px 12px rgba(45,91,227,0.3)' }}>ST</div>
          <div>
            <div style={{ fontSize: '17px', fontWeight: 700, color: '#1A1A18' }}>Support Training</div>
            <div style={{ fontSize: '12px', color: '#8A8A82' }}>Staff learning portal</div>
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg,#3FC9A0,#0F6E56)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '28px' }}>📧</div>
            <h2 style={{ fontSize: '19px', fontWeight: 700, color: '#1A1A18', marginBottom: '8px' }}>Check your email</h2>
            <p style={{ fontSize: '14px', color: '#5A5A55', lineHeight: '1.6', marginBottom: '8px' }}>We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.</p>
            <p style={{ fontSize: '12px', color: '#993C1D', background: 'rgba(153,60,29,0.06)', padding: '10px', borderRadius: '10px', marginBottom: '18px' }}>💡 If you don&apos;t see it, please check your <strong>spam / junk</strong> folder.</p>
            <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: '#2D5BE3', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>← Use a different email</button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>Welcome 👋</h1>
            <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '24px' }}>Enter your work email and we&apos;ll send you a secure sign-in link.</p>

            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '7px' }}>Work email</label>
            <input
              type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              placeholder="you@greenbridgehousing.org"
              style={{ width: '100%', padding: '13px 15px', border: '1.5px solid rgba(0,0,0,0.12)', borderRadius: '12px', background: '#F8F9FC', color: '#1A1A18', fontSize: '15px', outline: 'none', marginBottom: '16px', boxSizing: 'border-box' }}
            />

            {error && (
              <div style={{ padding: '11px 14px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', borderRadius: '10px', fontSize: '13px', marginBottom: '16px' }}>⚠️ {error}</div>
            )}

            <button onClick={handleLogin} disabled={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#8A8A82' : 'linear-gradient(135deg,#5B8DEF,#2D5BE3)', color: '#fff', border: 'none', borderRadius: '12px', fontSize: '15px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', boxShadow: loading ? 'none' : '0 4px 14px rgba(45,91,227,0.3)' }}>
              {loading ? 'Sending...' : 'Send magic link →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}