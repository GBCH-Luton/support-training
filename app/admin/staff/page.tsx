'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Staff = { id: string; name: string; email: string; job_title: string; department: string; role: string; active: boolean; must_reset_password: boolean }
type Department = { id: string; name: string; icon: string }

export default function AdminStaff() {
  const [staff, setStaff] = useState<Staff[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [staffDepts, setStaffDepts] = useState<Record<string, string[]>>({})
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [saving, setSaving] = useState(false)

  // New staff form
  const [newName, setNewName] = useState('')
  const [newEmail, setNewEmail] = useState('')
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newRole, setNewRole] = useState('sw')
  const [newDepts, setNewDepts] = useState<string[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [staffRes, deptRes, sdRes] = await Promise.all([
      supabase.from('staff').select('*').order('name'),
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('staff_departments').select('staff_id, department_id'),
    ])
    if (staffRes.data) setStaff(staffRes.data)
    if (deptRes.data) setDepartments(deptRes.data)
    if (sdRes.data) {
      const map: Record<string, string[]> = {}
      sdRes.data.forEach((row) => {
        if (!map[row.staff_id]) map[row.staff_id] = []
        map[row.staff_id].push(row.department_id)
      })
      setStaffDepts(map)
    }
    setLoading(false)
  }

  async function addStaff() {
    if (!newName.trim() || !newEmail.trim()) { alert('Name and email are required'); return }
    setSaving(true)
    const { data } = await supabase.from('staff').insert({ name: newName, email: newEmail, job_title: newJobTitle, role: newRole, active: true, must_reset_password: true }).select().single()
    if (data && newDepts.length > 0) {
      await supabase.from('staff_departments').insert(newDepts.map((deptId) => ({ staff_id: data.id, department_id: deptId })))
    }
    setNewName(''); setNewEmail(''); setNewJobTitle(''); setNewRole('sw'); setNewDepts([])
    setShowAdd(false)
    await fetchAll()
    setSaving(false)
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('staff').update({ active: !current }).eq('id', id)
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, active: !current } : s))
  }

  async function toggleForceReset(id: string, current: boolean) {
    await supabase.from('staff').update({ must_reset_password: !current }).eq('id', id)
    setStaff((prev) => prev.map((s) => s.id === id ? { ...s, must_reset_password: !current } : s))
  }

  async function toggleDept(staffId: string, deptId: string) {
    const current = staffDepts[staffId] || []
    const hasIt = current.includes(deptId)
    if (hasIt) {
      await supabase.from('staff_departments').delete().eq('staff_id', staffId).eq('department_id', deptId)
      setStaffDepts((prev) => ({ ...prev, [staffId]: current.filter((d) => d !== deptId) }))
    } else {
      await supabase.from('staff_departments').insert({ staff_id: staffId, department_id: deptId })
      setStaffDepts((prev) => ({ ...prev, [staffId]: [...current, deptId] }))
    }
  }

  function toggleNewDept(deptId: string) {
    setNewDepts((prev) => prev.includes(deptId) ? prev.filter((d) => d !== deptId) : [...prev, deptId])
  }

  const getDeptName = (id: string) => departments.find((d) => d.id === id)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Staff</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{staff.length} staff members · {staff.filter(s => s.active).length} active</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          style={{ padding: '10px 18px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
          {showAdd ? '✕ Cancel' : '+ Add staff member'}
        </button>
      </div>

      {/* Add staff form */}
      {showAdd && (
        <div style={card}>
          <div style={cardTitle}>Add new staff member</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={label}>Full name *</label>
              <input style={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Sarah Mitchell" />
            </div>
            <div>
              <label style={label}>Email *</label>
              <input style={input} type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="sarah@example.com" />
            </div>
            <div>
              <label style={label}>Job title</label>
              <input style={input} value={newJobTitle} onChange={(e) => setNewJobTitle(e.target.value)} placeholder="e.g. Support Worker" />
            </div>
            <div>
              <label style={label}>Role</label>
              <select style={input} value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="sw">Support Worker</option>
                <option value="manager">Manager / Team Leader</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={label}>Departments</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {departments.map((dept) => (
                <button key={dept.id} type="button" onClick={() => toggleNewDept(dept.id)}
                  style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: newDepts.includes(dept.id) ? '1.5px solid #2D5BE3' : '1.5px solid rgba(0,0,0,0.14)', background: newDepts.includes(dept.id) ? 'rgba(45,91,227,0.08)' : '#fff', color: newDepts.includes(dept.id) ? '#2D5BE3' : '#5A5A55' }}>
                  {dept.icon} {dept.name}
                </button>
              ))}
            </div>
          </div>
          <button onClick={addStaff} disabled={saving}
            style={{ padding: '10px 24px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Add staff member'}
          </button>
        </div>
      )}

      {/* Staff table */}
      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={th}>Name</th>
                <th style={th}>Email</th>
                <th style={th}>Job title</th>
                <th style={th}>Role</th>
                <th style={th}>Departments</th>
                <th style={th}>Status</th>
                <th style={th}>Force reset</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                  <td style={td}><strong>{s.name}</strong></td>
                  <td style={td} ><span style={{ color: '#5A5A55' }}>{s.email}</span></td>
                  <td style={td}>{s.job_title || '—'}</td>
                  <td style={td}>
                    <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: s.role === 'admin' ? 'rgba(133,79,11,0.1)' : s.role === 'manager' ? 'rgba(83,74,183,0.1)' : 'rgba(45,91,227,0.1)', color: s.role === 'admin' ? '#854F0B' : s.role === 'manager' ? '#534AB7' : '#2D5BE3' }}>
                      {s.role === 'admin' ? '⚙️ Admin' : s.role === 'manager' ? '👔 Manager' : '🧑‍⚕️ SW'}
                    </span>
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {departments.map((dept) => {
                        const assigned = (staffDepts[s.id] || []).includes(dept.id)
                        return (
                          <button key={dept.id} onClick={() => toggleDept(s.id, dept.id)}
                            style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: assigned ? '1.5px solid #0F6E56' : '1.5px solid rgba(0,0,0,0.1)', background: assigned ? 'rgba(15,110,86,0.08)' : '#F8F7F4', color: assigned ? '#0F6E56' : '#8A8A82' }}>
                            {dept.icon} {dept.name}
                          </button>
                        )
                      })}
                    </div>
                  </td>
                  <td style={td}>
                    <button onClick={() => toggleActive(s.id, s.active)}
                      style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: s.active ? 'rgba(15,110,86,0.1)' : 'rgba(0,0,0,0.06)', color: s.active ? '#0F6E56' : '#8A8A82' }}>
                      {s.active ? '🟢 Active' : '⬜ Inactive'}
                    </button>
                  </td>
                  <td style={td}>
                    <button onClick={() => toggleForceReset(s.id, s.must_reset_password)}
                      style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: s.must_reset_password ? 'rgba(153,60,29,0.1)' : 'rgba(0,0,0,0.06)', color: s.must_reset_password ? '#993C1D' : '#8A8A82' }}>
                      {s.must_reset_password ? '🔒 Required' : '✓ Done'}
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
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%' }
const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }