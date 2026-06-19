'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'
import Link from 'next/link'

type Course = { id: string; title: string; description: string; type: string; pass_mark: number; icon: string; category_id: string }
type Category = { id: string; name: string; icon: string }

export default function Home() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allowedCourseIds, setAllowedCourseIds] = useState<Set<string>>(new Set())
  const [activeCat, setActiveCat] = useState('all')
  const [loading, setLoading] = useState(true)

  // Redirect to login if not signed in
  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  useEffect(() => {
    async function fetchData() {
      const { data: courseData } = await supabase.from('courses').select('*').eq('status', 'live')
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order')
      if (courseData) setCourses(courseData)
      if (catData) setCategories(catData)
      setLoading(false)
    }
    fetchData()
  }, [])

  useEffect(() => {
    if (!user) return
    async function fetchAllowed() {
      const { data: myDepts } = await supabase
        .from('staff_departments').select('department_id').eq('staff_id', user!.id)
      const deptIds = (myDepts || []).map((d) => d.department_id)
      if (deptIds.length === 0) { setAllowedCourseIds(new Set()); return }
      const { data: courseLinks } = await supabase
        .from('course_departments').select('course_id').in('department_id', deptIds)
      setAllowedCourseIds(new Set((courseLinks || []).map((c) => c.course_id)))
    }
    fetchAllowed()
  }, [user])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (userLoading) return (
    <div style={{ minHeight: '100vh', background: '#F4F3EF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <p style={{ color: '#8A8A82' }}>Loading...</p>
    </div>
  )

  if (!user) return null

  const allowedCourses = courses.filter((c) => allowedCourseIds.has(c.id))
  const visibleCourses = activeCat === 'all' ? allowedCourses : allowedCourses.filter((c) => c.category_id === activeCat)

  return (
    <div style={{ padding: '40px 5%', fontFamily: 'sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18', width: '100%' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <h1>📚 All Courses</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {user.role === 'admin' && (
            <Link href="/admin/dashboard" style={{ padding: '7px 14px', background: 'rgba(133,79,11,0.1)', color: '#854F0B', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
              ⚙️ Admin panel
            </Link>
          )}
          <Link href="/progress" style={{ padding: '7px 14px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', borderRadius: '8px', fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
            📊 My progress
          </Link>
          <div style={{ fontSize: '13px', color: '#5A5A55' }}>
            👤 <strong>{user.name}</strong>
          </div>
          <button onClick={handleSignOut}
            style={{ padding: '7px 14px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '8px', fontSize: '13px', color: '#5A5A55', cursor: 'pointer' }}>
            Sign out
          </button>
        </div>
      </div>

      {/* Category pills */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button onClick={() => setActiveCat('all')} style={pillStyle(activeCat === 'all')}>All</button>
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={pillStyle(activeCat === cat.id)}>{cat.icon} {cat.name}</button>
        ))}
      </div>

      {loading ? (
        <p>Loading courses...</p>
      ) : visibleCourses.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>📭</div>
          <p style={{ color: '#8A8A82', fontSize: '15px' }}>No courses available for your department yet.</p>
          <p style={{ color: '#8A8A82', fontSize: '13px', marginTop: '6px' }}>Ask your admin to assign courses to your department.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
          {visibleCourses.map((course) => (
            <Link key={course.id} href={`/courses/${course.id}`} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '14px', padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', textDecoration: 'none', color: 'inherit', cursor: 'pointer', display: 'block' }}>
              <div style={{ fontSize: '36px', marginBottom: '12px' }}>{course.icon}</div>
              <h3 style={{ marginBottom: '8px' }}>{course.title}</h3>
              <p style={{ fontSize: '14px', color: '#5A5A55', marginBottom: '12px', lineHeight: '1.5' }}>{course.description}</p>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px', color: '#8A8A82' }}>
                <span style={{ background: course.type === 'mandatory' ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: course.type === 'mandatory' ? '#993C1D' : '#2D5BE3', padding: '3px 9px', borderRadius: '20px', fontWeight: 600 }}>
                  {course.type === 'mandatory' ? 'Mandatory' : 'Optional'}
                </span>
                <span style={{ padding: '3px 0' }}>Pass {course.pass_mark}%</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

function pillStyle(active: boolean): React.CSSProperties {
  return { padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', border: active ? '1px solid #2D5BE3' : '1px solid rgba(0,0,0,0.14)', background: active ? '#2D5BE3' : '#FFFFFF', color: active ? '#fff' : '#5A5A55' }
}