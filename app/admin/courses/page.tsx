'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Course = {
  id: string; title: string; description: string
  type: string; status: string; pass_mark: number
  icon: string; category_id: string
}
type Category = { id: string; name: string; icon: string }

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      const { data: courseData } = await supabase.from('courses').select('*').order('title')
      const { data: catData } = await supabase.from('categories').select('*')
      if (courseData) setCourses(courseData)
      if (catData) setCategories(catData)
      setLoading(false)
    }
    fetchData()
  }, [])

  async function toggleStatus(course: Course) {
    const newStatus = course.status === 'live' ? 'draft' : 'live'
    setSaving(course.id)
    await supabase.from('courses').update({ status: newStatus }).eq('id', course.id)
    setCourses((prev) => prev.map((c) => c.id === course.id ? { ...c, status: newStatus } : c))
    setSaving(null)
  }

  const getCat = (id: string) => categories.find((c) => c.id === id)

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>All courses</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>{courses.length} courses total · {courses.filter(c => c.status === 'live').length} live</p>
        </div>
        <Link href="/admin/builder" style={{ padding: '10px 18px', background: '#2D5BE3', color: '#fff', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
          + New course
        </Link>
      </div>

      {loading ? <p>Loading...</p> : (
        <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ background: '#F8F7F4', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={th}>Course</th>
                <th style={th}>Category</th>
                <th style={th}>Type</th>
                <th style={th}>Pass mark</th>
                <th style={th}>Status</th>
                <th style={th}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => {
                const cat = getCat(course.category_id)
                const isLive = course.status === 'live'
                return (
                  <tr key={course.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px' }}>{course.icon}</span>
                        <div>
                          <div style={{ fontWeight: 600, color: '#1A1A18' }}>{course.title}</div>
                          <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>{course.description?.slice(0, 60)}...</div>
                        </div>
                      </div>
                    </td>
                    <td style={td}>
                      <span style={{ fontSize: '12px', color: '#5A5A55' }}>{cat?.icon} {cat?.name || '—'}</span>
                    </td>
                    <td style={td}>
                      <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: course.type === 'mandatory' ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: course.type === 'mandatory' ? '#993C1D' : '#2D5BE3' }}>
                        {course.type === 'mandatory' ? 'Mandatory' : 'Optional'}
                      </span>
                    </td>
                    <td style={td}>{course.pass_mark}%</td>
                    <td style={td}>
                      <button
                        onClick={() => toggleStatus(course)}
                        disabled={saving === course.id}
                        style={{ padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, border: 'none', cursor: 'pointer', background: isLive ? 'rgba(15,110,86,0.1)' : 'rgba(0,0,0,0.06)', color: isLive ? '#0F6E56' : '#8A8A82' }}
                      >
                        {saving === course.id ? '...' : isLive ? '🟢 Live' : '⬜ Draft'}
                      </button>
                    </td>
                    <td style={td}>
                      <Link href={`/admin/builder?id=${course.id}`} style={{ padding: '5px 12px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '6px', fontSize: '12px', fontWeight: 600, textDecoration: 'none' }}>
                        ✏️ Edit
                      </Link>
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

const th: React.CSSProperties = { textAlign: 'left', padding: '10px 16px', fontSize: '11px', fontWeight: 700, color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em' }
const td: React.CSSProperties = { padding: '12px 16px', verticalAlign: 'middle', color: '#1A1A18' }