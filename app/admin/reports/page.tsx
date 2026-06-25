'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

type StaffRow    = { id: string; name: string; email: string; photo_url?: string }
type CourseRow   = { id: string; title: string }
type Enrolment   = { staff_id: string; course_id: string; mandatory: boolean; due_date: string | null }
type ExamAttempt = { staff_id: string; course_id: string; score: number; passed: boolean; date_taken: string }
type SectProg    = { staff_id: string; course_id: string }

type Status = 'passed' | 'failed' | 'in_progress' | 'not_started'
type SortKey = 'name' | 'course' | 'status' | 'score' | 'attempts' | 'last'

type ReportRow = {
  staffId: string; staffName: string; staffEmail: string; staffPhoto?: string
  courseId: string; courseTitle: string
  mandatory: boolean; dueDate: string | null
  status: Status
  bestScore: number | null
  attempts: number
  lastAttempt: string | null
}

const STATUS_META: Record<Status, { label: string; color: string; bg: string; icon: string }> = {
  passed:      { label: 'Passed',      color: '#0F6E56', bg: 'rgba(15,110,86,0.1)',   icon: '✅' },
  failed:      { label: 'Failed',      color: '#993C1D', bg: 'rgba(153,60,29,0.1)',   icon: '❌' },
  in_progress: { label: 'In progress', color: '#BA7517', bg: 'rgba(186,117,23,0.1)', icon: '⏳' },
  not_started: { label: 'Not started', color: '#8A8A82', bg: 'rgba(0,0,0,0.06)',      icon: '—'  },
}

const TILE_COLORS: Record<Status, string> = {
  passed: '#0F6E56', failed: '#D4472A', in_progress: '#BA7517', not_started: '#1E3FB8',
}

export default function AdminReports() {
  const [staff, setStaff]       = useState<StaffRow[]>([])
  const [courses, setCourses]   = useState<CourseRow[]>([])
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [attempts, setAttempts] = useState<ExamAttempt[]>([])
  const [progress, setProgress] = useState<SectProg[]>([])
  const [loading, setLoading]   = useState(true)

  const [selectedId, setSelectedId]   = useState('')
  const [search, setSearch]           = useState('')
  const [filterCourse, setFilterCourse] = useState('')
  const [filterStatus, setFilterStatus] = useState<'' | Status>('')
  const [sortKey, setSortKey]         = useState<SortKey>('name')
  const [sortDir, setSortDir]         = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    async function load() {
      const [staffRes, courseRes, enrolRes, attemptRes, progRes] = await Promise.all([
        supabase.from('staff').select('id, name, email, photo_url').order('name'),
        supabase.from('courses').select('id, title').order('title'),
        supabase.from('enrolments').select('staff_id, course_id, mandatory, due_date'),
        supabase.from('exam_attempts').select('staff_id, course_id, score, passed, date_taken'),
        supabase.from('section_progress').select('staff_id, course_id'),
      ])
      if (staffRes.data)   setStaff(staffRes.data)
      if (courseRes.data)  setCourses(courseRes.data)
      if (enrolRes.data)   setEnrolments(enrolRes.data)
      if (attemptRes.data) setAttempts(attemptRes.data)
      if (progRes.data)    setProgress(progRes.data)
      setLoading(false)
    }
    load()
  }, [])

  const rows = useMemo<ReportRow[]>(() => {
    return enrolments.map(e => {
      const member  = staff.find(s => s.id === e.staff_id)
      const course  = courses.find(c => c.id === e.course_id)
      const myAttempts = attempts.filter(a => a.staff_id === e.staff_id && a.course_id === e.course_id)
      const hasProgress = progress.some(p => p.staff_id === e.staff_id && p.course_id === e.course_id)

      let status: Status
      if (myAttempts.some(a => a.passed))  status = 'passed'
      else if (myAttempts.length > 0)      status = 'failed'
      else if (hasProgress)                status = 'in_progress'
      else                                 status = 'not_started'

      const scores = myAttempts.map(a => a.score)
      const bestScore = scores.length > 0 ? Math.max(...scores) : null
      const sorted = [...myAttempts].sort((a, b) => b.date_taken.localeCompare(a.date_taken))

      return {
        staffId: e.staff_id,   staffName: member?.name || '—',  staffEmail: member?.email || '—',  staffPhoto: member?.photo_url,
        courseId: e.course_id, courseTitle: course?.title || '—',
        mandatory: e.mandatory, dueDate: e.due_date,
        status, bestScore, attempts: myAttempts.length,
        lastAttempt: sorted[0]?.date_taken ?? null,
      }
    })
  }, [enrolments, staff, courses, attempts, progress])

  const counts = useMemo(() => ({
    passed:      rows.filter(r => r.status === 'passed').length,
    failed:      rows.filter(r => r.status === 'failed').length,
    in_progress: rows.filter(r => r.status === 'in_progress').length,
    not_started: rows.filter(r => r.status === 'not_started').length,
  }), [rows])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    let list = rows
    if (q)            list = list.filter(r => r.staffName.toLowerCase().includes(q) || r.staffEmail.toLowerCase().includes(q))
    if (filterCourse) list = list.filter(r => r.courseId === filterCourse)
    if (filterStatus) list = list.filter(r => r.status === filterStatus)
    return [...list].sort((a, b) => {
      let av = '', bv = ''
      if      (sortKey === 'name')     { av = a.staffName;              bv = b.staffName }
      else if (sortKey === 'course')   { av = a.courseTitle;            bv = b.courseTitle }
      else if (sortKey === 'status')   { av = a.status;                 bv = b.status }
      else if (sortKey === 'score')    { av = String(a.bestScore ?? -1); bv = String(b.bestScore ?? -1) }
      else if (sortKey === 'attempts') { av = String(a.attempts);        bv = String(b.attempts) }
      else if (sortKey === 'last')     { av = a.lastAttempt ?? '';       bv = b.lastAttempt ?? '' }
      return sortDir === 'asc' ? av.localeCompare(bv, undefined, { numeric: true }) : bv.localeCompare(av, undefined, { numeric: true })
    })
  }, [rows, search, filterCourse, filterStatus, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }
  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'

  return (
    <div>
      <style>{`
        .report-tiles { display:grid; grid-template-columns:repeat(4,1fr); gap:12px; margin-bottom:24px; }
        @media (max-width:820px) { .report-tiles { grid-template-columns:repeat(2,1fr); } }
      `}</style>

      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Reports</h1>
        <p style={{ fontSize: '14px', color: '#8A8A82' }}>{rows.length} total enrolments across {courses.length} courses</p>
      </div>

      {/* Summary tiles — clickable to filter */}
      {!loading && (
        <div className="report-tiles">
          {(['passed', 'failed', 'in_progress', 'not_started'] as Status[]).map(key => {
            const active = filterStatus === key
            const color  = TILE_COLORS[key]
            const count  = counts[key]
            return (
              <button key={key} type="button" onClick={() => setFilterStatus(f => f === key ? '' : key)}
                style={{ background: active ? color : '#FFFFFF', borderRadius: '0', padding: '20px 16px', textAlign: 'center', border: active ? `2px solid ${color}` : '1px solid rgba(0,0,0,0.08)', cursor: 'pointer' }}>
                <div style={{ fontSize: '40px', fontWeight: 700, lineHeight: 1, marginBottom: '6px', color: active ? '#fff' : color }}>{count}</div>
                <div style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: active ? 'rgba(255,255,255,0.85)' : '#8A8A82' }}>{STATUS_META[key].label}</div>
              </button>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ position: 'relative', flex: '0 0 260px' }}>
          <input style={{ ...input, paddingLeft: '34px' }} placeholder="Search staff name or email…" value={search} onChange={e => setSearch(e.target.value)} />
          <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
        </div>
        <select value={filterCourse} onChange={e => setFilterCourse(e.target.value)} style={{ ...input, width: 'auto', minWidth: '200px' }}>
          <option value="">All courses</option>
          {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
        </select>
        {(search || filterCourse || filterStatus) && (
          <button type="button" onClick={() => { setSearch(''); setFilterCourse(''); setFilterStatus('') }}
            style={{ fontSize: '12px', color: '#993C1D', background: 'rgba(153,60,29,0.07)', border: '1px solid rgba(153,60,29,0.2)', borderRadius: '8px', padding: '7px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            ✕ Clear filters
          </button>
        )}
        <span style={{ marginLeft: 'auto', fontSize: '13px', color: '#8A8A82' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Table */}
      {loading ? <p>Loading…</p> : filtered.length === 0 ? (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>No results match your filters.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {([
                  ['name',     'Staff'],
                  ['course',   'Course'],
                  ['status',   'Status'],
                  ['score',    'Best score'],
                  ['attempts', 'Attempts'],
                  ['last',     'Last attempt'],
                ] as [SortKey, string][]).map(([key, lbl]) => (
                  <th key={key} onClick={() => toggleSort(key)} style={{ ...th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {lbl}{sortIcon(key)}
                  </th>
                ))}
                <th style={th}>Due date</th>
                <th style={th}>Type</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const st = STATUS_META[row.status]
                const overdue = row.dueDate && new Date(row.dueDate) < new Date() && row.status !== 'passed'
                const scoreColor = row.bestScore === null ? '#8A8A82'
                  : row.bestScore >= 80 ? '#0F6E56'
                  : row.bestScore >= 60 ? '#BA7517'
                  : '#993C1D'
                const rowKey = `${row.staffId}-${row.courseId}`
                const isSelected = selectedId === rowKey
                return (
                  <tr key={rowKey} onClick={() => setSelectedId(p => p === rowKey ? '' : rowKey)}
                    style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', cursor: 'pointer', background: isSelected ? 'rgba(45,91,227,0.06)' : undefined, outline: isSelected ? '2px solid rgba(45,91,227,0.3)' : undefined, outlineOffset: '-2px' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {row.staffPhoto
                          ? <img src={row.staffPhoto} alt={row.staffName} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                          : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1E3FB8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{row.staffName.charAt(0).toUpperCase()}</div>
                        }
                        <div>
                          <div style={{ fontWeight: 600 }}>{row.staffName}</div>
                          <div style={{ fontSize: '11px', color: '#8A8A82' }}>{row.staffEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>{row.courseTitle}</td>
                    <td style={td}>
                      <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: st.bg, color: st.color, whiteSpace: 'nowrap' }}>
                        {st.icon} {st.label}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: scoreColor }}>
                      {row.bestScore !== null ? `${row.bestScore}%` : '—'}
                    </td>
                    <td style={{ ...td, textAlign: 'center', color: row.attempts > 0 ? '#1A1A18' : '#8A8A82' }}>
                      {row.attempts > 0 ? row.attempts : '—'}
                    </td>
                    <td style={{ ...td, color: '#5A5A55' }}>
                      {row.lastAttempt ? new Date(row.lastAttempt).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ ...td, color: overdue ? '#993C1D' : '#5A5A55', fontWeight: overdue ? 600 : 400 }}>
                      {row.dueDate ? `${overdue ? '⚠️ ' : ''}${new Date(row.dueDate).toLocaleDateString('en-GB')}` : '—'}
                    </td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: row.mandatory ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: row.mandatory ? '#993C1D' : '#2D5BE3' }}>
                        {row.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
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

const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }
const th: React.CSSProperties    = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties    = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }
