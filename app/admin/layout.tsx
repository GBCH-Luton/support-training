'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useUser } from '@/lib/useUser'

const navItems = [
  { href: '/admin/dashboard', label: '📊 Dashboard' },
  { href: '/admin/courses', label: '📚 Courses' },
  { href: '/admin/builder', label: '✏️ Course builder' },
  { href: '/admin/categories', label: '🏷️ Categories' },
  { href: '/admin/departments', label: '🏢 Departments' },
  { href: '/admin/staff', label: '👥 Staff' },
  { href: '/admin/enrolments', label: '🎯 Enrolments' },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, loading } = useUser()

  useEffect(() => {
    if (!loading && !user) router.push('/login')
    if (!loading && user && user.role !== 'admin') router.push('/')
  }, [user, loading, router])

  if (loading) return <div style={{ padding: '40px', fontFamily: 'sans-serif' }}>Loading...</div>
  if (!user || user.role !== 'admin') return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', fontFamily: 'sans-serif', background: '#F4F3EF' }}>

      {/* Sidebar */}
      <div style={{ width: '220px', background: '#FFFFFF', borderRight: '1px solid rgba(0,0,0,0.08)', flexShrink: 0, display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>

        {/* Logo */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '28px', background: '#2D5BE3', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '11px', fontWeight: 700 }}>ST</div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1A1A18' }}>Admin Panel</div>
              <div style={{ fontSize: '11px', color: '#8A8A82' }}>Support Training</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} style={{
                display: 'block', padding: '9px 12px', borderRadius: '8px', marginBottom: '2px',
                fontSize: '13px', fontWeight: isActive ? 600 : 500,
                color: isActive ? '#2D5BE3' : '#5A5A55',
                background: isActive ? 'rgba(45,91,227,0.08)' : 'transparent',
                textDecoration: 'none', borderLeft: isActive ? '3px solid #2D5BE3' : '3px solid transparent',
              }}>
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Back to portal */}
        <div style={{ padding: '12px 8px', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
          <Link href="/" style={{ display: 'block', padding: '9px 12px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#8A8A82', textDecoration: 'none' }}>
            ← Back to portal
          </Link>
        </div>

        {/* Signed in as */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: '11px', color: '#8A8A82', marginBottom: '2px' }}>Signed in as</div>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A18' }}>{user.name}</div>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, padding: '32px 40px', overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  )
}