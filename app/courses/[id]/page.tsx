'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

type Course = { id: string; title: string; description: string; type: string; pass_mark: number; reminder_cycle: number; icon: string }
type Section = { id: string; title: string; content: string; type: string; video_url: string; video_duration: number; slide_urls: string; sort_order: number }
type Question = { id: string; section_id: string; quiz_type: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; sort_order: number }

export default function CoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = params.id as string
  const { user, loading: userLoading } = useUser()

  const [course, setCourse] = useState<Course | null>(null)
  const [sections, setSections] = useState<Section[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)

  const [started, setStarted] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [watchedSections, setWatchedSections] = useState<Record<string, boolean>>({})
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [passedSections, setPassedSections] = useState<Record<string, boolean>>({})

  const [slideIndex, setSlideIndex] = useState(0)
  const [slidesSeen, setSlidesSeen] = useState<Record<string, boolean>>({})
  const [slideFullscreen, setSlideFullscreen] = useState(false)

  const [showQuiz, setShowQuiz] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizResult, setQuizResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [quizQ, setQuizQ] = useState(0)

  const [inFinalExam, setInFinalExam] = useState(false)
  const [examAnswers, setExamAnswers] = useState<Record<string, string>>({})
  const [examResult, setExamResult] = useState<{ score: number; passed: boolean } | null>(null)
  const [examQ, setExamQ] = useState(0)
  const [examPassedBefore, setExamPassedBefore] = useState(false)

  useEffect(() => {
    if (!userLoading && !user) router.push('/login')
  }, [user, userLoading, router])

  useEffect(() => {
    async function fetchData() {
      const { data: courseData } = await supabase.from('courses').select('*').eq('id', courseId).single()
      const { data: sectionData } = await supabase.from('course_sections').select('*').eq('course_id', courseId).order('sort_order')
      const { data: questionData } = await supabase.from('questions').select('*').eq('course_id', courseId).order('sort_order')
      if (courseData) setCourse(courseData)
      if (sectionData) setSections(sectionData)
      if (questionData) setQuestions(questionData)
      setLoading(false)
    }
    fetchData()
  }, [courseId])

  const loadProgress = useCallback(async () => {
    if (!user) return
    setPassedSections({})
    setExamPassedBefore(false)
    const { data: progress } = await supabase.from('section_progress').select('section_id, check_passed').eq('staff_id', user.id).eq('course_id', courseId)
    const passed: Record<string, boolean> = {}
    ;(progress || []).forEach((p) => { if (p.check_passed) passed[p.section_id] = true })
    setPassedSections(passed)
    const { data: exams } = await supabase.from('exam_attempts').select('passed').eq('staff_id', user.id).eq('course_id', courseId)
    setExamPassedBefore((exams || []).some((e) => e.passed))
  }, [user, courseId])
  useEffect(() => { loadProgress() }, [loadProgress])

  useEffect(() => {
    if (!started || sections.length === 0) return
    const section = sections[currentIndex]
    if (section && section.type === 'slides') setSlideIndex(0)
  }, [started, currentIndex, sections])

  useEffect(() => {
    if (!started || sections.length === 0 || showQuiz) return
    const section = sections[currentIndex]
    if (!section || section.type !== 'video' || watchedSections[section.id]) return
    setSecondsLeft(section.video_duration || 30)
    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); setWatchedSections((w) => ({ ...w, [section.id]: true })); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [started, currentIndex, sections, watchedSections, showQuiz])

  if (userLoading || loading) return <div style={pageStyle}><p>Loading course...</p></div>
  if (!user) return null
  if (!course) return <div style={pageStyle}><p>Course not found.</p><Link href="/" style={{ color: '#2D5BE3' }}>Back</Link></div>

  const sectionChecks = (sid: string) => questions.filter((q) => q.section_id === sid && q.quiz_type === 'section_check')
  const finalQuestions = questions.filter((q) => q.quiz_type === 'final_exam')
  const allSectionsPassed = sections.every((s) => passedSections[s.id])

  function goToQuiz() { setAnswers({}); setQuizResult(null); setQuizQ(0); setShowQuiz(true) }

  async function saveSectionProgress(sectionId: string, score: number, passed: boolean) {
    await supabase.from('section_progress').insert({ staff_id: user!.id, course_id: courseId, section_id: sectionId, check_score: score, check_passed: passed })
  }

  async function submitQuiz() {
    const section = sections[currentIndex]
    const qs = sectionChecks(section.id)
    if (qs.length === 0) { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); setShowQuiz(false); moveNext(); return }
    let correct = 0
    qs.forEach((q) => { if (answers[q.id] === q.correct_answer) correct++ })
    const score = Math.round((correct / qs.length) * 100)
    const passed = score >= (course?.pass_mark || 80)
    if (passed) { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, score, true) }
    setQuizResult({ score, passed })
  }

  function moveNext() {
    setShowQuiz(false); setQuizResult(null)
    if (currentIndex < sections.length - 1) setCurrentIndex(currentIndex + 1)
    else { setStarted(false); setCurrentIndex(0) }
  }

  async function submitExam() {
    let correct = 0
    finalQuestions.forEach((q) => { if (examAnswers[q.id] === q.correct_answer) correct++ })
    const score = Math.round((correct / finalQuestions.length) * 100)
    const passed = score >= (course?.pass_mark || 80)
    const { data: prev } = await supabase.from('exam_attempts').select('id').eq('staff_id', user!.id).eq('course_id', courseId)
    await supabase.from('exam_attempts').insert({ staff_id: user!.id, course_id: courseId, attempt_number: (prev?.length || 0) + 1, score, passed })
    if (passed) setExamPassedBefore(true)
    setExamResult({ score, passed })
  }

  if (inFinalExam) {
    if (examResult) {
      if (examResult.passed) {
        return (
          <div style={pageStyle}>
            <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', paddingTop: '20px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '20px', padding: '32px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ width: '48px', height: '48px', background: '#2D5BE3', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '16px', fontWeight: 700, margin: '0 auto 14px' }}>ST</div>
                <div style={{ fontSize: '11px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Support Training Platform</div>
                <div style={{ fontSize: '13px', color: '#5A5A55', marginBottom: '4px' }}>This certifies that {user.name} has completed</div>
                <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '18px' }}>{course.title}</div>
                <div style={{ width: '58px', height: '58px', borderRadius: '50%', background: 'linear-gradient(135deg,#0F6E56,#2BA870)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '20px', color: '#fff' }}>✓</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#0F6E56' }}>Score: {examResult.score}%</div>
              </div>
              <Link href="/" style={{ ...startBtn, marginTop: '20px', textDecoration: 'none', display: 'inline-block' }}>Back to courses</Link>
            </div>
          </div>
        )
      }
      const bySection = sections.map((s) => {
        const qs = finalQuestions.filter((q) => q.section_id === s.id)
        if (qs.length === 0) return null
        const correct = qs.filter((q) => examAnswers[q.id] === q.correct_answer).length
        return { section: s, pct: Math.round((correct / qs.length) * 100) }
      }).filter(Boolean) as { section: Section; pct: number }[]
      return (
        <div style={pageStyle}>
          <div style={{ maxWidth: '900px' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📊</div>
            <h1 style={{ color: '#993C1D', marginBottom: '6px' }}>Not passed — {examResult.score}%</h1>
            <p style={{ color: '#5A5A55', marginBottom: '24px' }}>You need {course.pass_mark}%. Here is how you did per section.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {bySection.map((row) => {
                const colour = row.pct >= 80 ? '#0F6E56' : row.pct >= 50 ? '#854F0B' : '#993C1D'
                const lbl = row.pct >= 80 ? 'Strong' : row.pct >= 50 ? 'Review' : 'Needs work'
                return (
                  <div key={row.section.id} style={{ background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{row.section.title}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: colour }}>{row.pct}% · {lbl}</span>
                    </div>
                    <div style={{ height: '6px', background: '#E4E2DC', borderRadius: '3px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', background: colour }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <button onClick={() => { setExamAnswers({}); setExamResult(null); setExamQ(0) }} style={startBtn}>Retake final exam</button>
            <button onClick={() => { setInFinalExam(false); setExamAnswers({}); setExamResult(null); setExamQ(0) }} style={{ ...secondaryBtn, marginLeft: '10px' }}>Back to course</button>
          </div>
        </div>
      )
    }
    const q = finalQuestions[examQ]
    const isLast = examQ === finalQuestions.length - 1
    return (
      <div style={pageStyle}>
        <button onClick={() => { setInFinalExam(false); setExamAnswers({}); setExamQ(0) }} style={backBtn}>Back to course overview</button>
        <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Final exam · Question {examQ + 1} of {finalQuestions.length} · Pass {course.pass_mark}%</div>
        <div style={{ height: '4px', background: '#E4E2DC', borderRadius: '2px', maxWidth: '900px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ width: `${(examQ / finalQuestions.length) * 100}%`, height: '100%', background: '#534AB7', transition: 'width .3s' }} />
        </div>
        <div style={{ maxWidth: '900px' }}>
          <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '18px' }}>{q.question_text}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '24px' }}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => {
              const optText = q[`option_${letter}` as keyof Question] as string
              if (!optText) return null
              const selected = examAnswers[q.id] === letter
              return (
                <button key={letter} onClick={() => setExamAnswers({ ...examAnswers, [q.id]: letter })}
                  style={{ display: 'flex', alignItems: 'center', gap: '11px', textAlign: 'left', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', border: selected ? '1.5px solid #534AB7' : '1.5px solid rgba(0,0,0,0.14)', background: selected ? 'rgba(83,74,183,0.08)' : '#FFFFFF', fontSize: '14px', color: '#1A1A18' }}>
                  <span style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, border: selected ? '2px solid #534AB7' : '2px solid #C4C4BE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#534AB7' }}>{selected ? '●' : letter.toUpperCase()}</span>
                  {optText}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {examQ > 0 && <button onClick={() => setExamQ(examQ - 1)} style={{ ...secondaryBtn, marginTop: 0 }}>Back</button>}
            {!isLast ? (
              <button onClick={() => setExamQ(examQ + 1)} disabled={!examAnswers[q.id]} style={{ ...startBtn, marginTop: 0, background: '#534AB7', opacity: !examAnswers[q.id] ? 0.4 : 1, cursor: !examAnswers[q.id] ? 'not-allowed' : 'pointer' }}>Next</button>
            ) : (
              <button onClick={submitExam} disabled={finalQuestions.some((qq) => !examAnswers[qq.id])} style={{ ...startBtn, marginTop: 0, background: '#534AB7', opacity: finalQuestions.some((qq) => !examAnswers[qq.id]) ? 0.4 : 1, cursor: finalQuestions.some((qq) => !examAnswers[qq.id]) ? 'not-allowed' : 'pointer' }}>Submit exam</button>
            )}
            <span style={{ fontSize: '12px', color: '#8A8A82', marginLeft: 'auto' }}>{finalQuestions.filter((qq) => examAnswers[qq.id]).length}/{finalQuestions.length} answered</span>
          </div>
        </div>
      </div>
    )
  }

  if (started && sections.length > 0) {
    const section = sections[currentIndex]
    const qs = sectionChecks(section.id)
    if (showQuiz) {
      if (quizResult) {
        return (
          <div style={pageStyle}>
            <div style={{ maxWidth: '900px', textAlign: 'center', paddingTop: '40px' }}>
              <div style={{ fontSize: '48px', marginBottom: '12px' }}>{quizResult.passed ? '🎉' : '😔'}</div>
              <h1 style={{ color: quizResult.passed ? '#0F6E56' : '#993C1D', marginBottom: '8px' }}>{quizResult.passed ? `Passed! ${quizResult.score}%` : `Not quite — ${quizResult.score}%`}</h1>
              <p style={{ color: '#5A5A55', marginBottom: '24px' }}>{quizResult.passed ? 'Great work — saved to your record.' : `You need ${course.pass_mark}% to pass. Review and try again.`}</p>
              {quizResult.passed ? (
                <button onClick={moveNext} style={startBtn}>{currentIndex < sections.length - 1 ? 'Continue to next section' : 'Finish sections'}</button>
              ) : (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
                  <button onClick={() => setShowQuiz(false)} style={secondaryBtn}>Review section</button>
                  <button onClick={goToQuiz} style={startBtn}>Try again</button>
                </div>
              )}
            </div>
          </div>
        )
      }
      const cq = qs[quizQ]
      const isLast = quizQ === qs.length - 1
      return (
        <div style={pageStyle}>
          <button onClick={() => setShowQuiz(false)} style={backBtn}>Back to section</button>
          <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section check · Question {quizQ + 1} of {qs.length}</div>
          <div style={{ height: '4px', background: '#E4E2DC', borderRadius: '2px', maxWidth: '900px', marginBottom: '24px', overflow: 'hidden' }}>
            <div style={{ width: `${(quizQ / qs.length) * 100}%`, height: '100%', background: '#2D5BE3', transition: 'width .3s' }} />
          </div>
          <div style={{ maxWidth: '900px' }}>
            <div style={{ fontSize: '17px', fontWeight: 700, marginBottom: '18px' }}>{cq.question_text}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '9px', marginBottom: '24px' }}>
              {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                const optText = cq[`option_${letter}` as keyof Question] as string
                if (!optText) return null
                const selected = answers[cq.id] === letter
                return (
                  <button key={letter} onClick={() => setAnswers({ ...answers, [cq.id]: letter })}
                    style={{ display: 'flex', alignItems: 'center', gap: '11px', textAlign: 'left', padding: '12px 15px', borderRadius: '12px', cursor: 'pointer', border: selected ? '1.5px solid #2D5BE3' : '1.5px solid rgba(0,0,0,0.14)', background: selected ? 'rgba(45,91,227,0.08)' : '#FFFFFF', fontSize: '14px', color: '#1A1A18' }}>
                    <span style={{ width: '20px', height: '20px', borderRadius: '50%', flexShrink: 0, border: selected ? '2px solid #2D5BE3' : '2px solid #C4C4BE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: '#2D5BE3' }}>{selected ? '●' : letter.toUpperCase()}</span>
                    {optText}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              {quizQ > 0 && <button onClick={() => setQuizQ(quizQ - 1)} style={{ ...secondaryBtn, marginTop: 0 }}>Back</button>}
              {!isLast ? (
                <button onClick={() => setQuizQ(quizQ + 1)} disabled={!answers[cq.id]} style={{ ...startBtn, marginTop: 0, opacity: !answers[cq.id] ? 0.4 : 1, cursor: !answers[cq.id] ? 'not-allowed' : 'pointer' }}>Next</button>
              ) : (
                <button onClick={submitQuiz} disabled={qs.some((qq) => !answers[qq.id])} style={{ ...startBtn, marginTop: 0, opacity: qs.some((qq) => !answers[qq.id]) ? 0.4 : 1, cursor: qs.some((qq) => !answers[qq.id]) ? 'not-allowed' : 'pointer' }}>Submit check</button>
              )}
              <span style={{ fontSize: '12px', color: '#8A8A82', marginLeft: 'auto' }}>{qs.filter((qq) => answers[qq.id]).length}/{qs.length} answered</span>
            </div>
          </div>
        </div>
      )
    }

    if (section.type === 'slides') {
      const slideList = (section.slide_urls || '').split(',').map((s) => s.trim()).filter(Boolean)
      const isLastSlide = slideIndex === slideList.length - 1
      const allSeen = slidesSeen[section.id]
      return (
        <div style={pageStyle}>
          {slideFullscreen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
              <button onClick={() => setSlideFullscreen(false)} style={{ position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>✕ Close</button>
              <img src={slideList[slideIndex]} alt={`Slide ${slideIndex + 1}`} style={{ maxWidth: '95%', maxHeight: '80vh', objectFit: 'contain', borderRadius: '8px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                <button onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} disabled={slideIndex === 0} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '15px', fontWeight: 600, cursor: slideIndex === 0 ? 'not-allowed' : 'pointer', opacity: slideIndex === 0 ? 0.4 : 1 }}>Previous</button>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>Slide {slideIndex + 1} of {slideList.length}</span>
                <button onClick={() => { if (slideIndex < slideList.length - 1) setSlideIndex(slideIndex + 1) }} disabled={slideIndex === slideList.length - 1} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 18px', fontSize: '15px', fontWeight: 600, cursor: slideIndex === slideList.length - 1 ? 'not-allowed' : 'pointer', opacity: slideIndex === slideList.length - 1 ? 0.4 : 1 }}>Next</button>
              </div>
            </div>
          )}
          <button onClick={() => setStarted(false)} style={backBtn}>Back to course overview</button>
          <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Slides · Section {currentIndex + 1} of {sections.length}</div>
          <h1 style={{ marginBottom: '18px' }}>{section.title}</h1>
          <div style={{ maxWidth: '100%' }}>
            <div style={{ position: 'relative', background: '#000', borderRadius: '12px', overflow: 'hidden', marginBottom: '14px' }}>
              <img src={slideList[slideIndex]} alt={`Slide ${slideIndex + 1}`} style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }} />
              <button onClick={() => setSlideFullscreen(true)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>⛶ Fullscreen</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
              <button onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} disabled={slideIndex === 0} style={{ ...secondaryBtn, marginTop: 0, opacity: slideIndex === 0 ? 0.4 : 1, cursor: slideIndex === 0 ? 'not-allowed' : 'pointer' }}>Previous</button>
              <span style={{ fontSize: '13px', color: '#5A5A55', fontWeight: 600 }}>Slide {slideIndex + 1} of {slideList.length}</span>
              {!isLastSlide ? (
                <button onClick={() => setSlideIndex(slideIndex + 1)} style={{ ...startBtn, marginTop: 0 }}>Next</button>
              ) : (
                <button onClick={() => setSlidesSeen((s) => ({ ...s, [section.id]: true }))} style={{ ...startBtn, marginTop: 0, background: allSeen ? '#0F6E56' : '#2D5BE3' }}>{allSeen ? '✓ All slides viewed' : 'Mark slides as viewed'}</button>
              )}
              <div style={{ display: 'flex', gap: '5px', marginLeft: 'auto' }}>
                {slideList.map((_, i) => (<div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === slideIndex ? '#2D5BE3' : i < slideIndex || allSeen ? '#0F6E56' : '#D0CEC8' }} />))}
              </div>
            </div>
            {(() => {
              const locked = !allSeen
              const btnStyle = locked ? { ...startBtn, marginTop: 0, opacity: 0.4, cursor: 'not-allowed' } : { ...startBtn, marginTop: 0 }
              const lbl = qs.length > 0 ? (locked ? 'View all slides to continue' : 'Continue to section check') : (locked ? 'View all slides to continue' : (currentIndex < sections.length - 1 ? 'Next section' : 'Finish sections'))
              return (<button onClick={async () => { if (locked) return; if (qs.length > 0) goToQuiz(); else { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); moveNext() } }} disabled={locked} style={btnStyle}>{lbl}</button>)
            })()}
          </div>
        </div>
      )
    }

    return (
      <div style={pageStyle}>
        <button onClick={() => setStarted(false)} style={backBtn}>Back to course overview</button>
        <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '20px', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.type === 'video' ? 'Video' : 'Reading'} · Section {currentIndex + 1} of {sections.length}</div>
        <h1 style={{ marginBottom: '18px' }}>{section.title}</h1>
        {section.type === 'video' ? (
          <div style={{ maxWidth: '660px', marginBottom: '24px' }}>
            <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: '12px', overflow: 'hidden' }}>
              <iframe src={section.video_url} allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
              {!watchedSections[section.id] && (
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))', padding: '28px 14px 12px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, flex: 1 }}>Watch to unlock the quiz</div>
                  <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{secondsLeft}s</div>
                </div>
              )}
            </div>
            {watchedSections[section.id] && <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '4px 11px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(15,110,86,0.1)', color: '#0F6E56' }}>✓ Video watched</div>}
          </div>
        ) : (
          <p style={{ fontSize: '15px', lineHeight: '1.85', color: '#3A3A35', maxWidth: '640px', marginBottom: '24px' }}>{section.content}</p>
        )}
        {(() => {
          const isVideo = section.type === 'video'
          const locked = isVideo && !watchedSections[section.id]
          const btnStyle = locked ? { ...startBtn, opacity: 0.4, cursor: 'not-allowed' } : startBtn
          const lbl = qs.length > 0 ? (locked ? `Watch the video first (${secondsLeft}s)` : 'Continue to section check') : (locked ? `Watch the video first (${secondsLeft}s)` : (currentIndex < sections.length - 1 ? 'Next section' : 'Finish sections'))
          return <button onClick={async () => { if (locked) return; if (qs.length > 0) goToQuiz(); else { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); moveNext() } }} disabled={locked} style={btnStyle}>{lbl}</button>
        })()}
      </div>
    )
  }

  return (
    <div style={pageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <Link href="/" style={{ color: '#2D5BE3', textDecoration: 'none', fontSize: '14px' }}>Back to all courses</Link>
        <div style={{ fontSize: '13px', color: '#5A5A55' }}>Logged in as <strong>{user.name}</strong></div>
      </div>

      <div style={{ fontSize: '52px', marginTop: '24px', marginBottom: '12px' }}>{course.icon}</div>
      <h1 style={{ marginBottom: '12px' }}>{course.title}</h1>
      <p style={{ fontSize: '16px', color: '#5A5A55', lineHeight: '1.6', maxWidth: '900px', marginBottom: '24px' }}>{course.description}</p>

      {examPassedBefore && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(15,110,86,0.1)', color: '#0F6E56', fontSize: '13px', fontWeight: 600, marginBottom: '20px' }}>✓ You have already completed this course</div>
      )}

      <div style={{ display: 'flex', gap: '12px', marginBottom: '32px' }}>
        <div style={infoTile}><div style={tileLabel}>Type</div><div style={tileValue}>{course.type === 'mandatory' ? 'Mandatory' : 'Optional'}</div></div>
        <div style={infoTile}><div style={tileLabel}>Pass mark</div><div style={tileValue}>{course.pass_mark}%</div></div>
        {course.reminder_cycle && (<div style={infoTile}><div style={tileLabel}>Renewal</div><div style={tileValue}>Every {course.reminder_cycle} months</div></div>)}
      </div>

      <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Course content · {sections.length} sections</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '900px', marginBottom: '20px' }}>
        {sections.map((section, index) => (
          <div key={section.id} style={sectionCard}>
            <div style={{ ...sectionNumber, background: passedSections[section.id] ? 'rgba(15,110,86,0.12)' : 'rgba(45,91,227,0.1)', color: passedSections[section.id] ? '#0F6E56' : '#2D5BE3' }}>{passedSections[section.id] ? '✓' : index + 1}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '14px', fontWeight: 600 }}>{section.title}</div>
              <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>{section.type === 'video' ? 'Video' : section.type === 'slides' ? 'Slides' : 'Reading'}{sectionChecks(section.id).length > 0 ? ` · ${sectionChecks(section.id).length} questions` : ''}</div>
            </div>
          </div>
        ))}
      </div>

      {finalQuestions.length > 0 && (
        <div style={{ ...sectionCard, maxWidth: '900px', marginBottom: '20px', borderColor: allSectionsPassed ? 'rgba(83,74,183,0.3)' : 'rgba(0,0,0,0.08)', opacity: allSectionsPassed ? 1 : 0.55 }}>
          <div style={{ ...sectionNumber, background: 'rgba(83,74,183,0.12)', color: '#534AB7' }}>★</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '14px', fontWeight: 600 }}>Final course exam</div>
            <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>{finalQuestions.length} questions · Pass {course.pass_mark}%{allSectionsPassed ? '' : ' · Complete all sections first'}</div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '10px' }}>
        {sections.length > 0 && <button onClick={() => { setStarted(true); setCurrentIndex(0) }} style={startBtn}>Start course</button>}
        {finalQuestions.length > 0 && allSectionsPassed && (
          <button onClick={() => { setExamAnswers({}); setExamResult(null); setExamQ(0); setInFinalExam(true) }} style={{ ...startBtn, background: '#534AB7' }}>Take final exam</button>
        )}
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { padding: '40px 5%', fontFamily: 'sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18', width: '100%' }
const infoTile: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px 16px', minWidth: '120px' }
const tileLabel: React.CSSProperties = { fontSize: '11px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
const tileValue: React.CSSProperties = { fontSize: '15px', fontWeight: 700 }
const sectionCard: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: '12px', background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', padding: '12px 14px' }
const sectionNumber: React.CSSProperties = { width: '28px', height: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }
const startBtn: React.CSSProperties = { marginTop: '28px', padding: '12px 24px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { padding: '12px 24px', background: '#FFFFFF', color: '#1A1A18', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const backBtn: React.CSSProperties = { padding: '6px 0', background: 'none', border: 'none', color: '#2D5BE3', fontSize: '14px', cursor: 'pointer' }