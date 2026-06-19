'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalStaff: 0,
    totalCourses: 0,
    liveCourses: 0,
    totalSections: 0,
    examAttempts: 0,
    passedExams: 0,
  })
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
    { label: 'Total staff', value: stats.totalStaff, icon: '👥', color: '#2D5BE3' },
    { label: 'Total courses', value: stats.totalCourses, icon: '📚', color: '#534AB7' },
    { label: 'Live courses', value: stats.liveCourses, icon: '🟢', color: '#0F6E56' },
    { label: 'Course sections', value: stats.totalSections, icon: '📄', color: '#854F0B' },
    { label: 'Exam attempts', value: stats.examAttempts, icon: '📝', color: '#993C1D' },
    { label: 'Exams passed', value: stats.passedExams, icon: '🎉', color: '#0F6E56' },
  ]

  return (
    <div>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>Dashboard</h1>
      <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '28px' }}>Overview of your training platform</p>

      {loading ? <p>Loading stats...</p> : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '32px' }}>
          {statTiles.map((tile) => (
            <div key={tile.label} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
              <div style={{ fontSize: '24px', marginBottom: '8px' }}>{tile.icon}</div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: tile.color, marginBottom: '4px' }}>{tile.value}</div>
              <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{tile.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '18px 20px' }}>
        <div style={{ fontSize: '14px', fontWeight: 700, color: '#1A1A18', marginBottom: '12px' }}>Quick links</div>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {[
            { href: '/admin/builder', label: '✏️ Build a new course' },
            { href: '/admin/courses', label: '📚 Manage courses' },
            { href: '/admin/staff', label: '👥 Manage staff' },
            { href: '/admin/enrolments', label: '🎯 Assign courses' },
          ].map((link) => (
            <a key={link.href} href={link.href} style={{ padding: '8px 16px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>{link.label}</a>
          ))}
        </div>
      </div>
    </div>
  )
}