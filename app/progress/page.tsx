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
  enrolled: boolean
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
      // Which courses can this person see (their departments)
      const { data: myDepts } = await supabase
        .from('staff_departments').select('department_id').eq('staff_id', user!.id)
      const deptIds = (myDepts || []).map((d) => d.department_id)

      let allowedCourseIds: string[] = []
      if (deptIds.length > 0) {
        const { data: courseLinks } = await supabase
          .from('course_departments').select('course_id').in('department_id', deptIds)
        allowedCourseIds = [...new Set((courseLinks || []).map((c) => c.course_id))]
      }

      // Get those courses (live only)
      const { data: courses } = await supabase
        .from('courses').select('id, title, icon, pass_mark, type').eq('status', 'live').in('id', allowedCourseIds.length ? allowedCourseIds : ['none'])

      // Get this person's exam attempts
      const { data: attempts } = await supabase
        .from('exam_attempts').select('course_id, score, passed, date_taken').eq('staff_id', user!.id)

      // Get this person's enrolments
      const { data: enrolments } = await supabase
        .from('enrolments').select('course_id, mandatory, due_date').eq('staff_id', user!.id)

      const courseRows: CourseProgress[] = (courses || []).map((course) => {
        const courseAttempts = (attempts || []).filter((a: ExamAttempt) => a.course_id === course.id)
        const passedAttempts = courseAttempts.filter((a) => a.passed)
        const bestScore = courseAttempts.length > 0 ? Math.max(...courseAttempts.map((a) => a.score)) : null
        const enrol = (enrolments || []).find((e: Enrolment) => e.course_id === course.id)
        return {
          course,
          bestScore,
          passed: passedAttempts.length > 0,
          attempts: courseAttempts.length,
          mandatory: enrol?.mandatory ?? (course.type === 'mandatory'),
          dueDate: enrol?.due_date ?? null,
          enrolled: !!enrol,
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

  // KPI calculation: average of best passing scores across courses they have passed
  const passedRows = rows.filter((r) => r.passed && r.bestScore !== null)
  const kpi = passedRows.length > 0
    ? Math.round(passedRows.reduce((sum, r) => sum + (r.bestScore || 0), 0) / passedRows.length)
    : null

  const totalCourses = rows.length
  const completedCourses = rows.filter((r) => r.passed).length
  const completionPct = totalCourses > 0 ? Math.round((completedCourses / totalCourses) * 100) : 0

  // KPI rating band
  let kpiBand = { label: 'No data yet', color: '#8A8A82', bg: 'rgba(0,0,0,0.05)' }
  if (kpi !== null) {
    if (kpi >= 90) kpiBand = { label: 'Excellent', color: '#0F6E56', bg: 'rgba(15,110,86,0.1)' }
    else if (kpi >= 80) kpiBand = { label: 'Strong', color: '#2D5BE3', bg: 'rgba(45,91,227,0.1)' }
    else if (kpi >= 70) kpiBand = { label: 'Satisfactory', color: '#854F0B', bg: 'rgba(133,79,11,0.1)' }
    else kpiBand = { label: 'Needs improvement', color: '#993C1D', bg: 'rgba(153,60,29,0.1)' }
  }

  return (
    <div style={{ padding: '40px 5%', fontFamily: 'sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18', width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <Link href="/" style={{ color: '#2D5BE3', textDecoration: 'none', fontSize: '14px' }}>Back to courses</Link>
          <h1 style={{ marginTop: '10px' }}>My progress</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{user.name}</p>
        </div>
      </div>

      {/* Summary tiles */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px', marginBottom: '28px', maxWidth: '700px' }}>
        <div style={tile}>
          <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px' }}>KPI rating</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: kpiBand.color }}>{kpi !== null ? `${kpi}%` : '—'}</div>
          <span style={{ display: 'inline-block', marginTop: '6px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: kpiBand.bg, color: kpiBand.color }}>{kpiBand.label}</span>
        </div>
        <div style={tile}>
          <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px' }}>Completion</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: '#2D5BE3' }}>{completionPct}%</div>
          <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '6px' }}>{completedCourses} of {totalCourses} courses</div>
        </div>
        <div style={tile}>
          <div style={{ fontSize: '12px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '8px' }}>Courses passed</div>
          <div style={{ fontSize: '34px', fontWeight: 700, color: '#0F6E56' }}>{completedCourses}</div>
          <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '6px' }}>{totalCourses - completedCourses} remaining</div>
        </div>
      </div>

      {/* Course breakdown */}
      <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Course breakdown</h2>
      {rows.length === 0 ? (
        <p style={{ color: '#8A8A82' }}>No courses assigned to your department yet.</p>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden', maxWidth: '900px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={th}>Course</th>
                <th style={th}>Type</th>
                <th style={th}>Status</th>
                <th style={th}>Best score</th>
                <th style={th}>Attempts</th>
                <th style={th}>Due date</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const overdue = r.dueDate && !r.passed && new Date(r.dueDate) < new Date()
                return (
                  <tr key={r.course.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>{r.course.icon}</span>
                        <Link href={`/courses/${r.course.id}`} style={{ fontWeight: 600, color: '#1A1A18', textDecoration: 'none' }}>{r.course.title}</Link>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: r.mandatory ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: r.mandatory ? '#993C1D' : '#2D5BE3' }}>
                        {r.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </td>
                    <td style={td}>
                      {r.passed ? (
                        <span style={{ color: '#0F6E56', fontWeight: 600 }}>Passed</span>
                      ) : r.attempts > 0 ? (
                        <span style={{ color: '#854F0B', fontWeight: 600 }}>In progress</span>
                      ) : (
                        <span style={{ color: '#8A8A82' }}>Not started</span>
                      )}
                    </td>
                    <td style={td}>{r.bestScore !== null ? `${r.bestScore}%` : '—'}</td>
                    <td style={td}>{r.attempts}</td>
                    <td style={td}>
                      {r.dueDate ? (
                        <span style={{ color: overdue ? '#993C1D' : '#1A1A18', fontWeight: overdue ? 600 : 400 }}>
                          {overdue ? 'Overdue: ' : ''}{r.dueDate}
                        </span>
                      ) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const tile: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '18px 20px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }