'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Staff = { id: string; name: string; role: string; photo_url?: string }
type Course = { id: string; title: string; icon: string; type: string }
type Department = { id: string; name: string }
type Enrolment = { id: string; staff_id: string; course_id: string; mandatory: boolean; due_date: string | null; enrolled_on: string }
type DeptEnrolment = { id: string; department_id: string; course_id: string; mandatory: boolean; due_date: string | null; enrolled_on: string }
type SortKey = 'name' | 'course' | 'type' | 'due' | 'enrolled'

export default function AdminEnrolments() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [deptEnrolments, setDeptEnrolments] = useState<DeptEnrolment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Form
  const [bulkCourse, setBulkCourse] = useState('')
  const [bulkStaff, setBulkStaff] = useState<string[]>([])
  const [bulkDue, setBulkDue] = useState('')
  const [bulkMandatory, setBulkMandatory] = useState(true)
  const [showBulk, setShowBulk] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')
  const [assignMode, setAssignMode] = useState<'individual' | 'department'>('individual')
  const [bulkDepartment, setBulkDepartment] = useState('')

  // Table controls
  const [search, setSearch] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('enrolled')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [staffRes, courseRes, enrolRes, deptRes, deptEnrolRes] = await Promise.all([
      supabase.from('staff').select('id, name, role, photo_url').eq('active', true).order('name'),
      supabase.from('courses').select('id, title, icon, type').eq('status', 'live').order('title'),
      supabase.from('enrolments').select('*').order('enrolled_on', { ascending: false }),
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('department_enrolments').select('*').order('enrolled_on', { ascending: false }),
    ])
    if (staffRes.data) setStaff(staffRes.data)
    if (courseRes.data) setCourses(courseRes.data)
    if (enrolRes.data) setEnrolments(enrolRes.data)
    if (deptRes.data) setDepartments(deptRes.data)
    if (deptEnrolRes.data) setDeptEnrolments(deptEnrolRes.data)
    setLoading(false)
  }

  async function removeEnrolment(id: string, kind: 'individual' | 'department') {
    if (!confirm('Remove this enrolment?')) return
    const table = kind === 'individual' ? 'enrolments' : 'department_enrolments'
    await supabase.from(table).delete().eq('id', id)
    if (kind === 'individual') setEnrolments((p) => p.filter((e) => e.id !== id))
    else setDeptEnrolments((p) => p.filter((e) => e.id !== id))
  }

  async function bulkAssign() {
    if (!bulkCourse) { alert('Select a course'); return }
    setSaving(true)

    if (assignMode === 'individual') {
      if (bulkStaff.length === 0) { alert('Select at least one staff member'); setSaving(false); return }
      const toInsert = bulkStaff
        .filter((sid) => !enrolments.some((e) => e.staff_id === sid && e.course_id === bulkCourse))
        .map((sid) => ({ staff_id: sid, course_id: bulkCourse, mandatory: bulkMandatory, due_date: bulkDue || null }))
      if (toInsert.length > 0) await supabase.from('enrolments').insert(toInsert)
    } else {
      if (!bulkDepartment) { alert('Select a department'); setSaving(false); return }
      const alreadyAssigned = deptEnrolments.some(
        (e) => e.department_id === bulkDepartment && e.course_id === bulkCourse
      )
      if (!alreadyAssigned) {
        await supabase.from('department_enrolments').insert({
          department_id: bulkDepartment, course_id: bulkCourse,
          mandatory: bulkMandatory, due_date: bulkDue || null,
        })
      }
    }

    setBulkCourse(''); setBulkStaff([]); setBulkDue(''); setBulkDepartment(''); setShowBulk(false)
    await fetchAll()
    setSaving(false)
  }

  function handleStaffSearch(value: string) {
    setStaffSearch(value)
    const found = staff.find((s) => s.name === value)
    if (found && !bulkStaff.includes(found.id)) {
      setBulkStaff((prev) => [...prev, found.id])
      setStaffSearch('')
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const getDept = (id: string) => departments.find((d) => d.id === id)
  const getCourse = (id: string) => courses.find((c) => c.id === id)
  const getStaff = (id: string) => staff.find((s) => s.id === id)

  // Build unified rows
  const rows = useMemo(() => {
    type Row = {
      id: string; kind: 'individual' | 'department'
      name: string; course: string; courseIcon: string
      mandatory: boolean; due: string | null; enrolled: string
      photoUrl?: string
    }
    const individual: Row[] = enrolments.map((e) => ({
      id: e.id, kind: 'individual',
      name: getStaff(e.staff_id)?.name || '—',
      photoUrl: getStaff(e.staff_id)?.photo_url,
      course: getCourse(e.course_id)?.title || '—',
      courseIcon: getCourse(e.course_id)?.icon || '',
      mandatory: e.mandatory, due: e.due_date, enrolled: e.enrolled_on,
    }))
    const dept: Row[] = deptEnrolments.map((e) => ({
      id: e.id, kind: 'department',
      name: getDept(e.department_id)?.name || '—',
      course: getCourse(e.course_id)?.title || '—',
      courseIcon: getCourse(e.course_id)?.icon || '',
      mandatory: e.mandatory, due: e.due_date, enrolled: e.enrolled_on,
    }))
    return [...individual, ...dept]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enrolments, deptEnrolments, staff, courses, departments])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const searched = q ? rows.filter((r) => r.name.toLowerCase().includes(q) || r.course.toLowerCase().includes(q)) : rows
    return [...searched].sort((a, b) => {
      let av = '', bv = ''
      if (sortKey === 'name') { av = a.name; bv = b.name }
      else if (sortKey === 'course') { av = a.course; bv = b.course }
      else if (sortKey === 'type') { av = a.mandatory ? 'mandatory' : 'optional'; bv = b.mandatory ? 'mandatory' : 'optional' }
      else if (sortKey === 'due') { av = a.due || ''; bv = b.due || '' }
      else if (sortKey === 'enrolled') { av = a.enrolled || ''; bv = b.enrolled || '' }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [rows, search, sortKey, sortDir])

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'
  const assignLabel = assignMode === 'individual'
    ? `✓ Assign to ${bulkStaff.length} staff member${bulkStaff.length !== 1 ? 's' : ''}`
    : bulkDepartment ? `✓ Assign to ${getDept(bulkDepartment)?.name || 'department'}` : '✓ Assign to department'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Enrolments</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{rows.length} total enrolments</p>
        </div>
        <button onClick={() => setShowBulk(!showBulk)}
          style={{ padding: '10px 18px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          {showBulk ? '✕ Cancel' : '🎯 Assign courses'}
        </button>
      </div>

      {/* Assign form */}
      {showBulk && (
        <div style={card}>
          <div style={cardTitle}>Assign a course to staff members</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label style={label}>Course *</label>
              <select style={input} value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)}>
                <option value="">— Select a course —</option>
                {courses.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.title}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Due date (optional)</label>
              <input style={input} type="date" value={bulkDue} onChange={(e) => setBulkDue(e.target.value)} />
            </div>
          </div>

          <label style={label}>Assign to</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', marginTop: '4px' }}>
            {([['individual', '👤 Individual'], ['department', '🏢 Department']] as const).map(([val, lbl]) => (
              <button key={val} type="button"
                onClick={() => { setAssignMode(val); setBulkStaff([]); setBulkDepartment(''); setStaffSearch('') }}
                style={{ padding: '7px 16px', borderRadius: '8px', border: `1.5px solid ${assignMode === val ? '#2D5BE3' : 'rgba(0,0,0,0.14)'}`, background: assignMode === val ? 'rgba(45,91,227,0.08)' : '#fff', color: assignMode === val ? '#2D5BE3' : '#5A5A55', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>

          {assignMode === 'individual' && (
            <>
              <label style={label}>Select staff members *</label>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input style={{ ...input, paddingLeft: '32px' }} list="staff-datalist" value={staffSearch}
                    onChange={(e) => handleStaffSearch(e.target.value)} placeholder="Search by name…" />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
                  <datalist id="staff-datalist">
                    {staff.filter((s) => !bulkStaff.includes(s.id)).map((s) => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>
                <button type="button" onClick={() => setBulkStaff(staff.map((s) => s.id))}
                  style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: '1.5px solid rgba(0,0,0,0.14)', background: '#F8F7F4', color: '#5A5A55', whiteSpace: 'nowrap' }}>
                  Select all
                </button>
              </div>
              {bulkStaff.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                  {bulkStaff.map((id) => {
                    const s = staff.find((m) => m.id === id)
                    return s ? (
                      <span key={id} style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 10px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                        {s.name}
                        <button type="button" onClick={() => setBulkStaff((p) => p.filter((x) => x !== id))}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2D5BE3', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                      </span>
                    ) : null
                  })}
                </div>
              )}
            </>
          )}

          {assignMode === 'department' && (
            <>
              <label style={label}>Select department *</label>
              <select style={{ ...input, marginBottom: '16px' }} value={bulkDepartment} onChange={(e) => setBulkDepartment(e.target.value)}>
                <option value="">— Select a department —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </>
          )}

          <label style={{ ...label, marginTop: '4px' }}>Type</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', marginTop: '4px' }}>
            {[['mandatory', '🔴 Mandatory'], ['optional', '🔵 Optional']].map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setBulkMandatory(val === 'mandatory')}
                style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${(val === 'mandatory') === bulkMandatory ? '#2D5BE3' : 'rgba(0,0,0,0.14)'}`, background: (val === 'mandatory') === bulkMandatory ? 'rgba(45,91,227,0.08)' : '#fff', color: (val === 'mandatory') === bulkMandatory ? '#2D5BE3' : '#5A5A55', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>

          <button type="button" onClick={bulkAssign} disabled={saving}
            style={{ padding: '10px 24px', background: saving ? '#8A8A82' : '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Assigning…' : assignLabel}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '320px' }}>
        <input
          style={{ ...input, paddingLeft: '34px' }}
          placeholder="Search by name or course…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : filtered.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>
            {rows.length === 0 ? 'No enrolments yet. Use "🎯 Assign courses" to get started.' : 'No results match your search.'}
          </p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {([['name', 'Staff / Department'], ['course', 'Course'], ['type', 'Type'], ['due', 'Due date'], ['enrolled', 'Enrolled on']] as [SortKey, string][]).map(([key, lbl]) => (
                  <th key={key} onClick={() => toggleSort(key)} style={{ ...th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>
                    {lbl}{sortIcon(key)}
                  </th>
                ))}
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={`${row.kind}-${row.id}`} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={td}>
                    {row.kind === 'department'
                      ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}><span style={{ fontSize: '13px' }}>🏢</span><strong>{row.name}</strong></span>
                      : <span style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}>
                          {row.photoUrl
                            ? <img src={row.photoUrl} alt={row.name} style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(0,0,0,0.1)', flexShrink: 0 }} />
                            : <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#1E3FB8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{row.name.charAt(0).toUpperCase()}</div>
                          }
                          <strong>{row.name}</strong>
                        </span>
                    }
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>{row.courseIcon}</span><span>{row.course}</span>
                    </div>
                  </td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: row.mandatory ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: row.mandatory ? '#993C1D' : '#2D5BE3' }}>
                      {row.mandatory ? 'Mandatory' : 'Optional'}
                    </span>
                  </td>
                  <td style={td}>
                    {row.due
                      ? <span style={{ color: new Date(row.due) < new Date() ? '#993C1D' : '#1A1A18' }}>{new Date(row.due) < new Date() ? '⚠️ ' : ''}{row.due}</span>
                      : '—'}
                  </td>
                  <td style={{ ...td, color: '#8A8A82' }}>{row.enrolled ? new Date(row.enrolled).toLocaleDateString() : '—'}</td>
                  <td style={td}>
                    <button onClick={() => removeEnrolment(row.id, row.kind)}
                      style={{ padding: '4px 10px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1A1A18', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }
