'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Question = {
  id: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_answer: string
  quiz_type: string
  sort_order: number
}

type Section = { id: string; title: string; type: string }

function QuestionsInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sectionId = searchParams.get('section_id')
  const courseId = searchParams.get('course_id')

  const [section, setSection] = useState<Section | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      if (!sectionId) return
      const { data: secData } = await supabase.from('course_sections').select('id, title, type').eq('id', sectionId).single()
      if (secData) setSection(secData)
      const { data: qData } = await supabase.from('questions').select('*').eq('section_id', sectionId).order('sort_order')
      if (qData) setQuestions(qData)
      setLoading(false)
    }
    fetchData()
  }, [sectionId])

  async function addQuestion(quizType: string) {
    const maxOrder = questions.length > 0 ? Math.max(...questions.map(q => q.sort_order)) + 1 : 0
    const payload = { course_id: courseId, section_id: sectionId, quiz_type: quizType, question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_answer: 'a', sort_order: maxOrder }
    const { data } = await supabase.from('questions').insert(payload).select().single()
    if (data) setQuestions([...questions, data])
  }

  async function updateQuestion(id: string, field: string, value: string) {
    setQuestions((prev) => prev.map((q) => q.id === id ? { ...q, [field]: value } : q))
    setSaving(id)
    await supabase.from('questions').update({ [field]: value }).eq('id', id)
    setSaving(null)
  }

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return
    await supabase.from('questions').delete().eq('id', id)
    setQuestions((prev) => prev.filter((q) => q.id !== id))
  }

  const sectionChecks = questions.filter(q => q.quiz_type === 'section_check')
  const finalExam = questions.filter(q => q.quiz_type === 'final_exam')

  if (loading) return <div><p>Loading questions...</p></div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>Questions</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>Section: <strong>{section?.title || '—'}</strong></p>
        </div>
        <button onClick={() => router.push(`/admin/builder?id=${courseId}`)}
          style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', fontSize: '13px', color: '#5A5A55', cursor: 'pointer' }}>
          ← Back to course
        </button>
      </div>

      {/* Section check questions */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A18' }}>📝 Section check questions</div>
            <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>Shown after the learner reads/watches this section. 2-3 questions recommended.</div>
          </div>
          <button onClick={() => addQuestion('section_check')}
            style={{ padding: '7px 14px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', border: '1px solid rgba(45,91,227,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            + Add question
          </button>
        </div>

        {sectionChecks.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#8A8A82' }}>No section check questions yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {sectionChecks.map((q, idx) => (
              <QuestionCard key={q.id} q={q} idx={idx} saving={saving} onUpdate={updateQuestion} onDelete={deleteQuestion} />
            ))}
          </div>
        )}
      </div>

      {/* Final exam questions */}
      <div style={card}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 700, color: '#1A1A18' }}>★ Final exam questions</div>
            <div style={{ fontSize: '12px', color: '#8A8A82', marginTop: '2px' }}>These appear in the final course exam. Tag them to this section for weak-area tracking.</div>
          </div>
          <button onClick={() => addQuestion('final_exam')}
            style={{ padding: '7px 14px', background: 'rgba(83,74,183,0.08)', color: '#534AB7', border: '1px solid rgba(83,74,183,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
            + Add question
          </button>
        </div>

        {finalExam.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#8A8A82' }}>No final exam questions yet.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {finalExam.map((q, idx) => (
              <QuestionCard key={q.id} q={q} idx={idx} saving={saving} onUpdate={updateQuestion} onDelete={deleteQuestion} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function QuestionCard({ q, idx, saving, onUpdate, onDelete }: {
  q: Question; idx: number
  saving: string | null
  onUpdate: (id: string, field: string, value: string) => void
  onDelete: (id: string) => void
}) {
  const letters = ['a', 'b', 'c', 'd'] as const
  return (
    <div style={{ background: '#F8F7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', background: '#F0EEE9', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'rgba(45,91,227,0.1)', color: '#2D5BE3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>{idx + 1}</div>
        <span style={{ fontSize: '12px', color: '#8A8A82', flex: 1 }}>{saving === q.id ? 'Saving...' : 'Auto-saves as you type'}</span>
        <button onClick={() => onDelete(q.id)} style={{ padding: '3px 8px', background: 'rgba(153,60,29,0.08)', color: '#993C1D', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}>🗑 Delete</button>
      </div>

      <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <label style={labelStyle}>Question text *</label>
          <input style={inputStyle} value={q.question_text} onChange={(e) => onUpdate(q.id, 'question_text', e.target.value)} placeholder="Type the question here…" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          {letters.map((letter) => (
            <div key={letter} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: q.correct_answer === letter ? '#0F6E56' : 'rgba(0,0,0,0.06)', color: q.correct_answer === letter ? '#fff' : '#5A5A55', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, flexShrink: 0, cursor: 'pointer' }}
                onClick={() => onUpdate(q.id, 'correct_answer', letter)}
                title="Click to mark as correct answer">
                {letter.toUpperCase()}
              </div>
              <input style={{ ...inputStyle, flex: 1 }} value={q[`option_${letter}` as keyof Question] as string} onChange={(e) => onUpdate(q.id, `option_${letter}`, e.target.value)} placeholder={`Option ${letter.toUpperCase()}…`} />
            </div>
          ))}
        </div>

        <div style={{ fontSize: '12px', color: q.correct_answer ? '#0F6E56' : '#993C1D', fontWeight: 600 }}>
          {q.correct_answer ? `✓ Correct answer: Option ${q.correct_answer.toUpperCase()}` : '⚠️ Click a letter circle to mark the correct answer'}
        </div>
      </div>
    </div>
  )
}

export default function AdminQuestions() {
  return <Suspense fallback={<div style={{ padding: '40px' }}>Loading...</div>}><QuestionsInner /></Suspense>
}

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const labelStyle: React.CSSProperties = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '5px' }
const inputStyle: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%' }