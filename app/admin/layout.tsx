'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useUser } from '@/lib/useUser'

const navItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/admin/courses', label: 'Courses', icon: '📚' },
  { href: '/admin/builder', label: 'Course builder', icon: '✏️' },
  { href: '/admin/categories', label: 'Categories', icon: '🏷️' },
  { href: '/admin/departments', label: 'Departments', icon: '🏢' },
  { href: '/admin/staff', label: 'Staff', icon: '👥' },
  { href: '/admin/enrolments', label: 'Enrolments', icon: '🎯' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useUser()
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.must_reset_password) router.push('/reset-password')
    if (!loading && user && user.role !== 'admin' && user.role !== 'training_admin') router.push('/')
  }, [user, loading, router])

  useEffect(() => { setMenuOpen(false) }, [pathname])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'system-ui, sans-serif' }}>Loading...</div>
  if (!user || (user.role !== 'admin' && user.role !== 'training_admin')) return null

  const navLinks = (
    <>
      {navItems.map((item) => {
        const isActive = pathname === item.href
        return (
          <Link key={item.href} href={item.href} style={{
            display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', marginBottom: '3px',
            fontSize: '14px', fontWeight: isActive ? 600 : 500,
            color: isActive ? '#2D5BE3' : '#5A5A55',
            background: isActive ? 'rgba(45,91,227,0.08)' : 'transparent',
            textDecoration: 'none',
          }}>
            <span style={{ fontSize: '16px' }}>{item.icon}</span> {item.label}
          </Link>
        )
      })}
    </>
  )

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18' }}>
      <style>{`
        .admin-shell { display:flex; min-height:100vh; }
        .admin-sidebar { width:230px; background:#FFFFFF; border-right:1px solid rgba(0,0,0,0.08); flex-shrink:0; display:flex; flex-direction:column; position:sticky; top:0; height:100vh; overflow-y:auto; }
        .admin-main { flex:1; padding:32px 40px; overflow-y:auto; min-width:0; }
        .admin-topbar { display:none; }
        @media (max-width:820px) {
          .admin-shell { flex-direction:column; }
          .admin-sidebar { display:none; }
          .admin-topbar { display:flex; align-items:center; justify-content:space-between; background:#FFFFFF; padding:14px 18px; border-bottom:1px solid rgba(0,0,0,0.08); position:sticky; top:0; z-index:50; }
          .admin-mobile-menu { display:${menuOpen ? 'block' : 'none'}; background:#FFFFFF; padding:12px 14px; border-bottom:1px solid rgba(0,0,0,0.08); }
          .admin-main { padding:20px 18px; }
        }
        @media (min-width:821px) { .admin-topbar, .admin-mobile-menu { display:none !important; } }
      `}</style>

      <div className="admin-shell">
        {/* Desktop sidebar */}
        <div className="admin-sidebar">
          <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', background: 'linear-gradient(135deg,#F5B948,#BA7517)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700 }}>⚙️</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 700 }}>Admin Panel</div>
                <div style={{ fontSize: '11px', color: '#8A8A82' }}>Support Training</div>
              </div>
            </div>
          </div>
          <nav style={{ padding: '12px 10px', flex: 1 }}>{navLinks}</nav>
          <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, color: '#8A8A82', textDecoration: 'none' }}>← Back to portal</Link>
          </div>
          <div style={{ padding: '14px 16px', borderTop: '1px solid rgba(0,0,0,0.08)' }}>
            <div style={{ fontSize: '11px', color: '#8A8A82', marginBottom: '3px' }}>Signed in as</div>
            <div style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</div>
          </div>
        </div>

        {/* Mobile top bar */}
        <div className="admin-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '30px', height: '30px', background: 'linear-gradient(135deg,#F5B948,#BA7517)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700 }}>⚙️</div>
            <span style={{ fontSize: '15px', fontWeight: 700 }}>Admin Panel</span>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: '#F4F3EF', border: '1px solid rgba(0,0,0,0.1)', borderRadius: '8px', padding: '8px 12px', fontSize: '18px', cursor: 'pointer' }}>☰</button>
        </div>

        {/* Mobile dropdown menu */}
        <div className="admin-mobile-menu">
          {navLinks}
          <div style={{ borderTop: '1px solid rgba(0,0,0,0.08)', marginTop: '8px', paddingTop: '8px' }}>
            <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '11px 14px', borderRadius: '10px', fontSize: '14px', fontWeight: 500, color: '#8A8A82', textDecoration: 'none' }}>← Back to portal</Link>
            <div style={{ padding: '10px 14px', fontSize: '12px', color: '#8A8A82' }}>Signed in as <strong style={{ color: '#1A1A18' }}>{user.name}</strong></div>
          </div>
        </div>

        {/* Main content */}
        <div className="admin-main">{children}</div>
      </div>
    </div>
  )
}