'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Course = { id: string; title: string; description: string; type: string; status: string; pass_mark: number; icon: string; category_id: string }
type Category = { id: string; name: string; icon: string }
type SortKey = 'title' | 'category' | 'type' | 'pass_mark' | 'status'
type SortDir = 'asc' | 'desc'

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('title')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    const { data: courseData } = await supabase.from('courses').select('*').order('title')
    const { data: catData } = await supabase.from('categories').select('*')
    if (courseData) setCourses(courseData)
    if (catData) setCategories(catData)
    setLoading(false)
  }

  async function toggleStatus(course: Course) {
    const newStatus = course.status === 'live' ? 'draft' : 'live'
    setSaving(course.id)
    await supabase.from('courses').update({ status: newStatus }).eq('id', course.id)
    setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, status: newStatus } : c))
    setSaving(null)
  }

  async function deleteCourse(course: Course) {
    if (!confirm(`Delete "${course.title}"?\n\nThis permanently removes the course, its sections, questions, and all staff progress for it. This cannot be undone.`)) return
    setDeleting(course.id)
    await supabase.from('course_departments').delete().eq('course_id', course.id)
    await supabase.from('enrolments').delete().eq('course_id', course.id)
    await supabase.from('section_progress').delete().eq('course_id', course.id)
    await supabase.from('exam_attempts').delete().eq('course_id', course.id)
    await supabase.from('questions').delete().eq('course_id', course.id)
    await supabase.from('course_sections').delete().eq('course_id', course.id)
    await supabase.from('courses').delete().eq('id', course.id)
    setCourses((prev) => prev.filter((c) => c.id !== course.id))
    setDeleting(null)
  }

  const getCat = (id: string) => categories.find((c) => c.id === id)

  function changeSort(key: SortKey) {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const sortedCourses = [...courses].sort((a, b) => {
    let av: string | number = '', bv: string | number = ''
    if (sortKey === 'title') { av = a.title.toLowerCase(); bv = b.title.toLowerCase() }
    else if (sortKey === 'category') { av = (getCat(a.category_id)?.name || '').toLowerCase(); bv = (getCat(b.category_id)?.name || '').toLowerCase() }
    else if (sortKey === 'type') { av = a.type; bv = b.type }
    else if (sortKey === 'pass_mark') { av = a.pass_mark; bv = b.pass_mark }
    else if (sortKey === 'status') { av = a.status; bv = b.status }
    if (av < bv) return sortDir === 'asc' ? -1 : 1
    if (av > bv) return sortDir === 'asc' ? 1 : -1
    return 0
  })

  const sortArrow = (key: SortKey) => sortKey === key ? (sortDir === 'asc' ? ' ▲' : ' ▼') : ''

  return (
    <div>
      <style>{`
        .ac-table-wrap { display:block; }
        .ac-cards { display:none; }
        @media (max-width:820px) {
          .ac-table-wrap { display:none; }
          .ac-cards { display:flex; flex-direction:column; gap:12px; }
        }
      `}</style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '4px' }}>All courses</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{courses.length} courses · {courses.filter(c => c.status === 'live').length} live</p>
        </div>
        <Link href="/admin/builder" style={{ padding: '11px 18px', background: 'linear-gradient(135deg,#5B8DEF,#2D5BE3)', color: '#fff', borderRadius: '10px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', boxShadow: '0 3px 12px rgba(45,91,227,0.3)' }}>+ New course</Link>
      </div>

      {loading ? <p>Loading...</p> : (
        <>
          {/* Desktop table */}
          <div className="ac-table-wrap" style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '16px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.07)' }}>
                  <th style={thClick} onClick={() => changeSort('title')}>Course{sortArrow('title')}</th>
                  <th style={thClick} onClick={() => changeSort('category')}>Category{sortArrow('category')}</th>
                  <th style={thClick} onClick={() => changeSort('type')}>Type{sortArrow('type')}</th>
                  <th style={thClick} onClick={() => changeSort('pass_mark')}>Pass{sortArrow('pass_mark')}</th>
                  <th style={thClick} onClick={() => changeSort('status')}>Status{sortArrow('status')}</th>
                  <th style={th}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map((course) => {
                  const cat = getCat(course.category_id)
                  const isLive = course.status === 'live'
                  return (
                    <tr key={course.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                      <td style={td}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <span style={{ fontSize: '20px' }}>{course.icon}</span>
                          <span style={{ fontWeight: 600 }}>{course.title}</span>
                        </div>
                      </td>
                      <td style={td}><span style={{ fontSize: '12px', color: '#5A5A55' }}>{cat?.icon} {cat?.name || '—'}</span></td>
                      <td style={td}><span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: course.type === 'mandatory' ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: course.type === 'mandatory' ? '#993C1D' : '#2D5BE3' }}>{course.type === 'mandatory' ? 'Mandatory' : 'Optional'}</span></td>
                      <td style={td}>{course.pass_mark}%</td>
                      <td style={td}>
                        <button onClick={() => toggleStatus(course)} disabled={saving === course.id} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: isLive ? 'rgba(15,110,86,0.1)' : 'rgba(0,0,0,0.06)', color: isLive ? '#0F6E56' : '#8A8A82' }}>
                          {saving === course.id ? '...' : isLive ? '🟢 Live' : '⬜ Draft'}
                        </button>
                      </td>
                      <td style={td}>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Link href={`/admin/builder?id=${course.id}`} style={{ padding: '5px 12px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '7px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>✏️ Edit</Link>
                          <button onClick={() => deleteCourse(course)} disabled={deleting === course.id} style={{ padding: '5px 12px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', border: 'none', borderRadius: '7px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{deleting === course.id ? '...' : '🗑'}</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="ac-cards">
            {sortedCourses.map((course) => {
              const cat = getCat(course.category_id)
              const isLive = course.status === 'live'
              return (
                <div key={course.id} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '14px', padding: '16px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                    <span style={{ fontSize: '24px' }}>{course.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '15px' }}>{course.title}</div>
                      <div style={{ fontSize: '12px', color: '#8A8A82' }}>{cat?.icon} {cat?.name} · Pass {course.pass_mark}%</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: course.type === 'mandatory' ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: course.type === 'mandatory' ? '#993C1D' : '#2D5BE3' }}>{course.type === 'mandatory' ? 'Mandatory' : 'Optional'}</span>
                    <button onClick={() => toggleStatus(course)} disabled={saving === course.id} style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: isLive ? 'rgba(15,110,86,0.1)' : 'rgba(0,0,0,0.06)', color: isLive ? '#0F6E56' : '#8A8A82' }}>{saving === course.id ? '...' : isLive ? '🟢 Live' : '⬜ Draft'}</button>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: '6px' }}>
                      <Link href={`/admin/builder?id=${course.id}`} style={{ padding: '6px 14px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>✏️ Edit</Link>
                      <button onClick={() => deleteCourse(course)} disabled={deleting === course.id} style={{ padding: '6px 14px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>{deleting === course.id ? '...' : '🗑'}</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

const th: React.CSSProperties = { textAlign: 'left', padding: '11px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const thClick: React.CSSProperties = { ...th, cursor: 'pointer', userSelect: 'none' }
const td: React.CSSProperties = { padding: '13px 16px', verticalAlign: 'middle', color: '#1A1A18' }npm