'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

type Department = { id: string; name: string; icon: string; sort_order: number }

const EMOJI_GROUPS = [
  { label: 'Health & Care', emojis: ['🏥','💊','🩺','🩹','❤️','🧬','🦺','🚑','🧪','💉','🫀','🧠'] },
  { label: 'Safety', emojis: ['🔥','⚠️','🚨','🛡️','🔒','🪖','🧯','🚒','⛑️','🔐','🚧','📵'] },
  { label: 'People & Teams', emojis: ['👥','🧑‍⚕️','👔','👤','🤝','👨‍👩‍👧','🧑‍🤝‍🧑','👩‍💼','👨‍💼','🫂','🙋','👋'] },
  { label: 'Learning', emojis: ['📚','📖','✏️','🎓','📝','📋','📄','🗒️','📓','🏫','💡','🔍'] },
  { label: 'Work & Office', emojis: ['💼','🖥️','📊','📈','🗂️','📌','📎','🖊️','📅','🗓️','⏰','📞'] },
  { label: 'Mind & Wellbeing', emojis: ['🧘','😊','🌱','🌟','💚','🕊️','🌈','☀️','🫶','💬','🤲','🌸'] },
  { label: 'Buildings & Places', emojis: ['🏢','🏠','🏗️','🏛️','🏨','🏪','🏬','🏭','🏡','🌍','📍','🗺️'] },
  { label: 'Misc', emojis: ['⭐','✅','❌','🔔','🎯','🏆','🎖️','🔑','💡','🔧','⚙️','🧩'] },
]

function EmojiPicker({ value, onChange }: { value: string; onChange: (e: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ padding: '8px 12px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', fontSize: '20px', cursor: 'pointer', minWidth: '52px' }}>
        {value || '🏢'}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 100, background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '12px', padding: '12px', width: '280px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: '4px' }}>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {EMOJI_GROUPS.map((group) => (
              <div key={group.label} style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{group.label}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {group.emojis.map((emoji) => (
                    <button key={emoji} type="button" onClick={() => { onChange(emoji); setOpen(false) }}
                      style={{ width: '34px', height: '34px', border: value === emoji ? '2px solid #2D5BE3' : '1px solid rgba(0,0,0,0.08)', borderRadius: '6px', background: value === emoji ? 'rgba(45,91,227,0.08)' : '#F8F7F4', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setOpen(false)}
            style={{ marginTop: '8px', width: '100%', padding: '6px', background: 'rgba(0,0,0,0.04)', border: 'none', borderRadius: '6px', fontSize: '12px', color: '#5A5A55', cursor: 'pointer' }}>Close</button>
        </div>
      )}
    </div>
  )
}

export default function AdminDepartments() {
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newIcon, setNewIcon] = useState('🏢')
  const [adding, setAdding] = useState(false)

  useEffect(() => { fetchDepts() }, [])

  async function fetchDepts() {
    const { data } = await supabase.from('departments').select('*').order('sort_order')
    if (data) setDepartments(data)
    setLoading(false)
  }

  async function addDept() {
    if (!newName.trim()) { alert('Enter a name'); return }
    setAdding(true)
    const maxOrder = departments.length > 0 ? Math.max(...departments.map(d => d.sort_order)) + 1 : 0
    await supabase.from('departments').insert({ name: newName, icon: newIcon, sort_order: maxOrder })
    setNewName(''); setNewIcon('🏢')
    await fetchDepts()
    setAdding(false)
  }

  async function updateDept(id: string, field: string, value: string) {
    setDepartments((prev) => prev.map((d) => d.id === id ? { ...d, [field]: value } : d))
    await supabase.from('departments').update({ [field]: value }).eq('id', id)
  }

  async function deleteDept(id: string) {
    const inUse = await supabase.from('staff_departments').select('id').eq('department_id', id)
    if ((inUse.data?.length || 0) > 0) { alert('Cannot delete — staff are assigned to this department.'); return }
    if (!confirm('Delete this department?')) return
    await supabase.from('departments').delete().eq('id', id)
    setDepartments((prev) => prev.filter((d) => d.id !== id))
  }

  async function moveDept(id: string, direction: 'up' | 'down') {
    const idx = departments.findIndex((d) => d.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= departments.length) return
    const newDepts = [...departments]
    const tempOrder = newDepts[idx].sort_order
    newDepts[idx].sort_order = newDepts[swapIdx].sort_order
    newDepts[swapIdx].sort_order = tempOrder
    ;[newDepts[idx], newDepts[swapIdx]] = [newDepts[swapIdx], newDepts[idx]]
    setDepartments(newDepts)
    await supabase.from('departments').update({ sort_order: newDepts[idx].sort_order }).eq('id', newDepts[idx].id)
    await supabase.from('departments').update({ sort_order: newDepts[swapIdx].sort_order }).eq('id', newDepts[swapIdx].id)
  }

  return (
    <div style={{ maxWidth: '700px' }}>
      <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '6px' }}>Departments</h1>
      <p style={{ fontSize: '14px', color: '#8A8A82', marginBottom: '24px' }}>Manage departments. Courses and staff are linked to departments to control who sees what.</p>

      <div style={card}>
        <div style={cardTitle}>Add new department</div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'end' }}>
          <div>
            <label style={label}>Icon</label>
            <EmojiPicker value={newIcon} onChange={setNewIcon} />
          </div>
          <div style={{ flex: 1 }}>
            <label style={label}>Name *</label>
            <input style={input} value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Support Workers" onKeyDown={(e) => e.key === 'Enter' && addDept()} />
          </div>
          <button onClick={addDept} disabled={adding}
            style={{ padding: '8px 16px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', marginBottom: '1px' }}>
            {adding ? '...' : '+ Add'}
          </button>
        </div>
      </div>

      <div style={card}>
        <div style={cardTitle}>All departments ({departments.length})</div>
        {loading ? <p>Loading...</p> : departments.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#8A8A82' }}>No departments yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {departments.map((dept, idx) => (
              <div key={dept.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', background: '#F8F7F4', border: '1px solid rgba(0,0,0,0.06)', borderRadius: '8px' }}>
                <EmojiPicker value={dept.icon || '🏢'} onChange={(e) => updateDept(dept.id, 'icon', e)} />
                <input style={{ ...input, flex: 1 }} value={dept.name} onChange={(e) => updateDept(dept.id, 'name', e.target.value)} />
                <div style={{ display: 'flex', gap: '4px' }}>
                  {idx > 0 && <button onClick={() => moveDept(dept.id, 'up')} style={iconBtn}>↑</button>}
                  {idx < departments.length - 1 && <button onClick={() => moveDept(dept.id, 'down')} style={iconBtn}>↓</button>}
                  <button onClick={() => deleteDept(dept.id)} style={{ ...iconBtn, color: '#993C1D', background: 'rgba(153,60,29,0.08)' }}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1A1A18', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const label: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%' }
const iconBtn: React.CSSProperties = { padding: '4px 10px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#5A5A55' }