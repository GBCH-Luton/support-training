'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

export default function Header() {
  const { user } = useUser()
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [logoFailed, setLogoFailed] = useState(false)

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isAdmin = user?.role === 'admin' || user?.role === 'training_admin'

  return (
    <>
      <style>{`
        .gh-nav { display:flex; align-items:center; gap:6px; }
        .gh-burger { display:none !important; }
        @media (max-width:640px) {
          .gh-nav { display:none !important; }
          .gh-burger { display:flex !important; }
        }
      `}</style>

      <header style={{
        position: 'sticky', top: 0, zIndex: 200,
        background: 'rgba(255,255,255,0.97)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid rgba(0,0,0,0.08)',
        boxShadow: '0 1px 16px rgba(0,0,0,0.06)',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '0 5%', height: '64px', display: 'flex', alignItems: 'center', gap: '16px' }}>

          {/* Logo */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none', flexShrink: 0 }}>
            {logoFailed ? (
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#6FA0F5,#2D5BE3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>ST</div>
            ) : (
              <img
                src="/logo.png.svg"
                alt="GBCH"
                onError={() => setLogoFailed(true)}
                style={{ height: '40px', width: 'auto', objectFit: 'contain', display: 'block' }}
              />
            )}
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A18', letterSpacing: '-0.01em' }}>Support Training</span>
          </Link>

          <div style={{ flex: 1 }} />

          {/* Desktop nav */}
          <nav className="gh-nav">
            {isAdmin && (
              <Link href="/admin/dashboard" style={{ padding: '7px 13px', background: 'rgba(133,79,11,0.09)', color: '#854F0B', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
                ⚙️ Admin
              </Link>
            )}
            <Link href="/progress" style={{ padding: '7px 13px', background: 'rgba(45,91,227,0.09)', color: '#2D5BE3', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', whiteSpace: 'nowrap' }}>
              📊 My progress
            </Link>
            {user && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '5px 12px 5px 6px', background: '#F4F3EF', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.07)', flexShrink: 0 }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#8F86E0,#4A3FB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700, flexShrink: 0 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A18', whiteSpace: 'nowrap' }}>{user.name.split(' ')[0]}</span>
              </div>
            )}
            <button onClick={signOut} style={{ padding: '7px 13px', background: 'transparent', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', fontSize: '13px', color: '#5A5A55', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              Sign out
            </button>
          </nav>

          {/* Mobile hamburger */}
          <button
            className="gh-burger"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: '8px 11px', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', fontSize: '17px', cursor: 'pointer', alignItems: 'center', justifyContent: 'center' }}
          >
            {menuOpen ? '✕' : '☰'}
          </button>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.07)', background: '#fff', padding: '12px 5%', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {isAdmin && (
              <Link href="/admin/dashboard" onClick={() => setMenuOpen(false)} style={{ padding: '11px 14px', background: 'rgba(133,79,11,0.09)', color: '#854F0B', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
                ⚙️ Admin panel
              </Link>
            )}
            <Link href="/progress" onClick={() => setMenuOpen(false)} style={{ padding: '11px 14px', background: 'rgba(45,91,227,0.09)', color: '#2D5BE3', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }}>
              📊 My progress
            </Link>
            {user && (
              <div style={{ padding: '11px 14px', background: '#F4F3EF', borderRadius: '8px', fontSize: '14px', fontWeight: 600, color: '#1A1A18', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#8F86E0,#4A3FB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                {user.name}
              </div>
            )}
            <button onClick={signOut} style={{ padding: '11px 14px', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '8px', fontSize: '14px', color: '#5A5A55', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
              Sign out
            </button>
          </div>
        )}
      </header>
    </>
  )
}
