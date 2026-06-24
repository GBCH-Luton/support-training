'use client'

import { useEffect, useState, useMemo } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Staff = { id: string; name: string; email: string; job_title: string; role: string; active: boolean; must_reset_password: boolean }
type Department = { id: string; name: string; icon: string }
type Role = { id: string; name: string; label: string; color: string; bg_color: string; sort_order: number; is_admin: boolean }
type SortKey = 'name' | 'email' | 'job_title' | 'role' | 'active'

const PRESET_COLORS = [
  { color: '#2D5BE3', bg: 'rgba(45,91,227,0.1)',  label: 'Blue'   },
  { color: '#534AB7', bg: 'rgba(83,74,183,0.1)',   label: 'Purple' },
  { color: '#854F0B', bg: 'rgba(133,79,11,0.1)',   label: 'Amber'  },
  { color: '#0F6E56', bg: 'rgba(15,110,86,0.1)',   label: 'Green'  },
  { color: '#993C1D', bg: 'rgba(153,60,29,0.1)',   label: 'Red'    },
  { color: '#0E7490', bg: 'rgba(14,116,144,0.1)',  label: 'Teal'   },
  { color: '#99355A', bg: 'rgba(153,53,90,0.1)',   label: 'Pink'   },
  { color: '#5A5A55', bg: 'rgba(90,90,85,0.1)',    label: 'Gray'   },
]

const FALLBACK_ROLES: Role[] = [
  { id: '1', name: 'sw',      label: 'Support Worker', color: '#2D5BE3', bg_color: 'rgba(45,91,227,0.1)',  sort_order: 1, is_admin: false },
  { id: '2', name: 'manager', label: 'Manager',        color: '#534AB7', bg_color: 'rgba(83,74,183,0.1)',  sort_order: 2, is_admin: false },
  { id: '3', name: 'admin',   label: 'Admin',          color: '#854F0B', bg_color: 'rgba(133,79,11,0.1)',  sort_order: 3, is_admin: true  },
]

export default function AdminStaff() {
  const [staff, setStaff]           = useState<Staff[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles]           = useState<Role[]>([])
  const [staffDepts, setStaffDepts] = useState<Record<string, string[]>>({})
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)

  // Table controls
  const [search, setSearch]   = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Dept inline picker
  const [openDeptMenu, setOpenDeptMenu] = useState<string | null>(null)

  // Roles panel
  const [showRoles, setShowRoles]     = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleLabel, setNewRoleLabel] = useState('')
  const [newRoleColor, setNewRoleColor] = useState(PRESET_COLORS[0])
  const [rolesSaving, setRolesSaving] = useState(false)

  // Add staff form
  const [showAdd, setShowAdd]       = useState(false)
  const [newName, setNewName]       = useState('')
  const [newEmail, setNewEmail]     = useState('')
  const [newJobTitle, setNewJobTitle] = useState('')
  const [newRole, setNewRole]       = useState('sw')
  const [newDepts, setNewDepts]     = useState<string[]>([])

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    const [staffRes, deptRes, sdRes, rolesRes] = await Promise.all([
      supabase.from('staff').select('id, name, email, job_title, role, active, must_reset_password').order('name'),
      supabase.from('departments').select('*').order('sort_order'),
      supabase.from('staff_departments').select('staff_id, department_id'),
      supabase.from('roles').select('*').order('sort_order'),
    ])
    if (staffRes.data) setStaff(staffRes.data)
    if (deptRes.data) setDepartments(deptRes.data)
    if (rolesRes.data && rolesRes.data.length > 0) setRoles(rolesRes.data)
    if (sdRes.data) {
      const map: Record<string, string[]> = {}
      sdRes.data.forEach(row => {
        if (!map[row.staff_id]) map[row.staff_id] = []
        map[row.staff_id].push(row.department_id)
      })
      setStaffDepts(map)
    }
    setLoading(false)
  }

  const effectiveRoles = roles.length > 0 ? roles : FALLBACK_ROLES
  const roleStyle = (name: string) => effectiveRoles.find(r => r.name === name) ?? { color: '#5A5A55', bg_color: 'rgba(90,90,85,0.1)', label: name }

  // ── Staff CRUD ──────────────────────────────────────────────────────────────
  async function addStaff() {
    if (!newName.trim() || !newEmail.trim()) { alert('Name and email are required'); return }
    setSaving(true)
    const { data } = await supabase
      .from('staff')
      .insert({ name: newName, email: newEmail, job_title: newJobTitle, role: newRole, active: true, must_reset_password: true })
      .select().single()
    if (data && newDepts.length > 0) {
      await supabase.from('staff_departments').insert(newDepts.map(d => ({ staff_id: data.id, department_id: d })))
    }
    setNewName(''); setNewEmail(''); setNewJobTitle(''); setNewRole('sw'); setNewDepts([])
    setShowAdd(false)
    await fetchAll()
    setSaving(false)
  }

  async function changeRole(id: string, role: string) {
    await supabase.from('staff').update({ role }).eq('id', id)
    setStaff(p => p.map(s => s.id === id ? { ...s, role } : s))
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('staff').update({ active: !current }).eq('id', id)
    setStaff(p => p.map(s => s.id === id ? { ...s, active: !current } : s))
  }

  async function toggleForceReset(id: string, current: boolean) {
    await supabase.from('staff').update({ must_reset_password: !current }).eq('id', id)
    setStaff(p => p.map(s => s.id === id ? { ...s, must_reset_password: !current } : s))
  }

  async function toggleDept(staffId: string, deptId: string) {
    const current = staffDepts[staffId] || []
    if (current.includes(deptId)) {
      await supabase.from('staff_departments').delete().eq('staff_id', staffId).eq('department_id', deptId)
      setStaffDepts(p => ({ ...p, [staffId]: current.filter(d => d !== deptId) }))
    } else {
      await supabase.from('staff_departments').insert({ staff_id: staffId, department_id: deptId })
      setStaffDepts(p => ({ ...p, [staffId]: [...current, deptId] }))
    }
  }

  // ── Roles CRUD ──────────────────────────────────────────────────────────────
  async function addRole() {
    if (!newRoleName.trim() || !newRoleLabel.trim()) { alert('Role key and label are required'); return }
    setRolesSaving(true)
    const { error } = await supabase.from('roles').insert({
      name: newRoleName.toLowerCase().replace(/\s+/g, '_'),
      label: newRoleLabel,
      color: newRoleColor.color,
      bg_color: newRoleColor.bg,
    })
    if (error) alert(error.message)
    else { setNewRoleName(''); setNewRoleLabel(''); setNewRoleColor(PRESET_COLORS[0]); await fetchAll() }
    setRolesSaving(false)
  }

  async function deleteRole(id: string, name: string) {
    if (['sw', 'manager', 'admin'].includes(name)) { alert('System roles cannot be deleted.'); return }
    if (!confirm('Delete this role? Staff with this role will keep the value but it will no longer appear in the list.')) return
    await supabase.from('roles').delete().eq('id', id)
    setRoles(p => p.filter(r => r.id !== id))
  }

  // ── Sort & filter ────────────────────────────────────────────────────────────
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    const searched = q
      ? staff.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q) || (s.job_title || '').toLowerCase().includes(q))
      : staff
    return [...searched].sort((a, b) => {
      let av = '', bv = ''
      if (sortKey === 'name')      { av = a.name;      bv = b.name }
      if (sortKey === 'email')     { av = a.email;     bv = b.email }
      if (sortKey === 'job_title') { av = a.job_title || ''; bv = b.job_title || '' }
      if (sortKey === 'role')      { av = a.role;      bv = b.role }
      if (sortKey === 'active')    { av = String(a.active); bv = String(b.active) }
      const cmp = av.localeCompare(bv)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [staff, search, sortKey, sortDir])

  const sortIcon = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ' ↕'

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Staff</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{staff.length} members · {staff.filter(s => s.active).length} active</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" onClick={() => { setShowRoles(!showRoles); setShowAdd(false) }}
            style={{ padding: '10px 16px', background: showRoles ? '#1A1A18' : '#F4F3EF', color: showRoles ? '#fff' : '#5A5A55', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            🏷️ Manage roles
          </button>
          <button type="button" onClick={() => { setShowAdd(!showAdd); setShowRoles(false) }}
            style={{ padding: '10px 16px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {showAdd ? '✕ Cancel' : '+ Add staff member'}
          </button>
        </div>
      </div>

      {/* Manage roles panel */}
      {showRoles && (
        <div style={card}>
          <div style={cardTitle}>Manage roles</div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
            {effectiveRoles.map(r => (
              <div key={r.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 10px', borderRadius: '20px', background: r.bg_color, border: `1.5px solid ${r.color}` }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: r.color }}>{r.label}</span>
                {!r.is_admin && !['sw', 'manager'].includes(r.name) && (
                  <button type="button" onClick={() => deleteRole(r.id, r.name)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: r.color, fontSize: '14px', lineHeight: 1, padding: 0, opacity: 0.7 }}>×</button>
                )}
              </div>
            ))}
          </div>

          <div style={cardTitle}>Add new role</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={label}>Display name *</label>
              <input style={input} value={newRoleLabel} onChange={e => setNewRoleLabel(e.target.value)} placeholder="e.g. Housing Officer" />
            </div>
            <div>
              <label style={label}>Key (no spaces) *</label>
              <input style={input} value={newRoleName} onChange={e => setNewRoleName(e.target.value.toLowerCase().replace(/\s+/g, '_'))} placeholder="e.g. housing_officer" />
            </div>
          </div>
          <label style={label}>Colour</label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px', marginTop: '4px' }}>
            {PRESET_COLORS.map(p => (
              <button key={p.color} type="button" onClick={() => setNewRoleColor(p)}
                style={{ width: '28px', height: '28px', borderRadius: '50%', background: p.color, border: newRoleColor.color === p.color ? '3px solid #1A1A18' : '3px solid transparent', cursor: 'pointer', outline: 'none' }} />
            ))}
          </div>
          {newRoleLabel && (
            <div style={{ marginBottom: '12px' }}>
              <span style={{ fontSize: '11px', color: '#8A8A82', marginRight: '8px' }}>Preview:</span>
              <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, background: newRoleColor.bg, color: newRoleColor.color }}>{newRoleLabel}</span>
            </div>
          )}
          <button type="button" onClick={addRole} disabled={rolesSaving}
            style={{ padding: '9px 20px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {rolesSaving ? 'Saving…' : 'Add role'}
          </button>
        </div>
      )}

      {/* Add staff form */}
      {showAdd && (
        <div style={card}>
          <div style={cardTitle}>Add new staff member</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={label}>Full name *</label>
              <input style={input} value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Sarah Mitchell" />
            </div>
            <div>
              <label style={label}>Email *</label>
              <input style={input} type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="sarah@greenbridgehousing.org" />
            </div>
            <div>
              <label style={label}>Job title</label>
              <input style={input} value={newJobTitle} onChange={e => setNewJobTitle(e.target.value)} placeholder="e.g. Support Worker" />
            </div>
            <div>
              <label style={label}>Role</label>
              <select style={input} value={newRole} onChange={e => setNewRole(e.target.value)}>
                {effectiveRoles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={label}>Departments</label>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
              {departments.map(dept => (
                <button key={dept.id} type="button" onClick={() => setNewDepts(p => p.includes(dept.id) ? p.filter(d => d !== dept.id) : [...p, dept.id])}
                  style={{ padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', border: newDepts.includes(dept.id) ? '1.5px solid #2D5BE3' : '1.5px solid rgba(0,0,0,0.14)', background: newDepts.includes(dept.id) ? 'rgba(45,91,227,0.08)' : '#fff', color: newDepts.includes(dept.id) ? '#2D5BE3' : '#5A5A55' }}>
                  {dept.icon} {dept.name}
                </button>
              ))}
            </div>
          </div>
          <p style={{ fontSize: '12px', color: '#8A8A82', marginBottom: '14px' }}>New staff will be required to reset their password on first login.</p>
          <button type="button" onClick={addStaff} disabled={saving}
            style={{ padding: '10px 24px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving…' : 'Add staff member'}
          </button>
        </div>
      )}

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: '16px', maxWidth: '320px' }}>
        <input style={{ ...input, paddingLeft: '34px' }} placeholder="Search by name, email or job title…" value={search} onChange={e => setSearch(e.target.value)} />
        <span style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', fontSize: '14px', pointerEvents: 'none' }}>🔍</span>
      </div>

      {/* Table */}
      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                {([['name','Name'],['email','Email'],['job_title','Job title'],['role','Role']] as [SortKey,string][]).map(([key,lbl]) => (
                  <th key={key} onClick={() => toggleSort(key)} style={{ ...th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>{lbl}{sortIcon(key)}</th>
                ))}
                <th style={th}>Departments</th>
                <th onClick={() => toggleSort('active')} style={{ ...th, cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' }}>Status{sortIcon('active')}</th>
                <th style={th}>Pwd reset</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ ...td, textAlign: 'center', color: '#8A8A82', padding: '32px' }}>No staff match your search.</td></tr>
              ) : filtered.map(s => {
                const rs = roleStyle(s.role)
                const assignedDepts = departments.filter(d => (staffDepts[s.id] || []).includes(d.id))
                const deptOpen = openDeptMenu === s.id
                return (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)', opacity: s.active ? 1 : 0.5 }}>
                    <td style={td}><strong>{s.name}</strong></td>
                    <td style={{ ...td, color: '#5A5A55' }}>{s.email}</td>
                    <td style={td}>{s.job_title || '—'}</td>

                    {/* Role inline select */}
                    <td style={td}>
                      <select value={s.role} onChange={e => changeRole(s.id, e.target.value)}
                        style={{ padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, border: `1.5px solid ${rs.color}`, background: rs.bg_color, color: rs.color, cursor: 'pointer', outline: 'none' }}>
                        {effectiveRoles.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
                      </select>
                    </td>

                    {/* Department dropdown */}
                    <td style={{ ...td, minWidth: '160px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                        {assignedDepts.length === 0
                          ? <span style={{ fontSize: '12px', color: '#8A8A82' }}>None</span>
                          : assignedDepts.map(d => (
                            <span key={d.id} style={{ padding: '2px 7px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(15,110,86,0.08)', color: '#0F6E56', border: '1px solid rgba(15,110,86,0.2)' }}>{d.icon} {d.name}</span>
                          ))
                        }
                        <button type="button" onClick={() => setOpenDeptMenu(p => p === s.id ? null : s.id)}
                          style={{ fontSize: '11px', padding: '2px 7px', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', background: deptOpen ? '#1A1A18' : '#F4F3EF', color: deptOpen ? '#fff' : '#5A5A55', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          {deptOpen ? 'Done' : '✏️ Edit'}
                        </button>
                      </div>
                      {deptOpen && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '8px', padding: '10px', background: '#F8F7F4', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.08)' }}>
                          {departments.map(dept => {
                            const on = (staffDepts[s.id] || []).includes(dept.id)
                            return (
                              <button key={dept.id} type="button" onClick={() => toggleDept(s.id, dept.id)}
                                style={{ padding: '3px 9px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer', border: on ? '1.5px solid #0F6E56' : '1.5px solid rgba(0,0,0,0.12)', background: on ? 'rgba(15,110,86,0.1)' : '#fff', color: on ? '#0F6E56' : '#8A8A82' }}>
                                {dept.icon} {dept.name}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </td>

                    {/* Active toggle */}
                    <td style={td}>
                      <button type="button" onClick={() => toggleActive(s.id, s.active)}
                        style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: s.active ? 'rgba(15,110,86,0.1)' : 'rgba(153,60,29,0.08)', color: s.active ? '#0F6E56' : '#993C1D', whiteSpace: 'nowrap' }}>
                        {s.active ? '🟢 Active' : '🔴 Inactive'}
                      </button>
                    </td>

                    {/* Force reset */}
                    <td style={td}>
                      <button type="button" onClick={() => toggleForceReset(s.id, s.must_reset_password)}
                        style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: s.must_reset_password ? 'rgba(153,60,29,0.08)' : 'rgba(0,0,0,0.05)', color: s.must_reset_password ? '#993C1D' : '#8A8A82', whiteSpace: 'nowrap' }}>
                        {s.must_reset_password ? '🔒 Required' : '✓ Done'}
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

const card: React.CSSProperties  = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '14px', fontWeight: 700, color: '#1A1A18', marginBottom: '14px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%', boxSizing: 'border-box' }
const th: React.CSSProperties    = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties    = { padding: '12px 16px', verticalAlign: 'top', color: '#1A1A18' }
