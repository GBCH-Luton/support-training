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
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F4F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '20px', padding: '40px', width: '400px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
          <div style={{ width: '40px', height: '40px', background: '#2D5BE3', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 700 }}>ST</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: '#1A1A18' }}>Support Training</div>
            <div style={{ fontSize: '12px', color: '#8A8A82' }}>Staff learning portal</div>
          </div>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center', padding: '10px 0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#1A1A18', marginBottom: '8px' }}>Check your email</h2>
            <p style={{ fontSize: '14px', color: '#5A5A55', lineHeight: '1.6', marginBottom: '20px' }}>
              We sent a magic link to <strong>{email}</strong>. Click it to sign in — no password needed.
            </p>
            <p style={{ fontSize: '12px', color: '#8A8A82' }}>Didn&apos;t receive it? Check your spam folder or</p>
            <button onClick={() => setSent(false)} style={{ background: 'none', border: 'none', color: '#2D5BE3', fontSize: '12px', fontWeight: 600, cursor: 'pointer', marginTop: '4px' }}>
              try a different email
            </button>
          </div>
        ) : (
          <>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>Sign in</h1>
            <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '24px' }}>Enter your work email and we&apos;ll send you a sign-in link.</p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '6px' }}>Work email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                placeholder="you@yourcompany.com"
                style={{ width: '100%', padding: '10px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '14px', outline: 'none' }}
              />
            </div>

            {error && (
              <div style={{ padding: '10px 12px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', borderRadius: '8px', fontSize: '13px', marginBottom: '16px' }}>
                ⚠️ {error}
              </div>
            )}

            <button
              onClick={handleLogin}
              disabled={loading}
              style={{ width: '100%', padding: '12px', background: loading ? '#8A8A82' : '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}
            >
              {loading ? 'Sending...' : 'Send magic link →'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}