'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Staff = { id: string; name: string; role: string }
type Course = { id: string; title: string; icon: string; type: string }
type Enrolment = { id: string; staff_id: string; course_id: string; mandatory: boolean; due_date: string | null; enrolled_on: string }

export default function AdminEnrolments() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [enrolments, setEnrolments] = useState<Enrolment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Bulk assign form
  const [bulkCourse, setBulkCourse] = useState('')
  const [bulkStaff, setBulkStaff] = useState<string[]>([])
  const [bulkDue, setBulkDue] = useState('')
  const [bulkMandatory, setBulkMandatory] = useState(true)
  const [showBulk, setShowBulk] = useState(false)
  const [staffSearch, setStaffSearch] = useState('')

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [staffRes, courseRes, enrolRes] = await Promise.all([
      supabase.from('staff').select('id, name, role').eq('active', true).order('name'),
      supabase.from('courses').select('id, title, icon, type').eq('status', 'live').order('title'),
      supabase.from('enrolments').select('*').order('enrolled_on', { ascending: false }),
    ])
    if (staffRes.data) setStaff(staffRes.data)
    if (courseRes.data) setCourses(courseRes.data)
    if (enrolRes.data) setEnrolments(enrolRes.data)
    setLoading(false)
  }

  async function removeEnrolment(id: string) {
    if (!confirm('Remove this enrolment?')) return
    await supabase.from('enrolments').delete().eq('id', id)
    setEnrolments((prev) => prev.filter((e) => e.id !== id))
  }

  async function bulkAssign() {
    if (!bulkCourse) { alert('Select a course'); return }
    if (bulkStaff.length === 0) { alert('Select at least one staff member'); return }
    setSaving(true)
    const toInsert = bulkStaff
      .filter((sid) => !enrolments.some((e) => e.staff_id === sid && e.course_id === bulkCourse))
      .map((sid) => ({ staff_id: sid, course_id: bulkCourse, mandatory: bulkMandatory, due_date: bulkDue || null }))
    if (toInsert.length > 0) {
      await supabase.from('enrolments').insert(toInsert)
    }
    setBulkCourse(''); setBulkStaff([]); setBulkDue(''); setShowBulk(false)
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

  function removeFromBulk(id: string) {
    setBulkStaff((prev) => prev.filter((s) => s !== id))
  }

  const getStaff = (id: string) => staff.find((s) => s.id === id)
  const getCourse = (id: string) => courses.find((c) => c.id === id)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Enrolments</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{enrolments.length} total enrolments</p>
        </div>
        <button onClick={() => setShowBulk(!showBulk)}
          style={{ padding: '10px 18px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          {showBulk ? '✕ Cancel' : '🎯 Assign courses'}
        </button>
      </div>

      {/* Bulk assign */}
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

          <label style={label}>Select staff members *</label>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ flex: 1, position: 'relative' }}>
              <input
                style={{ ...input, paddingLeft: '32px' }}
                list="staff-datalist"
                value={staffSearch}
                onChange={(e) => handleStaffSearch(e.target.value)}
                placeholder="Search by name…"
              />
              <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
              <datalist id="staff-datalist">
                {staff.filter((s) => !bulkStaff.includes(s.id)).map((s) => (
                  <option key={s.id} value={s.name} />
                ))}
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
                    <button type="button" onClick={() => removeFromBulk(id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2D5BE3', fontSize: '14px', lineHeight: 1, padding: 0 }}>×</button>
                  </span>
                ) : null
              })}
            </div>
          )}

          <label style={{ ...label, marginTop: '16px' }}>Type</label>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', marginTop: '4px' }}>
            {[['mandatory', '🔴 Mandatory'], ['optional', '🔵 Optional']].map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setBulkMandatory(val === 'mandatory')}
                style={{ padding: '7px 14px', borderRadius: '8px', border: `1.5px solid ${(val === 'mandatory') === bulkMandatory ? '#2D5BE3' : 'rgba(0,0,0,0.14)'}`, background: (val === 'mandatory') === bulkMandatory ? 'rgba(45,91,227,0.08)' : '#fff', color: (val === 'mandatory') === bulkMandatory ? '#2D5BE3' : '#5A5A55', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {lbl}
              </button>
            ))}
          </div>

          <button onClick={bulkAssign} disabled={saving}
            style={{ padding: '10px 24px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Assigning...' : `✓ Assign to ${bulkStaff.length} staff member${bulkStaff.length !== 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Enrolments table */}
      {loading ? <p>Loading...</p> : enrolments.length === 0 ? (
        <div style={{ ...card, textAlign: 'center', padding: '40px' }}>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>No enrolments yet. Use "🎯 Assign courses" to get started.</p>
        </div>
      ) : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={th}>Staff member</th>
                <th style={th}>Course</th>
                <th style={th}>Type</th>
                <th style={th}>Due date</th>
                <th style={th}>Enrolled on</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {enrolments.map((e) => {
                const s = getStaff(e.staff_id)
                const c = getCourse(e.course_id)
                return (
                  <tr key={e.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={td}><strong>{s?.name || '—'}</strong></td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>{c?.icon}</span>
                        <span>{c?.title || '—'}</span>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: e.mandatory ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: e.mandatory ? '#993C1D' : '#2D5BE3' }}>
                        {e.mandatory ? 'Mandatory' : 'Optional'}
                      </span>
                    </td>
                    <td style={td}>
                      {e.due_date ? (
                        <span style={{ color: new Date(e.due_date) < new Date() ? '#993C1D' : '#1A1A18' }}>
                          {new Date(e.due_date) < new Date() ? '⚠️ ' : ''}{e.due_date}
                        </span>
                      ) : '—'}
                    </td>
                    <td style={{ ...td, color: '#8A8A82' }}>{e.enrolled_on ? new Date(e.enrolled_on).toLocaleDateString() : '—'}</td>
                    <td style={td}>
                      <button onClick={() => removeEnrolment(e.id)}
                        style={{ padding: '4px 10px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>
                        Remove
                      </button>
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

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1A1A18', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }
