'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

type Course = {
  id: string
  title: string
  description: string
  type: string
  pass_mark: number
  reminder_cycle: number
  icon: string
}

type Section = {
  id: string
  title: string
  content: string
  type: string
  video_url: string
  video_duration: number
  sort_order: number
}

export default function CoursePage() {
  const params = useParams()
  const courseId = params.id as string

  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)

  // NEW: tracks whether we're viewing the course overview or inside a section
  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [watchedSections, setWatchedSections] = useState<Record<string, boolean>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)

  useEffect(() => {
    async function fetchData() {
      const { data: courseData } = await supabase
        .from('courses').select('*').eq('id', courseId).single()

      const { data: sectionData } = await supabase
        .from('course_sections').select('*').eq('course_id', courseId).order('sort_order')

      if (courseData) setCourse(courseData)
      if (sectionData) setSections(sectionData)
      setLoading(false)
    }
    fetchData()
  }, [courseId])
  // Video watch-gate timer
  useEffect(() => {
    if (!started || sections.length === 0) return
    const section = sections[currentIndex]
    if (!section || section.type !== 'video') return
    if (watchedSections[section.id]) return // already watched

    // Start the countdown for this video
    setSecondsLeft(section.video_duration || 30)
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer)
          setWatchedSections((w) => ({ ...w, [section.id]: true }))
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [started, currentIndex, sections, watchedSections])

  if (loading) return <div style={pageStyle}><p>Loading course...</p></div>
  if (!course) return (
    <div style={pageStyle}>
      <p>Course not found.</p>
      <Link href="/" style={{ color: '#2D5BE3' }}>← Back to courses</Link>
    </div>
  )

  // ===== SECTION VIEWER (when started) =====
  if (started && sections.length > 0) {
    const section = sections[currentIndex]
    return (
      <div style={pageStyle}>
        <button onClick={() => setStarted(false)} style={backBtn}>← Back to course overview</button>

        <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          {section.type === 'video' ? '▶ Video' : '📖 Reading'} · Section {currentIndex + 1} of {sections.length}
        </div>

        <h1 style={{ marginBottom: '18px' }}>{section.title}</h1>

        {section.type === 'video' ? (
          <div style={{ maxWidth: '660px', marginBottom: '24px' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
              <iframe
                src={section.video_url}
                allowFullScreen
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
              />
              {/* Non-blocking timer bar — pointer-events:none keeps video clickable */}
              {!watchedSections[section.id] && (
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))',
                  padding: '28px 14px 12px', pointerEvents: 'none',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, flex: 1 }}>
                    Watch to unlock the next button
                  </div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>
                    {secondsLeft}s
                  </div>
                </div>
              )}
            </div>
            {watchedSections[section.id] && (
              <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(15,110,86,0.1)', color: '#0F6E56' }}>
                ✓ Video watched
              </div>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '15px', lineHeight: '1.85', color: '#3A3A35', maxWidth: '640px', marginBottom: '24px' }}>
            {section.content}
          </p>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
          {currentIndex > 0 && (
            <button onClick={() => setCurrentIndex(currentIndex - 1)} style={secondaryBtn}>← Previous</button>
          )}
          {(() => {
            const isVideo = section.type === 'video'
            const locked = isVideo && !watchedSections[section.id]
            const nextBtnStyle = locked ? { ...startBtn, opacity: 0.4, cursor: 'not-allowed' } : startBtn

            if (currentIndex < sections.length - 1) {
              return (
                <button
                  onClick={() => !locked && setCurrentIndex(currentIndex + 1)}
                  disabled={locked}
                  style={nextBtnStyle}
                >
                  {locked ? `Watch the video first (${secondsLeft}s)` : 'Next section →'}
                </button>
              )
            } else {
              return (
                <button
                  onClick={() => !locked && setStarted(false)}
                  disabled={locked}
                  style={nextBtnStyle}
                >
                  {locked ? `Watch the video first (${secondsLeft}s)` : '✓ Finish'}
                </button>
              )
            }
          })()}
        </div>
      </div>
    )
  }

  // ===== COURSE OVERVIEW (default) =====
  return (
    <div style={pageStyle}>
      <Link href="/" style={{ color: '#2D5BE3', textDecoration: 'none', fontSize: '14px' }}>
        ← Back to all courses
      </Link>

      <div style={{ fontSize: '52px', marginTop: '24px', marginBottom: '12px' }}>{course.icon}</div>
      <h1 style={{ marginBottom: '12px' }}>{course.title}</h1>
      <p style={{ fontSize: '16px', color: '#5A5A55', lineHeight: '1.6', maxWidth: '600px', marginBottom: '24px' }}>
        {course.description}
      </p>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <div style={infoTile}><div style={tileLabel}>Type</div><div style={tileValue}>{course.type === 'mandatory' ? '🔴 Mandatory' : '🔵 Optional'}</div></div>
        <div style={infoTile}><div style={tileLabel}>Pass mark</div><div style={tileValue}>{course.pass_mark}%</div></div>
        {course.reminder_cycle && (
          <div style={infoTile}><div style={tileLabel}>Renewal</div><div style={tileValue}>Every {course.reminder_cycle} months</div></div>
        )}
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Course content · {sections.length} sections</h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '600px' }}>
        {sections.map((section, index) => (
          <div key={section.id} style={sectionCard}>
            <div style={sectionNumber}>{index + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{section.title}</div>
              <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>
                {section.type === 'video' ? '▶ Video' : '📖 Reading'}
                {section.type === 'video' && section.video_duration ? ` · ${section.video_duration}s` : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {sections.length > 0 && (
        <button onClick={() => { setStarted(true); setCurrentIndex(0) }} style={startBtn}>
          Start course →
        </button>
      )}
    </div>
  )
}

const pageStyle: React.CSSProperties = { padding: '40px', fontFamily: 'sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18' }
const infoTile: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px 16px', minWidth: '120px' }
const tileLabel: React.CSSProperties = { fontSize: '11px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
const tileValue: React.CSSProperties = { fontSize: '15px', fontWeight: 700 }
const sectionCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px 14px' }
const sectionNumber: React.CSSProperties = { width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(45,91,227,0.1)', color: '#2D5BE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }
const startBtn: React.CSSProperties = { marginTop: '28px', padding: '12px 24px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { marginTop: '0', padding: '12px 24px', background: '#FFFFFF', color: '#1A1A18', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const backBtn: React.CSSProperties = { padding: '6px 0', background: 'none', border: 'none', color: '#2D5BE3', fontSize: '14px', cursor: 'pointer' }