'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function AdminDashboard() {
  const [stats, setStats] = useState({ totalStaff: 0, totalCourses: 0, liveCourses: 0, totalSections: 0, examAttempts: 0, passedExams: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      const [staff, courses, sections, attempts] = await Promise.all([
        supabase.from('staff').select('id', { count: 'exact' }),
        supabase.from('courses').select('id, status'),
        supabase.from('course_sections').select('id', { count: 'exact' }),
        supabase.from('exam_attempts').select('passed'),
      ])
      setStats({
        totalStaff: staff.count || 0,
        totalCourses: courses.data?.length || 0,
        liveCourses: courses.data?.filter(c => c.status === 'live').length || 0,
        totalSections: sections.count || 0,
        examAttempts: attempts.data?.length || 0,
        passedExams: attempts.data?.filter(a => a.passed).length || 0,
      })
      setLoading(false)
    }
    fetchStats()
  }, [])

  const statTiles = [
    { label: 'Total staff', value: stats.totalStaff, icon: '👥', grad: 'linear-gradient(135deg,#5B8DEF,#2D5BE3)' },
    { label: 'Total courses', value: stats.totalCourses, icon: '📚', grad: 'linear-gradient(135deg,#8F86E0,#4A3FB0)' },
    { label: 'Live courses', value: stats.liveCourses, icon: '🟢', grad: 'linear-gradient(135deg,#3FC9A0,#0F6E56)' },
    { label: 'Course sections', value: stats.totalSections, icon: '📄', grad: 'linear-gradient(135deg,#F5B948,#BA7517)' },
    { label: 'Exam attempts', value: stats.examAttempts, icon: '📝', grad: 'linear-gradient(135deg,#FF8A5B,#E5482C)' },
    { label: 'Exams passed', value: stats.passedExams, icon: '🎉', grad: 'linear-gradient(135deg,#3FC9A0,#0F6E56)' },
  ]

  const quickLinks = [
    { href: '/admin/builder', label: 'Build a new course', icon: '✏️' },
    { href: '/admin/courses', label: 'Manage courses', icon: '📚' },
    { href: '/admin/staff', label: 'Manage staff', icon: '👥' },
    { href: '/admin/enrolments', label: 'Assign courses', icon: '🎯' },
  ]

  return (
    <div>
      <style>{`
        .dash-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
        .dash-links { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; }
        @media (max-width:820px) {
          .dash-tiles { grid-template-columns:repeat(2,1fr); }
          .dash-links { grid-template-columns:1fr 1fr; }
        }
        @media (max-width:480px) {
          .dash-tiles { grid-template-columns:1fr; }
          .dash-links { grid-template-columns:1fr; }
        }
      `}</style>

      <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>Dashboard</h1>
      <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '28px' }}>Overview of your training platform</p>

      {loading ? <p>Loading stats...</p> : (
        <div className="dash-tiles">
          {statTiles.map((tile) => (
            <div key={tile.label} style={{ background: tile.grad, borderRadius: '18px', padding: '20px', color: '#fff', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-20px', right: '-20px', width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(255,255,255,0.12)' }} />
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>{tile.icon}</div>
              <div style={{ fontSize: '32px', fontWeight: 700, marginBottom: '2px' }}>{tile.value}</div>
              <div style={{ fontSize: '12px', opacity: 0.9, textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>{tile.label}</div>
            </div>
          ))}
        </div>
      )}

      <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '14px' }}>Quick actions</h2>
      <div className="dash-links">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 18px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', textDecoration: 'none', color: '#1A1A18', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
            <span style={{ fontSize: '22px' }}>{link.icon}</span>
            <span style={{ fontSize: '14px', fontWeight: 600 }}>{link.label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}