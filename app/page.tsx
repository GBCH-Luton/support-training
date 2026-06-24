// Practice pull request - testing the workflow
'use client'

import { useEffect, useState, useMemo } from 'react'
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
    if (!userLoading && user?.must_reset_password) router.push('/reset-password')
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

      const [courseLinksRes, enrolRes, deptEnrolRes] = await Promise.all([
        deptIds.length > 0
          ? supabase.from('course_departments').select('course_id').in('department_id', deptIds)
          : Promise.resolve({ data: [] as { course_id: string }[] }),
        supabase.from('enrolments').select('course_id').eq('staff_id', user!.id),
        deptIds.length > 0
          ? supabase.from('department_enrolments').select('course_id').in('department_id', deptIds)
          : Promise.resolve({ data: [] as { course_id: string }[] }),
      ])

      const deptCourseIds = (courseLinksRes.data || []).map((c) => c.course_id)
      const enrolCourseIds = (enrolRes.data || []).map((e) => e.course_id)
      const deptEnrolCourseIds = (deptEnrolRes.data || []).map((e) => e.course_id)
      const allCourseIds = [...new Set([...deptCourseIds, ...enrolCourseIds, ...deptEnrolCourseIds])]
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
        .gbch-slider { height:230px; border-radius:20px; }
        .gbch-slider-pad { padding:32px 130px 36px 36px; }
        .gbch-slider-title { font-size:22px; }
        .gbch-slider-desc { display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
        @media (max-width: 640px) {
          .gbch-grid { grid-template-columns:1fr; }
          .gbch-actions { display:${menuOpen ? 'flex' : 'none'}; flex-direction:column; align-items:stretch; width:100%; gap:8px; margin-top:10px; }
          .gbch-menu-btn { display:inline-flex; }
          .gbch-slider { height:190px; border-radius:16px; }
          .gbch-slider-pad { padding:22px 70px 28px 22px; }
          .gbch-slider-title { font-size:17px; }
          .gbch-slider-desc { display:none; }
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
            {(user.role === 'admin' || user.role === 'training_admin') && (
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

        {/* Hero slider */}
        {!loading && allowedCourses.length > 0 && (
          <HeroSlider courses={allowedCourses} statusByCourse={statusByCourse} allCourses={courses} />
        )}

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

function HeroSlider({ courses, statusByCourse, allCourses }: {
  courses: Course[]
  statusByCourse: Record<string, 'completed' | 'in_progress' | 'not_started'>
  allCourses: Course[]
}) {
  const slides = useMemo(() => {
    const order = { in_progress: 0, not_started: 1, completed: 2 }
    return [...courses]
      .sort((a, b) => (order[statusByCourse[a.id] ?? 'not_started'] ?? 1) - (order[statusByCourse[b.id] ?? 'not_started'] ?? 1))
      .slice(0, 3)
  }, [courses, statusByCourse])

  const [index, setIndex] = useState(0)
  const [fading, setFading] = useState(false)

  const safeIdx = slides.length ? index % slides.length : 0

  // Auto-advance every 5 s
  useEffect(() => {
    if (slides.length <= 1) return
    const t = setInterval(() => {
      setFading(true)
      setTimeout(() => { setIndex(i => (i + 1) % slides.length); setFading(false) }, 280)
    }, 5000)
    return () => clearInterval(t)
  }, [slides.length])

  function go(dir: number) {
    if (fading || slides.length < 2) return
    setFading(true)
    setTimeout(() => { setIndex(i => (i + dir + slides.length) % slides.length); setFading(false) }, 280)
  }

  function goTo(i: number) {
    if (i === safeIdx || fading) return
    setFading(true)
    setTimeout(() => { setIndex(i); setFading(false) }, 280)
  }

  if (!slides.length) return null

  const course = slides[safeIdx]
  const grad = CARD_GRADIENTS[allCourses.indexOf(course) % CARD_GRADIENTS.length]
  const status = statusByCourse[course.id] || 'not_started'
  const cta = status === 'in_progress' ? 'Continue →' : status === 'completed' ? 'Review →' : 'Start course →'

  return (
    <div className="gbch-slider" style={{ position:'relative', overflow:'hidden', marginBottom:'28px', background:grad }}>

      {/* Decorative orbs */}
      <div style={{ position:'absolute', right:'-60px', top:'-60px', width:'280px', height:'280px', borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:'90px', bottom:'-80px', width:'220px', height:'220px', borderRadius:'50%', background:'rgba(255,255,255,0.05)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', right:'230px', top:'0px', width:'110px', height:'110px', borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />

      {/* Large background icon */}
      <div style={{ position:'absolute', right:'28px', top:'50%', transform:'translateY(-50%)', fontSize:'120px', lineHeight:1, opacity:0.14, pointerEvents:'none', userSelect:'none' }}>
        {course.icon}
      </div>

      {/* Content — fades between slides */}
      <div className="gbch-slider-pad" style={{
        position:'relative', zIndex:1, height:'100%', display:'flex',
        flexDirection:'column', justifyContent:'center', boxSizing:'border-box',
        opacity: fading ? 0 : 1, transition:'opacity 0.28s ease',
      }}>
        {/* Badges */}
        <div style={{ display:'flex', gap:'7px', marginBottom:'11px', flexWrap:'wrap' }}>
          <span style={{ padding:'3px 11px', borderRadius:'20px', fontSize:'10px', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', background:'rgba(0,0,0,0.22)', color:'rgba(255,255,255,0.92)' }}>
            {course.type === 'mandatory' ? '⚡ Mandatory' : '✦ Optional'}
          </span>
          {status === 'in_progress' && <span style={{ padding:'3px 11px', borderRadius:'20px', fontSize:'10px', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', background:'rgba(255,255,255,0.2)', color:'#fff' }}>● In progress</span>}
          {status === 'completed'   && <span style={{ padding:'3px 11px', borderRadius:'20px', fontSize:'10px', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', background:'rgba(255,255,255,0.25)', color:'#fff' }}>✓ Completed</span>}
          {status === 'not_started' && <span style={{ padding:'3px 11px', borderRadius:'20px', fontSize:'10px', fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', background:'rgba(0,0,0,0.18)', color:'rgba(255,255,255,0.8)' }}>New</span>}
        </div>

        {/* Title */}
        <div className="gbch-slider-title" style={{ fontWeight:800, color:'#fff', lineHeight:1.2, marginBottom:'8px', textShadow:'0 2px 12px rgba(0,0,0,0.18)' }}>
          {course.title}
        </div>

        {/* Description — hidden on mobile via CSS */}
        <div className="gbch-slider-desc" style={{ fontSize:'13px', color:'rgba(255,255,255,0.78)', lineHeight:1.55, marginBottom:'18px', maxWidth:'440px' }}>
          {course.description}
        </div>

        {/* CTA */}
        <div>
          <Link href={`/courses/${course.id}`} style={{
            display:'inline-flex', alignItems:'center', gap:'6px',
            padding:'10px 22px', background:'rgba(255,255,255,0.95)',
            borderRadius:'10px', fontSize:'13px', fontWeight:700,
            textDecoration:'none', color:'#1A1A18',
            boxShadow:'0 4px 18px rgba(0,0,0,0.2)',
          }}>
            {cta}
          </Link>
        </div>
      </div>

      {/* ← arrow */}
      {slides.length > 1 && (
        <button type="button" onClick={() => go(-1)} aria-label="Previous slide"
          style={{ position:'absolute', left:'12px', top:'50%', transform:'translateY(-50%)', zIndex:2, width:'34px', height:'34px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.3)', color:'#fff', fontSize:'22px', lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ‹
        </button>
      )}

      {/* → arrow */}
      {slides.length > 1 && (
        <button type="button" onClick={() => go(1)} aria-label="Next slide"
          style={{ position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', zIndex:2, width:'34px', height:'34px', borderRadius:'50%', background:'rgba(255,255,255,0.18)', border:'1.5px solid rgba(255,255,255,0.3)', color:'#fff', fontSize:'22px', lineHeight:1, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>
          ›
        </button>
      )}

      {/* Dot indicators */}
      {slides.length > 1 && (
        <div style={{ position:'absolute', bottom:'13px', left:'50%', transform:'translateX(-50%)', display:'flex', gap:'6px', zIndex:2 }}>
          {slides.map((_, i) => (
            <button key={i} type="button" onClick={() => goTo(i)} aria-label={`Go to slide ${i + 1}`}
              style={{ width: i === safeIdx ? '22px' : '7px', height:'7px', borderRadius:'4px', border:'none', padding:0, cursor:'pointer', background: i === safeIdx ? '#fff' : 'rgba(255,255,255,0.38)', transition:'all 0.3s ease' }} />
          ))}
        </div>
      )}
    </div>
  )
}