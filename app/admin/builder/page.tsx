'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type Category = { id: string; name: string; icon: string }
type Section = { id: string; title: string; type: string; content: string; video_url: string; video_duration: number; slide_urls: string; sort_order: number }

function BuilderInner() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const courseId = searchParams.get('id')

  const [categories, setCategories] = useState<Category[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [currentCourseId, setCurrentCourseId] = useState<string | null>(courseId)
  const [allDepartments, setAllDepartments] = useState<{ id: string; name: string; icon: string }[]>([])
  const [courseDepts, setCourseDepts] = useState<string[]>([])
  const [finalExamCount, setFinalExamCount] = useState(0)
  const [examQuestionCount, setExamQuestionCount] = useState('')

  // Course form fields
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [type, setType] = useState('mandatory')
  const [status, setStatus] = useState('draft')
  const [passMark, setPassMark] = useState(80)
  const [reminderCycle, setReminderCycle] = useState(6)
  const [icon, setIcon] = useState('📖')

  useEffect(() => {
    async function fetchData() {
      const { data: catData } = await supabase.from('categories').select('*').order('sort_order')
      const { data: deptData } = await supabase.from('departments').select('id, name, icon').order('sort_order')
      if (deptData) setAllDepartments(deptData)
      if (catData) { setCategories(catData); if (!categoryId && catData.length > 0) setCategoryId(catData[0].id) }

      if (courseId) {
        setLoading(true)
        const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
        if (course) { setTitle(course.title); setDescription(course.description || ''); setCategoryId(course.category_id); setType(course.type); setStatus(course.status); setPassMark(course.pass_mark); setReminderCycle(course.reminder_cycle || 6); setIcon(course.icon || '📖'); setExamQuestionCount(course.exam_question_count ? String(course.exam_question_count) : '') }
        const { data: secData } = await supabase.from('course_sections').select('*').eq('course_id', courseId).order('sort_order')
        if (secData) setSections(secData)
          
          const { data: feData } = await supabase.from('questions').select('id').eq('course_id', courseId).eq('quiz_type', 'final_exam')
        setFinalExamCount(feData?.length || 0)
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId])

  async function toggleDept(deptId: string) {
    if (!currentCourseId) { alert('Save the course first'); return }
    if (courseDepts.includes(deptId)) {
      await supabase.from('course_departments').delete().eq('course_id', currentCourseId).eq('department_id', deptId)
      setCourseDepts((prev) => prev.filter((d) => d !== deptId))
    } else {
      await supabase.from('course_departments').insert({ course_id: currentCourseId, department_id: deptId })
      setCourseDepts((prev) => [...prev, deptId])
    }
  }

  async function saveCourse() {
    if (!title.trim()) { alert('Please enter a course title'); return }
    setSaving(true)
    const payload = { title, description, category_id: categoryId, type, status, pass_mark: passMark, reminder_cycle: type === 'mandatory' ? reminderCycle : null, icon, exam_question_count: examQuestionCount ? parseInt(examQuestionCount) : null }
    if (currentCourseId) {
      await supabase.from('courses').update(payload).eq('id', currentCourseId)
    } else {
      const { data } = await supabase.from('courses').insert(payload).select().single()
      if (data) setCurrentCourseId(data.id)
    }
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function addSection(sectionType: string) {
    if (!currentCourseId) { alert('Save the course first'); return }
    const maxOrder = sections.length > 0 ? Math.max(...sections.map(s => s.sort_order)) + 1 : 0
    const payload: Record<string, unknown> = { course_id: currentCourseId, type: sectionType, sort_order: maxOrder, title: '', content: '', video_url: '', video_duration: 60, slide_urls: '' }
    const { data } = await supabase.from('course_sections').insert(payload).select().single()
    if (data) setSections([...sections, data])
  }

  async function updateSection(id: string, field: string, value: string | number) {
    setSections((prev) => prev.map((s) => s.id === id ? { ...s, [field]: value } : s))
    await supabase.from('course_sections').update({ [field]: value }).eq('id', id)
  }

  async function uploadPptx(sectionId: string, file: File) {
    if (!file.name.toLowerCase().endsWith('.pptx')) {
      alert('Please select a .pptx PowerPoint file')
      return
    }
    const filePath = `pptx/${sectionId}-${Date.now()}.pptx`
    const { error } = await supabase.storage.from('slides').upload(filePath, file, { upsert: true })
    if (error) {
      alert('Upload failed: ' + error.message)
      return
    }
    const { data: urlData } = supabase.storage.from('slides').getPublicUrl(filePath)
    await updateSection(sectionId, 'slide_urls', urlData.publicUrl)
    alert('PowerPoint uploaded successfully!')
  }

  async function deleteSection(id: string) {
    if (!confirm('Delete this section and all its questions?')) return
    await supabase.from('course_sections').delete().eq('id', id)
    setSections((prev) => prev.filter((s) => s.id !== id))
  }

  async function moveSection(id: string, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sections.length) return
    const newSections = [...sections]
    const tempOrder = newSections[idx].sort_order
    newSections[idx].sort_order = newSections[swapIdx].sort_order
    newSections[swapIdx].sort_order = tempOrder
    ;[newSections[idx], newSections[swapIdx]] = [newSections[swapIdx], newSections[idx]]
    setSections(newSections)
    await supabase.from('course_sections').update({ sort_order: newSections[idx].sort_order }).eq('id', newSections[idx].id)
    await supabase.from('course_sections').update({ sort_order: newSections[swapIdx].sort_order }).eq('id', newSections[swapIdx].id)
  }

  if (loading) return <div><p>Loading course...</p></div>

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ fontSize: '22px', fontWeight: 700, color: '#1A1A18', marginBottom: '4px' }}>{currentCourseId ? 'Edit course' : 'New course'}</h1>
          <p style={{ fontSize: '14px', color: '#8A8A82' }}>Fill in the details, save, then add sections below</p>
        </div>
        <button onClick={() => router.push('/admin/courses')} style={{ padding: '8px 14px', background: 'transparent', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', fontSize: '13px', color: '#5A5A55', cursor: 'pointer' }}>← All courses</button>
      </div>

      {/* Course details */}
      <div style={card}>
        <div style={cardTitle}>Course details</div>
        <div style={row2}>
          <div style={fg}>
            <label style={label}>Title *</label>
            <input style={input} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Fire Safety Essentials" />
          </div>
          <div style={fg}>
            <label style={label}>Icon</label>
            <EmojiPicker value={icon} onChange={setIcon} />
          </div>
        </div>
        <div style={fg}>
          <label style={label}>Description</label>
          <textarea style={{ ...input, minHeight: '70px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Short description shown on the course card…" />
        </div>
        <div style={row2}>
          <div style={fg}>
            <label style={label}>Category</label>
            <select style={input} value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          <div style={fg}>
            <label style={label}>Type</label>
            <select style={input} value={type} onChange={(e) => setType(e.target.value)}>
              <option value="mandatory">🔴 Mandatory</option>
              <option value="optional">🔵 Optional</option>
            </select>
          </div>
          <div style={fg}>
            <label style={label}>Pass mark (%)</label>
            <input style={input} type="number" min={50} max={100} value={passMark} onChange={(e) => setPassMark(Number(e.target.value))} />
          </div>
          {type === 'mandatory' && (
            <div style={fg}>
              <label style={label}>Renewal (months)</label>
              <input style={input} type="number" min={1} value={reminderCycle} onChange={(e) => setReminderCycle(Number(e.target.value))} />
            </div>
          )}
        </div>
        <div style={fg}>
          <label style={label}>Status</label>
          <div style={{ display: 'flex', gap: '10px' }}>
            {['draft', 'live'].map((s) => (
              <button key={s} onClick={() => setStatus(s)}
                style={{ padding: '8px 16px', borderRadius: '8px', border: `1.5px solid ${status === s ? (s === 'live' ? '#0F6E56' : '#2D5BE3') : 'rgba(0,0,0,0.14)'}`, background: status === s ? (s === 'live' ? 'rgba(15,110,86,0.08)' : 'rgba(45,91,227,0.08)') : '#fff', color: status === s ? (s === 'live' ? '#0F6E56' : '#2D5BE3') : '#5A5A55', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                {s === 'live' ? '🟢 Live' : '⬜ Draft'}
              </button>
            ))}
          </div>
        </div>
      </div>
{/* Final exam status */}
{currentCourseId && (
        <div style={{ ...card, background: finalExamCount > 0 ? 'rgba(15,110,86,0.05)' : 'rgba(133,79,11,0.06)', border: finalExamCount > 0 ? '1px solid rgba(15,110,86,0.2)' : '1px solid rgba(133,79,11,0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>{finalExamCount > 0 ? '✅' : '⚠️'}</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: finalExamCount > 0 ? '#0F6E56' : '#854F0B' }}>
                {finalExamCount > 0 ? `Final exam ready (${finalExamCount} questions in bank)` : 'No final exam yet'}
              </div>
              <div style={{ fontSize: '12px', color: '#5A5A55', marginTop: '2px' }}>
                {finalExamCount > 0
                  ? 'This course can be completed and counts toward staff KPI.'
                  : 'A course needs final exam questions to count toward completion and KPI. Add final exam questions via the 📝 Questions link on any section.'}
              </div>
            </div>
          </div>
          {finalExamCount > 0 && (
            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid rgba(0,0,0,0.06)' }}>
              <label style={label}>Random questions per attempt</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '6px', flexWrap: 'wrap' }}>
                <input
                  style={{ ...input, width: '90px' }}
                  type="number" min={1} max={finalExamCount}
                  value={examQuestionCount}
                  onChange={e => setExamQuestionCount(e.target.value)}
                  placeholder="All"
                />
                <span style={{ fontSize: '12px', color: '#5A5A55' }}>
                  {examQuestionCount && parseInt(examQuestionCount) < finalExamCount
                    ? `Staff will see ${examQuestionCount} random questions from the ${finalExamCount} in the bank — different every attempt`
                    : `Leave blank to show all ${finalExamCount} questions every time`}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: '#8A8A82', marginTop: '6px' }}>Click "Save changes" above to apply</div>
            </div>
          )}
        </div>
      )}
{/* Departments */}
{currentCourseId && (
        <div style={card}>
          <div style={cardTitle}>Available to departments</div>
          <p style={{ fontSize: '13px', color: '#8A8A82', marginBottom: '14px' }}>Select which departments can see this course. Staff only see courses for their department(s).</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {allDepartments.map((dept) => {
              const selected = courseDepts.includes(dept.id)
              return (
                <button key={dept.id} type="button" onClick={() => toggleDept(dept.id)}
                  style={{ padding: '8px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', border: selected ? '1.5px solid #0F6E56' : '1.5px solid rgba(0,0,0,0.14)', background: selected ? 'rgba(15,110,86,0.08)' : '#fff', color: selected ? '#0F6E56' : '#5A5A55' }}>
                  {selected ? '✓ ' : ''}{dept.icon} {dept.name}
                </button>
              )
            })}
          </div>
          {courseDepts.length === 0 && (
            <p style={{ fontSize: '12px', color: '#993C1D', marginTop: '10px' }}>⚠️ No departments selected — this course won&apos;t appear for any staff.</p>
          )}
        </div>
      )}

      {/* Sections */}
      {currentCourseId && (
        <div style={card}>
          <div style={cardTitle}>Sections</div>
          <p style={{ fontSize: '13px', color: '#8A8A82', marginBottom: '16px' }}>Add reading, video, or slides sections. Each section can have a check quiz (added after saving).</p>

          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            {[['reading', '📖 Reading'], ['video', '▶ Video'], ['slides', '🖼️ Slides']].map(([t, l]) => (
              <button key={t} onClick={() => addSection(t)}
                style={{ padding: '8px 14px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', border: '1px solid rgba(45,91,227,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                + {l}
              </button>
            ))}
          </div>

          {sections.length === 0 ? (
            <p style={{ color: '#8A8A82', fontSize: '13px' }}>No sections yet — add one above.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {sections.map((section, idx) => (
                <div key={section.id} style={{ background: '#F8F7F4', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '10px', overflow: 'hidden' }}>
                  {/* Section header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 14px', background: '#F0EEE9', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, padding: '2px 8px', borderRadius: '20px', background: section.type === 'video' ? 'rgba(45,91,227,0.1)' : section.type === 'slides' ? 'rgba(83,74,183,0.1)' : 'rgba(15,110,86,0.1)', color: section.type === 'video' ? '#2D5BE3' : section.type === 'slides' ? '#534AB7' : '#0F6E56' }}>
                      {section.type === 'video' ? '▶ Video' : section.type === 'slides' ? '🖼️ Slides' : '📖 Reading'}
                    </span>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: '#1A1A18', flex: 1 }}>{section.title || 'Untitled section'}</span>
                    <SectionQuestionCount sectionId={section.id} />
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {idx > 0 && <button onClick={() => moveSection(section.id, 'up')} style={iconBtn}>↑</button>}
                      {idx < sections.length - 1 && <button onClick={() => moveSection(section.id, 'down')} style={iconBtn}>↓</button>}
                      <a href={`/admin/questions?section_id=${section.id}&course_id=${currentCourseId}`} style={{ ...iconBtn, textDecoration: 'none', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3' }}>📝 Questions</a>
                      <button onClick={() => deleteSection(section.id)} style={{ ...iconBtn, color: '#993C1D', background: 'rgba(153,60,29,0.08)' }}>🗑</button>
                    </div>
                  </div>

                  {/* Section fields */}
                  <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={fg}>
                      <label style={label}>Section title</label>
                      <input style={input} value={section.title || ''} onChange={(e) => updateSection(section.id, 'title', e.target.value)} placeholder="e.g. Fire prevention basics" />
                    </div>

                    {section.type === 'reading' && (
                      <div style={fg}>
                        <label style={label}>Content</label>
                        <textarea style={{ ...input, minHeight: '120px', resize: 'vertical' }} value={section.content || ''} onChange={(e) => updateSection(section.id, 'content', e.target.value)} placeholder="Reading content for this section…" />
                      </div>
                    )}

                    {section.type === 'video' && (
                      <div style={row2}>
                        <div style={fg}>
                          <label style={label}>YouTube embed URL</label>
                          <input style={input} value={section.video_url || ''} onChange={(e) => updateSection(section.id, 'video_url', e.target.value)} placeholder="https://www.youtube.com/embed/VIDEO_ID" />
                        </div>
                        <div style={fg}>
                          <label style={label}>Watch gate (seconds)</label>
                          <input style={input} type="number" value={section.video_duration || 60} onChange={(e) => updateSection(section.id, 'video_duration', Number(e.target.value))} />
                        </div>
                      </div>
                    )}

                    {section.type === 'slides' && (
                      <div style={fg}>
                        <label style={label}>PowerPoint slides</label>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                          <label style={{ padding: '9px 16px', background: 'rgba(45,91,227,0.08)', color: '#2D5BE3', border: '1px solid rgba(45,91,227,0.2)', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>
                            📤 Upload PowerPoint (.pptx)
                            <input type="file" accept=".pptx" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPptx(section.id, f) }} />
                          </label>
                          {section.slide_urls && (
                            <span style={{ fontSize: '12px', color: '#0F6E56', fontWeight: 600 }}>✓ File uploaded</span>
                          )}
                        </div>
                        {section.slide_urls && (
                          <div style={{ fontSize: '11px', color: '#8A8A82', marginTop: '6px', wordBreak: 'break-all' }}>
                            Current file: {section.slide_urls.split('/').pop()}
                          </div>
                        )}
                        <div style={{ fontSize: '11px', color: '#8A8A82', marginTop: '6px' }}>Upload a .pptx file. Learners will view the slides with built-in navigation. To replace it, just upload a new file.</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Sticky save bar ── */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200, background: '#FFFFFF', borderTop: '1px solid rgba(0,0,0,0.10)', padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '14px', boxShadow: '0 -4px 16px rgba(0,0,0,0.07)' }}>
        <span style={{ fontSize: '13px', color: '#8A8A82' }}>
          {saved ? '✓ Changes saved' : 'Sections and departments save automatically — click here to save course details'}
        </span>
        <button onClick={saveCourse} disabled={saving}
          style={{ padding: '11px 28px', background: saved ? '#0F6E56' : '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : currentCourseId ? 'Save changes' : 'Create course'}
        </button>
      </div>

      {/* Bottom padding so content isn't hidden behind the sticky bar */}
      <div style={{ height: '72px' }} />
    </div>
  )
}

export default function AdminBuilder() {
  return <Suspense fallback={<div style={{ padding: '40px' }}>Loading...</div>}><BuilderInner /></Suspense>
}

function SectionQuestionCount({ sectionId }: { sectionId: string }) {
    const [counts, setCounts] = useState<{ section_check: number; final_exam: number } | null>(null)
  
    useEffect(() => {
      async function fetchCounts() {
        const { data } = await supabase.from('questions').select('quiz_type').eq('section_id', sectionId)
        if (data) {
          setCounts({
            section_check: data.filter(q => q.quiz_type === 'section_check').length,
            final_exam: data.filter(q => q.quiz_type === 'final_exam').length,
          })
        }
      }
      fetchCounts()
    }, [sectionId])
  
    if (!counts) return null
  
    return (
      <div style={{ display: 'flex', gap: '5px' }}>
        {counts.section_check > 0 && (
          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(133,79,11,0.1)', color: '#854F0B' }}>
            📝 {counts.section_check} check
          </span>
        )}
        {counts.final_exam > 0 && (
          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(83,74,183,0.1)', color: '#534AB7' }}>
            ★ {counts.final_exam} exam
          </span>
        )}
        {counts.section_check === 0 && counts.final_exam === 0 && (
          <span style={{ padding: '2px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: 'rgba(0,0,0,0.05)', color: '#8A8A82' }}>
            No questions yet
          </span>
        )}
      </div>
    )
  }
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
          {value || '📖'}
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
  
const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1A1A18', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const fg: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' }
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%' }
const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
const iconBtn: React.CSSProperties = { padding: '4px 10px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#5A5A55' }