'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import { useUser } from '@/lib/useUser'

type Course = { id: string; title: string; description: string; type: string; pass_mark: number; reminder_cycle: number; icon: string; exam_question_count?: number | null; question_time_limit?: number | null }

const CARD_SOLIDS = ['#D4472A', '#1E3FB8', '#4A3FB0', '#0F6E56', '#BA7517', '#99355A']
function courseColour(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) & 0xffffffff
  return CARD_SOLIDS[Math.abs(h) % CARD_SOLIDS.length]
}
type Section = { id: string; title: string; content: string; type: string; video_url: string; video_duration: number; slide_urls: string; sort_order: number }
type Question = { id: string; section_id: string; quiz_type: string; question_text: string; option_a: string; option_b: string; option_c: string; option_d: string; correct_answer: string; sort_order: number; hint?: string }

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
  const [examQuestions, setExamQuestions] = useState<Question[]>([])
  const [shownHints, setShownHints] = useState<Set<string>>(new Set())
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  function toggleHint(id: string) {
    setShownHints(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

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

  // Reset timer when exam question changes
  useEffect(() => {
    const limit = course?.question_time_limit
    if (!limit || !inFinalExam || examResult) { setTimeLeft(null); return }
    setTimeLeft(limit)
  }, [examQ, inFinalExam, examResult, course?.question_time_limit])

  // Reset timer when section check question changes
  useEffect(() => {
    const limit = course?.question_time_limit
    if (!limit || !showQuiz || quizResult) { setTimeLeft(null); return }
    setTimeLeft(limit)
  }, [quizQ, showQuiz, quizResult, course?.question_time_limit])

  // Count down one second at a time
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return
    const t = setTimeout(() => setTimeLeft(p => p !== null ? p - 1 : null), 1000)
    return () => clearTimeout(t)
  }, [timeLeft])

  // Auto-advance (or submit) when time runs out
  useEffect(() => {
    if (timeLeft !== 0) return
    if (inFinalExam && !examResult) {
      if (examQ < examQuestions.length - 1) setExamQ(q => q + 1)
      else submitExam()
    } else if (showQuiz && !quizResult) {
      submitQuiz()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft])

  if (userLoading || loading) return <div style={pageStyle}><p>Loading course...</p></div>
  if (!user) return null
  if (!course) return <div style={pageStyle}><p>Course not found.</p><Link href="/" style={{ color: '#2D5BE3' }}>Back</Link></div>

  const sectionChecks = (sid: string) => questions.filter((q) => q.section_id === sid && q.quiz_type === 'section_check')
  const finalQuestions = questions.filter((q) => q.quiz_type === 'final_exam')
  const allSectionsPassed = sections.every((s) => passedSections[s.id])

  function goToQuiz() { setAnswers({}); setQuizResult(null); setQuizQ(0); setShowQuiz(true) }

  function startExam() {
    const bank = questions.filter(q => q.quiz_type === 'final_exam')
    const shuffled = [...bank].sort(() => Math.random() - 0.5)
    const count = course?.exam_question_count
    const selected = count && count < shuffled.length ? shuffled.slice(0, count) : shuffled
    setExamQuestions(selected)
    setExamAnswers({})
    setExamResult(null)
    setExamQ(0)
    setInFinalExam(true)
  }

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
    examQuestions.forEach((q) => { if (examAnswers[q.id] === q.correct_answer) correct++ })
    const score = Math.round((correct / examQuestions.length) * 100)
    const passed = score >= (course?.pass_mark || 80)
    const { data: prev } = await supabase.from('exam_attempts').select('id').eq('staff_id', user!.id).eq('course_id', courseId)
    await supabase.from('exam_attempts').insert({ staff_id: user!.id, course_id: courseId, attempt_number: (prev?.length || 0) + 1, score, passed })
    if (passed) setExamPassedBefore(true)
    setExamResult({ score, passed })
  }

  // ===== FINAL EXAM =====
  if (inFinalExam) {
    if (examResult) {
      if (examResult.passed) {
        return (
          <div style={pageStyle}>
            <div style={{ maxWidth: '480px', margin: '0 auto', textAlign: 'center', paddingTop: '20px' }}>
              <div style={{ background: '#FFFFFF', border: '1px solid rgba(45,91,227,0.15)', padding: '36px 28px', boxShadow: '0 8px 30px rgba(45,91,227,0.08)' }}>
                <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#0F6E56', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', fontSize: '30px', color: '#fff' }}>🏆</div>
                <div style={{ fontSize: '11px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '10px' }}>Certificate of Completion</div>
                <div style={{ fontSize: '14px', color: '#5A5A55', marginBottom: '6px' }}>This certifies that {user.name} has completed</div>
                <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '16px' }}>{course.title}</div>
                <div style={{ display: 'inline-block', padding: '8px 18px', borderRadius: '20px', background: 'rgba(15,110,86,0.1)', color: '#0F6E56', fontSize: '15px', fontWeight: 700 }}>Score: {examResult.score}%</div>
              </div>
              <Link href="/" style={{ ...primaryBtn, marginTop: '20px', textDecoration: 'none', display: 'inline-block' }}>Back to courses</Link>
            </div>
          </div>
        )
      }
      const bySection = sections.map((s) => {
        const qs = examQuestions.filter((q) => q.section_id === s.id)
        if (qs.length === 0) return null
        const correct = qs.filter((q) => examAnswers[q.id] === q.correct_answer).length
        return { section: s, pct: Math.round((correct / qs.length) * 100) }
      }).filter(Boolean) as { section: Section; pct: number }[]
      return (
        <div style={pageStyle}>
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <div style={{ fontSize: '48px', marginBottom: '8px' }}>📊</div>
            <h1 style={{ color: '#993C1D', marginBottom: '6px', fontSize: '24px' }}>Not passed — {examResult.score}%</h1>
            <p style={{ color: '#5A5A55', marginBottom: '24px' }}>You need {course.pass_mark}%. Here is how you did per section.</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
              {bySection.map((row) => {
                const colour = row.pct >= 80 ? '#0F6E56' : row.pct >= 50 ? '#854F0B' : '#993C1D'
                const lbl = row.pct >= 80 ? 'Strong' : row.pct >= 50 ? 'Review' : 'Needs work'
                return (
                  <div key={row.section.id} style={cardBox}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>{row.section.title}</span>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: colour }}>{row.pct}% · {lbl}</span>
                    </div>
                    <div style={{ height: '8px', background: '#EDEBE5', borderRadius: '4px', overflow: 'hidden' }}>
                      <div style={{ width: `${row.pct}%`, height: '100%', background: colour, borderRadius: '4px' }} />
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={startExam} style={primaryBtn}>Retake final exam</button>
              <button onClick={() => { setInFinalExam(false); setExamAnswers({}); setExamResult(null); setExamQ(0) }} style={secondaryBtn}>Back to course</button>
            </div>
          </div>
        </div>
      )
    }
    const q = examQuestions[examQ]
    const isLast = examQ === examQuestions.length - 1
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: '720px', margin: '0 auto' }}>
          <button onClick={() => { setInFinalExam(false); setExamAnswers({}); setExamQ(0) }} style={backBtn}>← Back to course</button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '6px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: 'rgba(83,74,183,0.1)', color: '#534AB7', fontSize: '12px', fontWeight: 600 }}>★ Final exam · {examQ + 1} of {examQuestions.length} · Pass {course.pass_mark}%</div>
            {timeLeft !== null && course?.question_time_limit && (() => {
              const pct = timeLeft / course.question_time_limit
              const col = pct > 0.5 ? '#0F6E56' : pct > 0.25 ? '#854F0B' : '#993C1D'
              const bg = pct > 0.5 ? 'rgba(15,110,86,0.1)' : pct > 0.25 ? 'rgba(133,79,11,0.1)' : 'rgba(153,60,29,0.1)'
              return <div style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: bg, color: col }}>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
            })()}
          </div>
          <div style={{ height: '6px', background: '#EDEBE5', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
            <div style={{ width: `${(examQ / examQuestions.length) * 100}%`, height: '100%', background: '#534AB7', transition: 'width .3s', borderRadius: '3px' }} />
          </div>
          {timeLeft !== null && course?.question_time_limit ? (
            <div style={{ height: '4px', background: '#EDEBE5', borderRadius: '3px', marginTop: '4px', marginBottom: '24px', overflow: 'hidden' }}>
              <div style={{ width: `${(timeLeft / course.question_time_limit) * 100}%`, height: '100%', background: timeLeft / course.question_time_limit > 0.5 ? '#0F6E56' : timeLeft / course.question_time_limit > 0.25 ? '#BA7517' : '#993C1D', transition: 'width 1s linear, background 0.5s', borderRadius: '3px' }} />
            </div>
          ) : (
            <div style={{ marginBottom: '24px' }} />
          )}
          <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', lineHeight: '1.4' }}>{q.question_text}</div>
          {q.hint && (
            <div style={{ marginBottom: '16px' }}>
              {shownHints.has(q.id) ? (
                <div style={{ padding: '12px 14px', background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.25)', borderRadius: '10px', fontSize: '13px', color: '#854F0B', lineHeight: 1.6 }}>
                  💡 {q.hint}
                  <button onClick={() => toggleHint(q.id)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#854F0B', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Hide</button>
                </div>
              ) : (
                <button onClick={() => toggleHint(q.id)} style={{ padding: '6px 14px', background: 'rgba(186,117,23,0.07)', color: '#854F0B', border: '1px solid rgba(186,117,23,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>💡 Show hint</button>
              )}
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
            {(['a', 'b', 'c', 'd'] as const).map((letter) => {
              const optText = q[`option_${letter}` as keyof Question] as string
              if (!optText) return null
              const selected = examAnswers[q.id] === letter
              return (
                <button key={letter} onClick={() => setExamAnswers({ ...examAnswers, [q.id]: letter })} style={optBtn(selected, '#534AB7')}>
                  <span style={optCircle(selected, '#534AB7')}>{selected ? '●' : letter.toUpperCase()}</span>
                  {optText}
                </button>
              )
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {examQ > 0 && <button onClick={() => setExamQ(examQ - 1)} style={secondaryBtn}>← Back</button>}
            {!isLast ? (
              <button onClick={() => setExamQ(examQ + 1)} disabled={!examAnswers[q.id]} style={{ ...primaryBtn, background: '#534AB7', opacity: !examAnswers[q.id] ? 0.4 : 1, cursor: !examAnswers[q.id] ? 'not-allowed' : 'pointer' }}>Next →</button>
            ) : (
              <button onClick={submitExam} disabled={!course?.question_time_limit && examQuestions.some((qq) => !examAnswers[qq.id])} style={{ ...primaryBtn, background: '#534AB7', opacity: !course?.question_time_limit && examQuestions.some((qq) => !examAnswers[qq.id]) ? 0.4 : 1, cursor: !course?.question_time_limit && examQuestions.some((qq) => !examAnswers[qq.id]) ? 'not-allowed' : 'pointer' }}>Submit exam</button>
            )}
            <span style={{ fontSize: '12px', color: '#8A8A82', marginLeft: 'auto' }}>{examQuestions.filter((qq) => examAnswers[qq.id]).length}/{examQuestions.length} answered</span>
          </div>
        </div>
      </div>
    )
  }

  // ===== SECTION VIEWER =====
  if (started && sections.length > 0) {
    const section = sections[currentIndex]
    const qs = sectionChecks(section.id)

    if (showQuiz) {
      if (quizResult) {
        return (
          <div style={pageStyle}>
            <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', paddingTop: '30px' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>{quizResult.passed ? '🎉' : '😔'}</div>
              <h1 style={{ color: quizResult.passed ? '#0F6E56' : '#993C1D', marginBottom: '8px', fontSize: '24px' }}>{quizResult.passed ? `Passed! ${quizResult.score}%` : `Not quite — ${quizResult.score}%`}</h1>
              <p style={{ color: '#5A5A55', marginBottom: '24px' }}>{quizResult.passed ? 'Great work — saved to your record.' : `You need ${course.pass_mark}% to pass. Review and try again.`}</p>
              {quizResult.passed ? (
                <button onClick={moveNext} style={primaryBtn}>{currentIndex < sections.length - 1 ? 'Continue →' : 'Finish sections'}</button>
              ) : (
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button onClick={() => setShowQuiz(false)} style={secondaryBtn}>Review section</button>
                  <button onClick={goToQuiz} style={primaryBtn}>Try again</button>
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
          <div style={{ maxWidth: '720px', margin: '0 auto' }}>
            <button onClick={() => setShowQuiz(false)} style={backBtn}>← Back to section</button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '16px', marginBottom: '6px', flexWrap: 'wrap' }}>
              <div style={{ display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: 'rgba(45,91,227,0.1)', color: '#2D5BE3', fontSize: '12px', fontWeight: 600 }}>📝 Section check · {quizQ + 1} of {qs.length}</div>
              {timeLeft !== null && course?.question_time_limit && (() => {
                const pct = timeLeft / course.question_time_limit
                const col = pct > 0.5 ? '#0F6E56' : pct > 0.25 ? '#854F0B' : '#993C1D'
                const bg = pct > 0.5 ? 'rgba(15,110,86,0.1)' : pct > 0.25 ? 'rgba(133,79,11,0.1)' : 'rgba(153,60,29,0.1)'
                return <div style={{ padding: '5px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 700, background: bg, color: col }}>⏱ {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</div>
              })()}
            </div>
            <div style={{ height: '6px', background: '#EDEBE5', borderRadius: '3px', overflow: 'hidden', marginTop: '10px' }}>
              <div style={{ width: `${(quizQ / qs.length) * 100}%`, height: '100%', background: '#2D5BE3', transition: 'width .3s', borderRadius: '3px' }} />
            </div>
            {timeLeft !== null && course?.question_time_limit ? (
              <div style={{ height: '4px', background: '#EDEBE5', borderRadius: '3px', marginTop: '4px', marginBottom: '24px', overflow: 'hidden' }}>
                <div style={{ width: `${(timeLeft / course.question_time_limit) * 100}%`, height: '100%', background: timeLeft / course.question_time_limit > 0.5 ? '#0F6E56' : timeLeft / course.question_time_limit > 0.25 ? '#BA7517' : '#993C1D', transition: 'width 1s linear, background 0.5s', borderRadius: '3px' }} />
              </div>
            ) : (
              <div style={{ marginBottom: '24px' }} />
            )}
            <div style={{ fontSize: '18px', fontWeight: 700, marginBottom: '16px', lineHeight: '1.4' }}>{cq.question_text}</div>
            {cq.hint && (
              <div style={{ marginBottom: '16px' }}>
                {shownHints.has(cq.id) ? (
                  <div style={{ padding: '12px 14px', background: 'rgba(186,117,23,0.08)', border: '1px solid rgba(186,117,23,0.25)', borderRadius: '10px', fontSize: '13px', color: '#854F0B', lineHeight: 1.6 }}>
                    💡 {cq.hint}
                    <button onClick={() => toggleHint(cq.id)} style={{ marginLeft: '10px', background: 'none', border: 'none', color: '#854F0B', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' }}>Hide</button>
                  </div>
                ) : (
                  <button onClick={() => toggleHint(cq.id)} style={{ padding: '6px 14px', background: 'rgba(186,117,23,0.07)', color: '#854F0B', border: '1px solid rgba(186,117,23,0.2)', borderRadius: '8px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>💡 Show hint</button>
                )}
              </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {(['a', 'b', 'c', 'd'] as const).map((letter) => {
                const optText = cq[`option_${letter}` as keyof Question] as string
                if (!optText) return null
                const selected = answers[cq.id] === letter
                return (
                  <button key={letter} onClick={() => setAnswers({ ...answers, [cq.id]: letter })} style={optBtn(selected, '#2D5BE3')}>
                    <span style={optCircle(selected, '#2D5BE3')}>{selected ? '●' : letter.toUpperCase()}</span>
                    {optText}
                  </button>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {quizQ > 0 && <button onClick={() => setQuizQ(quizQ - 1)} style={secondaryBtn}>← Back</button>}
              {!isLast ? (
                <button onClick={() => setQuizQ(quizQ + 1)} disabled={!answers[cq.id]} style={{ ...primaryBtn, opacity: !answers[cq.id] ? 0.4 : 1, cursor: !answers[cq.id] ? 'not-allowed' : 'pointer' }}>Next →</button>
              ) : (
                <button onClick={submitQuiz} disabled={qs.some((qq) => !answers[qq.id])} style={{ ...primaryBtn, opacity: qs.some((qq) => !answers[qq.id]) ? 0.4 : 1, cursor: qs.some((qq) => !answers[qq.id]) ? 'not-allowed' : 'pointer' }}>Submit check</button>
              )}
              <span style={{ fontSize: '12px', color: '#8A8A82', marginLeft: 'auto' }}>{qs.filter((qq) => answers[qq.id]).length}/{qs.length}</span>
            </div>
          </div>
        </div>
      )
    }

    if (section.type === 'slides') {
      const slideList = (section.slide_urls || '').split(',').map((s) => s.trim()).filter(Boolean)
      const isPptx = slideList.length === 1 && slideList[0].toLowerCase().endsWith('.pptx')

      if (isPptx) {
        const officeUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(slideList[0])}`
        const seen = slidesSeen[section.id]
        return (
          <div style={pageStyle}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
              <button onClick={() => setStarted(false)} style={backBtn}>← Back to overview</button>
              <div style={{ marginTop: '16px', marginBottom: '6px', display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: 'rgba(83,74,183,0.1)', color: '#534AB7', fontSize: '12px', fontWeight: 600 }}>🖼️ Slides · Section {currentIndex + 1} of {sections.length}</div>
              <h1 style={{ marginBottom: '16px', fontSize: '22px' }}>{section.title}</h1>
              <div style={{ position: 'relative', borderRadius: '0', overflow: 'hidden', background: '#000', marginBottom: '16px' }}>
                <iframe src={officeUrl} style={{ width: '100%', height: '500px', border: 'none', display: 'block' }} allowFullScreen />
              </div>
              <p style={{ fontSize: '13px', color: '#8A8A82', marginBottom: '16px' }}>Use the arrows in the slide viewer above to move through the slides. When you have viewed them all, mark this section complete.</p>
              {!seen ? (
                <button onClick={() => setSlidesSeen((s) => ({ ...s, [section.id]: true }))} style={primaryBtn}>✓ I confirm I have viewed all the slides</button>
              ) : (
                <button onClick={async () => { if (qs.length > 0) goToQuiz(); else { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); moveNext() } }} style={{ ...primaryBtn, background: '#0F6E56' }}>
                  {qs.length > 0 ? 'Continue to section check →' : (currentIndex < sections.length - 1 ? 'Next section →' : 'Finish sections')}
                </button>
              )}
            </div>
          </div>
        )
      }

      const isLastSlide = slideIndex === slideList.length - 1
      const allSeen = slidesSeen[section.id]
      return (
        <div style={pageStyle}>
          {slideFullscreen && (
            <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
              <button onClick={() => setSlideFullscreen(false)} style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '10px', padding: '10px 18px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>✕ Close</button>
              <img src={slideList[slideIndex]} alt={`Slide ${slideIndex + 1}`} style={{ maxWidth: '96%', maxHeight: '78vh', objectFit: 'contain', borderRadius: '10px' }} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                <button onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} disabled={slideIndex === 0} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '15px', fontWeight: 600, cursor: slideIndex === 0 ? 'not-allowed' : 'pointer', opacity: slideIndex === 0 ? 0.4 : 1 }}>← Prev</button>
                <span style={{ color: '#fff', fontSize: '14px', fontWeight: 600 }}>{slideIndex + 1} / {slideList.length}</span>
                <button onClick={() => { if (slideIndex < slideList.length - 1) setSlideIndex(slideIndex + 1) }} disabled={slideIndex === slideList.length - 1} style={{ background: 'rgba(255,255,255,0.15)', color: '#fff', border: 'none', borderRadius: '10px', padding: '12px 20px', fontSize: '15px', fontWeight: 600, cursor: slideIndex === slideList.length - 1 ? 'not-allowed' : 'pointer', opacity: slideIndex === slideList.length - 1 ? 0.4 : 1 }}>Next →</button>
              </div>
            </div>
          )}
          <div style={{ maxWidth: '900px', margin: '0 auto' }}>
            <button onClick={() => setStarted(false)} style={backBtn}>← Back to overview</button>
            <div style={{ marginTop: '16px', marginBottom: '6px', display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: 'rgba(83,74,183,0.1)', color: '#534AB7', fontSize: '12px', fontWeight: 600 }}>🖼️ Slides · Section {currentIndex + 1} of {sections.length}</div>
            <h1 style={{ marginBottom: '16px', fontSize: '22px' }}>{section.title}</h1>
            <div style={{ position: 'relative', background: '#000', borderRadius: '0', overflow: 'hidden', marginBottom: '14px' }}>
              <img src={slideList[slideIndex]} alt={`Slide ${slideIndex + 1}`} style={{ width: '100%', maxHeight: '440px', objectFit: 'contain', display: 'block' }} />
              <button onClick={() => setSlideFullscreen(true)} style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '10px', padding: '8px 14px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>⛶ Fullscreen</button>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button onClick={() => setSlideIndex(Math.max(0, slideIndex - 1))} disabled={slideIndex === 0} style={{ ...secondaryBtn, opacity: slideIndex === 0 ? 0.4 : 1, cursor: slideIndex === 0 ? 'not-allowed' : 'pointer' }}>← Prev</button>
              <span style={{ fontSize: '13px', color: '#5A5A55', fontWeight: 600 }}>Slide {slideIndex + 1} of {slideList.length}</span>
              {!isLastSlide ? (
                <button onClick={() => setSlideIndex(slideIndex + 1)} style={primaryBtn}>Next →</button>
              ) : (
                <button onClick={() => setSlidesSeen((s) => ({ ...s, [section.id]: true }))} style={{ ...primaryBtn, background: allSeen ? '#0F6E56' : undefined }}>{allSeen ? '✓ Viewed' : 'Mark as viewed'}</button>
              )}
              <div style={{ display: 'flex', gap: '6px', marginLeft: 'auto' }}>
                {slideList.map((_, i) => (<div key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: i === slideIndex ? '#2D5BE3' : i < slideIndex || allSeen ? '#0F6E56' : '#D0CEC8' }} />))}
              </div>
            </div>
            {(() => {
              const locked = !allSeen
              const lbl = qs.length > 0 ? (locked ? 'View all slides to continue' : 'Continue to section check →') : (locked ? 'View all slides to continue' : (currentIndex < sections.length - 1 ? 'Next section →' : 'Finish sections'))
              return (<button onClick={async () => { if (locked) return; if (qs.length > 0) goToQuiz(); else { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); moveNext() } }} disabled={locked} style={{ ...primaryBtn, opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>{lbl}</button>)
            })()}
          </div>
        </div>
      )
    }

    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: '760px', margin: '0 auto' }}>
          <button onClick={() => setStarted(false)} style={backBtn}>← Back to overview</button>
          <div style={{ marginTop: '16px', marginBottom: '6px', display: 'inline-block', padding: '5px 12px', borderRadius: '20px', background: section.type === 'video' ? 'rgba(45,91,227,0.1)' : 'rgba(15,110,86,0.1)', color: section.type === 'video' ? '#2D5BE3' : '#0F6E56', fontSize: '12px', fontWeight: 600 }}>{section.type === 'video' ? '▶ Video' : '📖 Reading'} · Section {currentIndex + 1} of {sections.length}</div>
          <h1 style={{ marginBottom: '18px', fontSize: '22px' }}>{section.title}</h1>
          {section.type === 'video' ? (
            <div style={{ marginBottom: '24px' }}>
              <div style={{ position: 'relative', paddingBottom: '56.25%', background: '#000', borderRadius: '0', overflow: 'hidden' }}>
                <iframe src={section.video_url} allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }} />
                {!watchedSections[section.id] && (
                  <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0))', padding: '28px 14px 12px', pointerEvents: 'none', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ color: '#fff', fontSize: '13px', fontWeight: 600, flex: 1 }}>Watch to unlock the quiz</div>
                    <div style={{ color: '#fff', fontSize: '16px', fontWeight: 700 }}>{secondsLeft}s</div>
                  </div>
                )}
              </div>
              {watchedSections[section.id] && <div style={{ marginTop: '10px', display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, background: 'rgba(15,110,86,0.1)', color: '#0F6E56' }}>✓ Video watched</div>}
            </div>
          ) : (
            <div style={{ ...cardBox, fontSize: '15px', lineHeight: '1.85', color: '#3A3A35', marginBottom: '24px' }}>{section.content}</div>
          )}
          {(() => {
            const isVideo = section.type === 'video'
            const locked = isVideo && !watchedSections[section.id]
            const lbl = qs.length > 0 ? (locked ? `Watch the video first (${secondsLeft}s)` : 'Continue to section check →') : (locked ? `Watch the video first (${secondsLeft}s)` : (currentIndex < sections.length - 1 ? 'Next section →' : 'Finish sections'))
            return <button onClick={async () => { if (locked) return; if (qs.length > 0) goToQuiz(); else { setPassedSections((p) => ({ ...p, [section.id]: true })); await saveSectionProgress(section.id, 100, true); moveNext() } }} disabled={locked} style={{ ...primaryBtn, opacity: locked ? 0.4 : 1, cursor: locked ? 'not-allowed' : 'pointer' }}>{lbl}</button>
          })()}
        </div>
      </div>
    )
  }

  // ===== COURSE OVERVIEW =====
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: '900px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
          <Link href="/" style={{ color: '#2D5BE3', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }}>← All courses</Link>
          <div style={{ fontSize: '13px', color: '#5A5A55' }}>Logged in as <strong>{user.name}</strong></div>
        </div>

        <div style={{ background: courseColour(courseId), padding: '28px', color: '#fff', marginBottom: '20px' }}>
          <div style={{ fontSize: '46px', marginBottom: '10px' }}>{course.icon}</div>
          <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '8px' }}>{course.title}</h1>
          <p style={{ fontSize: '15px', color: 'rgba(255,255,255,0.9)', lineHeight: '1.5', maxWidth: '600px' }}>{course.description}</p>
          {examPassedBefore && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(255,255,255,0.2)', color: '#fff', fontSize: '13px', fontWeight: 600, marginTop: '14px' }}>✓ You have completed this course</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={infoTile}><div style={tileLabel}>Type</div><div style={tileValue}>{course.type === 'mandatory' ? '🔴 Mandatory' : '🔵 Optional'}</div></div>
          <div style={infoTile}><div style={tileLabel}>Pass mark</div><div style={tileValue}>{course.pass_mark}%</div></div>
          {course.reminder_cycle && (<div style={infoTile}><div style={tileLabel}>Renewal</div><div style={tileValue}>Every {course.reminder_cycle} months</div></div>)}
        </div>

        <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>Course content · {sections.length} sections</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
          {sections.map((section, index) => (
            <div key={section.id} style={{ ...cardBox, display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: passedSections[section.id] ? '#0F6E56' : 'rgba(45,91,227,0.1)', color: passedSections[section.id] ? '#fff' : '#2D5BE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, flexShrink: 0 }}>{passedSections[section.id] ? '✓' : index + 1}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: 600 }}>{section.title}</div>
                <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>{section.type === 'video' ? '▶ Video' : section.type === 'slides' ? '🖼️ Slides' : '📖 Reading'}{sectionChecks(section.id).length > 0 ? ` · ${sectionChecks(section.id).length} questions` : ''}</div>
              </div>
            </div>
          ))}
        </div>

        {finalQuestions.length > 0 && (
          <div style={{ ...cardBox, display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '24px', opacity: allSectionsPassed ? 1 : 0.6, border: allSectionsPassed ? '1px solid rgba(83,74,183,0.3)' : undefined }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '11px', background: '#534AB7', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', flexShrink: 0 }}>★</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>Final course exam</div>
              <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>
                {course.exam_question_count && course.exam_question_count < finalQuestions.length
                  ? `${course.exam_question_count} random questions from a bank of ${finalQuestions.length} · Pass ${course.pass_mark}%`
                  : `${finalQuestions.length} questions · Pass ${course.pass_mark}%`}
                {allSectionsPassed ? '' : ' · 🔒 Complete all sections first'}
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {sections.length > 0 && <button onClick={() => { setStarted(true); setCurrentIndex(0) }} style={primaryBtn}>Start course →</button>}
          {finalQuestions.length > 0 && allSectionsPassed && (
            <button onClick={startExam} style={{ ...primaryBtn, background: '#534AB7' }}>★ Take final exam</button>
          )}
        </div>
      </div>
    </div>
  )
}

const pageStyle: React.CSSProperties = { padding: '24px 5%', fontFamily: 'system-ui, sans-serif', background: '#F4F3EF', minHeight: '100vh', color: '#1A1A18', width: '100%' }
const cardBox: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '0', padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }
const infoTile: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.07)', borderRadius: '0', padding: '12px 18px', minWidth: '110px', flex: '1 1 auto' }
const tileLabel: React.CSSProperties = { fontSize: '11px', color: '#8A8A82', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }
const tileValue: React.CSSProperties = { fontSize: '15px', fontWeight: 700 }
const primaryBtn: React.CSSProperties = { padding: '13px 26px', background: '#2D5BE3', color: '#fff', border: 'none', borderRadius: '0', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const secondaryBtn: React.CSSProperties = { padding: '13px 24px', background: '#FFFFFF', color: '#1A1A18', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '0', fontSize: '15px', fontWeight: 600, cursor: 'pointer' }
const backBtn: React.CSSProperties = { padding: '8px 0', background: 'none', border: 'none', color: '#2D5BE3', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }

function optBtn(selected: boolean, color: string): React.CSSProperties {
  return { display: 'flex', alignItems: 'center', gap: '12px', textAlign: 'left', padding: '15px 16px', borderRadius: '0', cursor: 'pointer', border: selected ? `2px solid ${color}` : '2px solid rgba(0,0,0,0.1)', background: selected ? `${color}0F` : '#FFFFFF', fontSize: '15px', color: '#1A1A18', width: '100%' }
}
function optCircle(selected: boolean, color: string): React.CSSProperties {
  return { width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0, border: selected ? `2px solid ${color}` : '2px solid #C4C4BE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700, color: color }
}