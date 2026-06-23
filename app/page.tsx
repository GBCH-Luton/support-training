// Practice pull request - testing the workflow
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'
import Link from 'next/link'

type Course = { id: string; title: string; description: string; type: string; pass_mark: number; icon: string; category_id: string }
type Category = { id: string; name: string; icon: string }

const GRADIENTS: Record<string, string> = {
  coral: 'linear-gradient(135deg,#FF8A5B,#E5482C)',
  blue: 'linear-gradient(135deg,#6FA0F5,#1E3FB8)',
  purple: 'linear-gradient(135deg,#8F86E0,#4A3FB0)',
  teal: 'linear-gradient(135deg,#3FC9A0,#0F6E56)',
  amber: 'linear-gradient(135deg,#F5B948,#BA7517)',
  pink: 'linear-gradient(135deg,#E87BA5,#99355A)',
}
const CARD_GRADIENTS = [GRADIENTS.coral, GRADIENTS.blue, GRADIENTS.purple, GRADIENTS.teal, GRADIENTS.amber, GRADIENTS.pink]

export default function Home() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [courses, setCourses] = useState<Course[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [allowedCourseIds, setAllowedCourseIds] = useState<Set<string>>(new Set())
  const [statusByCourse, setStatusByCourse] = useState<Record<string, 'completed' | 'in_progress' | 'not_started'>>({})
  const [activeCat, setActiveCat] = useState('all')
  const [loading, setLoading] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)

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
    async function fetchAllowedAndStatus() {
      const { data: myDepts } = await supabase
        .from('staff_departments').select('department_id').eq('staff_id', user!.id)
      const deptIds = (myDepts || []).map((d) => d.department_id)

      const [courseLinksRes, enrolRes] = await Promise.all([
        deptIds.length > 0
          ? supabase.from('course_departments').select('course_id').in('department_id', deptIds)
          : Promise.resolve({ data: [] as { course_id: string }[] }),
        supabase.from('enrolments').select('course_id').eq('staff_id', user!.id),
      ])

      const deptCourseIds = (courseLinksRes.data || []).map((c) => c.course_id)
      const enrolCourseIds = (enrolRes.data || []).map((e) => e.course_id)
      const allCourseIds = [...new Set([...deptCourseIds, ...enrolCourseIds])]
      setAllowedCourseIds(new Set(allCourseIds))

      const { data: exams } = await supabase.from('exam_attempts').select('course_id, passed').eq('staff_id', user!.id)
      const { data: progress } = await supabase.from('section_progress').select('course_id').eq('staff_id', user!.id)
      const status: Record<string, 'completed' | 'in_progress' | 'not_started'> = {}
      const passedCourses = new Set((exams || []).filter((e) => e.passed).map((e) => e.course_id))
      const startedCourses = new Set((progress || []).map((p) => p.course_id))
      allCourseIds.forEach((courseId) => {
        if (passedCourses.has(courseId)) status[courseId] = 'completed'
        else if (startedCourses.has(courseId)) status[courseId] = 'in_progress'
        else status[courseId] = 'not_started'
      })
      setStatusByCourse(status)
    }
    fetchAllowedAndStatus()
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
    <div style={{ fontFamily: 'system-ui, sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18' }}>
      <style>{`
        .gbch-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:16px; }
        .gbch-wrap { padding:24px 5%; max-width:1400px; margin:0 auto; }
        .gbch-header { display:flex; align-items:center; justify-content:space-between; gap:12px; margin-bottom:20px; flex-wrap:wrap; }
        .gbch-actions { display:flex; align-items:center; gap:10px; }
        .gbch-menu-btn { display:none; }
        @media (max-width: 640px) {
          .gbch-grid { grid-template-columns:1fr; }
          .gbch-actions { display:${menuOpen ? 'flex' : 'none'}; flex-direction:column; align-items:stretch; width:100%; gap:8px; margin-top:10px; }
          .gbch-menu-btn { display:inline-flex; }
        }
      `}</style>

      <div className="gbch-wrap">
        {/* Header */}
        <div className="gbch-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: 'linear-gradient(135deg,#6FA0F5,#2D5BE3)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '14px', fontWeight: 700 }}>ST</div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700 }}>My Courses</div>
              <div style={{ fontSize: '12px', color: '#8A8A82' }}>Welcome back, {user.name.split(' ')[0]}</div>
            </div>
          </div>

          <button className="gbch-menu-btn" onClick={() => setMenuOpen(!menuOpen)}
            style={{ padding: '8px 12px', background: '#fff', border: '1px solid rgba(0,0,0,0.12)', borderRadius: '8px', fontSize: '18px', cursor: 'pointer' }}>
            ☰
          </button>

          <div className="gbch-actions">
            {user.role === 'admin' && (
              <Link href="/admin/dashboard" style={{ padding: '8px 14px', background: 'rgba(133,79,11,0.1)', color: '#854F0B', borderRadius: '9px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
                ⚙️ Admin panel
              </Link>
            )}
            <Link href="/progress" style={{ padding: '8px 14px', background: 'rgba(45,91,227,0.1)', color: '#2D5BE3', borderRadius: '9px', fontSize: '13px', fontWeight: 600, textDecoration: 'none', textAlign: 'center' }}>
              📊 My progress
            </Link>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', background: '#fff', borderRadius: '9px', border: '1px solid rgba(0,0,0,0.08)' }}>
              <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'linear-gradient(135deg,#8F86E0,#4A3FB0)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '12px', fontWeight: 700 }}>{user.name.charAt(0)}</div>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{user.name}</span>
            </div>
            <button onClick={handleSignOut}
              style={{ padding: '8px 14px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '9px', fontSize: '13px', color: '#5A5A55', cursor: 'pointer' }}>
              Sign out
            </button>
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap', overflowX: 'auto', paddingBottom: '4px' }}>
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
          </div>
        ) : (
          <div className="gbch-grid">
            {visibleCourses.map((course, i) => {
              const status = statusByCourse[course.id] || 'not_started'
              const grad = CARD_GRADIENTS[i % CARD_GRADIENTS.length]
              return (
                <Link key={course.id} href={`/courses/${course.id}`}
                  style={{ background: '#FFFFFF', borderRadius: '18px', padding: '20px', boxShadow: '0 3px 16px rgba(0,0,0,0.06)', border: '1px solid rgba(0,0,0,0.05)', textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform .15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                    <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: grad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>{course.icon}</div>
                    <StatusBadge status={status} />
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '6px' }}>{course.title}</div>
                  <div style={{ fontSize: '13px', color: '#5A5A55', lineHeight: '1.55', marginBottom: '14px' }}>{course.description}</div>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <span style={{ background: course.type === 'mandatory' ? 'rgba(153,60,29,0.1)' : 'rgba(45,91,227,0.1)', color: course.type === 'mandatory' ? '#993C1D' : '#2D5BE3', padding: '4px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
                      {course.type === 'mandatory' ? 'Mandatory' : 'Optional'}
                    </span>
                    <span style={{ fontSize: '12px', color: '#8A8A82' }}>Pass {course.pass_mark}%</span>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: 'completed' | 'in_progress' | 'not_started' }) {
  if (status === 'completed') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(15,110,86,0.1)', color: '#0F6E56', padding: '5px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#0F6E56' }} /> Completed
    </span>
  )
  if (status === 'in_progress') return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(133,79,11,0.1)', color: '#854F0B', padding: '5px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#854F0B' }} /> In progress
    </span>
  )
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: 'rgba(0,0,0,0.05)', color: '#8A8A82', padding: '5px 11px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
      <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#C4C4BE' }} /> Not started
    </span>
  )
}

function pillStyle(active: boolean): React.CSSProperties {
  return { padding: '7px 15px', borderRadius: '20px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap', border: active ? '1px solid #2D5BE3' : '1px solid rgba(0,0,0,0.12)', background: active ? '#2D5BE3' : '#FFFFFF', color: active ? '#fff' : '#5A5A55' }
}