'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'
import Link from 'next/link'

type Course = { id: string; title: string; icon: string; pass_mark: number; type: string }
type ExamAttempt = { course_id: string; score: number; passed: boolean; date_taken: string }
type Enrolment = { course_id: string; mandatory: boolean; due_date: string | null }

type CourseProgress = {
  course: Course
  bestScore: number | null
  passed: boolean
  attempts: number
  mandatory: boolean
  dueDate: string | null
}

export default function ProgressPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [rows, setRows] = useState<CourseProgress[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  useEffect(() => {
    if (!user) return
    async function fetchProgress() {
      const { data: myDepts } = await supabase
        .from('staff_departments').select('department_id').eq('staff_id', user!.id)
      const deptIds = (myDepts || []).map((d) => d.department_id)
      let allowedCourseIds: string[] = []
      if (deptIds.length > 0) {
        const { data: courseLinks } = await supabase
          .from('course_departments').select('course_id').in('department_id', deptIds)
        allowedCourseIds = [...new Set((courseLinks || []).map((c) => c.course_id))]
      }
      const { data: courses } = await supabase
        .from('courses').select('id, title, icon, pass_mark, type').eq('status', 'live').in('id', allowedCourseIds.length ? allowedCourseIds : ['none'])
      const { data: attempts } = await supabase
        .from('exam_attempts').select('course_id, score, passed, date_taken').eq('staff_id', user!.id)
      const { data: enrolments } = await supabase
        .from('enrolments').select('course_id, mandatory, due_date').eq('staff_id', user!.id)

      const courseRows: CourseProgress[] = (courses || []).map((course) => {
        const courseAttempts = (attempts || []).filter((a: ExamAttempt) => a.course_id === course.id)
        const passedAttempts = courseAttempts.filter((a) => a.passed)
        const bestScore = courseAttempts.length > 0 ? Math.max(...courseAttempts.map((a) => a.score)) : null
        const enrol = (enrolments || []).find((e: Enrolment) => e.course_id === course.id)
        return {
          course, bestScore, passed: passedAttempts.length > 0, attempts: courseAttempts.length,
          mandatory: enrol?.mandatory ?? (course.type === 'mandatory'),
          dueDate: enrol?.due_date ?? null,
        }
      })
      setRows(courseRows)
      setLoading(false)
    }
    fetchProgress()
  }, [user])

  if (userLoading || loading) return (
    <div style={{ minHeight: '100vh', background: '#F4F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#8A8A82' }}>Loading...</p>
    </div>
  )
  if (!user) return null

  const passedRows = rows.filter((r) => r.passed && r.bestScore !== null)
  const kpi = passedRows.length > 0
    ? Math.round(passedRows.reduce((sum, r) => sum + (r.bestScore || 0), 0) / passedRows.length)
    : null
  const totalCourses = rows.length
  const completedCourses = rows.filter((r) => r.passed).length
  const completionPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0

  let kpiBand = { label: 'No data yet', color: '#8A8A82' }
  if (kpi !== null) {
    if (kpi >= 90) kpiBand = { label: 'Excellent', color: '#0F6E56' }
    else if (kpi >= 80) kpiBand = { label: 'Strong', color: '#2D5BE3' }
    else if (kpi >= 70) kpiBand = { label: 'Satisfactory', color: '#854F0B' }
    else kpiBand = { label: 'Needs improvement', color: '#993C1D' }
  }

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18' }}>
      <style>{`
        .pg-wrap { padding:24px 5%; max-width:1100px; margin:0 auto; }
        .pg-tiles { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-bottom:28px; }
        .pg-card { display:none; }
        .pg-table { display:table; }
        @media (max-width:680px) {
          .pg-tiles { grid-template-columns:1fr; }
          .pg-table-wrap { display:none; }
          .pg-card { display:flex; }
        }
      `}</style>

      <div className="pg-wrap">
        <Link href="/" style={{ color: '#2D5BE3', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← Back to courses</Link>
        <h1 style={{ marginTop: '12px', marginBottom: '4px', fontSize: '24px' }}>My Progress</h1>
        <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '24px' }}>{user.name}</p>

        {/* Summary tiles */}
        <div className="pg-tiles">
          <div style={{ background: 'linear-gradient(135deg,#5B8DEF,#2D5BE3)', borderRadius: '18px', padding: '22px', color: '#fff', boxShadow: '0 4px 18px rgba(45,91,227,0.2)' }}>
            <div style={{ fontSize: '12px', opacity: 0.85, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '10px' }}>KPI Rating</div>
            <div style={{ fontSize: '38px', fontWeight: 700, lineHeight: 1 }}>{kpi !== null ? `${kpi}%` : '—'}</div>
            <div style={{ marginTop: '8px', display: 'inline-block', padding: '3px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(255,255,255,0.22)' }}>{kpiBand.label}</div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '22px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 3px 14px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '10px' }}>Completion</div>
            <div style={{ fontSize: '38px', fontWeight: 700, color: '#534AB7', lineHeight: 1 }}>{completionPct}%</div>
            <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '8px' }}>{completedCourses} of {totalCourses} courses</div>
          </div>
          <div style={{ background: '#FFFFFF', borderRadius: '18px', padding: '22px', border: '1px solid rgba(0,0,0,0.06)', boxShadow: '0 3px 14px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '10px' }}>Passed</div>
            <div style={{ fontSize: '38px', fontWeight: 700, color: '#0F6E56', lineHeight: 1 }}>{completedCourses}</div>
            <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '8px' }}>{totalCourses - completedCourses} remaining</div>
          </div>
        </div>

        <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Course breakdown</h2>
        {rows.length === 0 ? (
          <p style={{ color: '#8A8A82' }}>No courses assigned to your department yet.</p>
        ) : (
          <>
            {/* Desktop table */}
            <div className="pg-table-wrap" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                    <th style={th}>Course</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Best score</th><th style={th}>Attempts</th><th style={th}>Due date</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const overdue = r.dueDate && !r.passed && new Date(r.dueDate) < new Date()
                    return (
                      <tr key={r.course.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                        <td style={td}><div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '18px' }}>{r.course.icon}</span><Link href={`/courses/${r.course.id}`} style={{ fontWeight: 600, color: '#1A1A18', textDecoration: 'none' }}>{r.course.title}</Link></div></td>
                        <td style={td}><span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: r.mandatory ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: r.mandatory ? '#993C1D' : '#2D5BE3' }}>{r.mandatory ? 'Mandatory' : 'Optional'}</span></td>
                        <td style={td}><StatusPill r={r} /></td>
                        <td style={td}>{r.bestScore !== null ? `${r.bestScore}%` : '—'}</td>
                        <td style={td}>{r.attempts}</td>
                        <td style={td}>{r.dueDate ? (<span style={{ color: overdue ? '#993C1D' : '#1A1A18', fontWeight: overdue ? 600 : 400 }}>{overdue ? '⚠️ ' : ''}{r.dueDate}</span>) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {rows.map((r) => {
                const overdue = r.dueDate && !r.passed && new Date(r.dueDate) < new Date()
                return (
                  <Link key={r.course.id} href={`/courses/${r.course.id}`} className="pg-card" style={{ background: '#FFFFFF', borderRadius: '14px', padding: '16px', border: '1px solid rgba(0,0,0,0.07)', boxShadow: '0 2px 10px rgba(0,0,0,0.04)', textDecoration: 'none', color: 'inherit', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '24px' }}>{r.course.icon}</span>
                      <div style={{ flex: 1, fontWeight: 700, fontSize: '15px' }}>{r.course.title}</div>
                      <StatusPill r={r} />
                    </div>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#5A5A55', flexWrap: 'wrap' }}>
                      <span>{r.mandatory ? '🔴 Mandatory' : '🔵 Optional'}</span>
                      <span>Best: {r.bestScore !== null ? `${r.bestScore}%` : '—'}</span>
                      <span>Attempts: {r.attempts}</span>
                      {r.dueDate && <span style={{ color: overdue ? '#993C1D' : '#5A5A55', fontWeight: overdue ? 600 : 400 }}>{overdue ? '⚠️ Overdue ' : 'Due '}{r.dueDate}</span>}
                    </div>
                  </Link>
                )
              })}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function StatusPill({ r }: { r: CourseProgress }) {
  if (r.passed) return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(15,110,86,0.1)', color: '#0F6E56' }}>✓ Passed</span>
  if (r.attempts > 0) return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(133,79,11,0.1)', color: '#854F0B' }}>In progress</span>
  return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#8A8A82' }}>Not started</span>
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle', color: '#1A1A18' }