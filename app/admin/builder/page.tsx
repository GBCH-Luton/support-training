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
      if (catData) { setCategories(catData); if (!categoryId && catData.length > 0) setCategoryId(catData[0].id) }

      if (courseId) {
        setLoading(true)
        const { data: course } = await supabase.from('courses').select('*').eq('id', courseId).single()
        if (course) { setTitle(course.title); setDescription(course.description || ''); setCategoryId(course.category_id); setType(course.type); setStatus(course.status); setPassMark(course.pass_mark); setReminderCycle(course.reminder_cycle || 6); setIcon(course.icon || '📖') }
        const { data: secData } = await supabase.from('course_sections').select('*').eq('course_id', courseId).order('sort_order')
        if (secData) setSections(secData)
        setLoading(false)
      }
    }
    fetchData()
  }, [courseId])

  async function saveCourse() {
    if (!title.trim()) { alert('Please enter a course title'); return }
    setSaving(true)
    const payload = { title, description, category_id: categoryId, type, status, pass_mark: passMark, reminder_cycle: type === 'mandatory' ? reminderCycle : null, icon }
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
            <label style={label}>Icon (emoji)</label>
            <input style={input} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="e.g. 🔥" />
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
        <button onClick={saveCourse} disabled={saving}
          style={{ marginTop: '8px', padding: '10px 24px', background: saved ? '#0F6E56' : '#2D5BE3', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>
          {saving ? 'Saving...' : saved ? '✓ Saved!' : currentCourseId ? 'Save changes' : 'Create course'}
        </button>
      </div>

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
                        <label style={label}>Slide image URLs (comma-separated)</label>
                        <textarea style={{ ...input, minHeight: '80px', resize: 'vertical' }} value={section.slide_urls || ''} onChange={(e) => updateSection(section.id, 'slide_urls', e.target.value)} placeholder="https://...Slide1.PNG, https://...Slide2.PNG, https://...Slide3.PNG" />
                        <div style={{ fontSize: '11px', color: '#8A8A82', marginTop: '4px' }}>Paste your Supabase storage URLs separated by commas</div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function AdminBuilder() {
  return <Suspense fallback={<div style={{ padding: '40px' }}>Loading...</div>}><BuilderInner /></Suspense>
}

const card: React.CSSProperties = { background: '#FFFFFF', border: '1px solid rgba(0,0,0,0.08)', borderRadius: '12px', padding: '20px', marginBottom: '16px' }
const cardTitle: React.CSSProperties = { fontSize: '15px', fontWeight: 700, color: '#1A1A18', marginBottom: '16px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.06)' }
const fg: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: '5px' }
const label: React.CSSProperties = { fontSize: '11px', fontWeight: 600, color: '#5A5A55', textTransform: 'uppercase', letterSpacing: '0.04em' }
const input: React.CSSProperties = { padding: '8px 11px', border: '1px solid rgba(0,0,0,0.14)', borderRadius: '8px', background: '#F8F7F4', color: '#1A1A18', fontSize: '13px', outline: 'none', width: '100%' }
const row2: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }
const iconBtn: React.CSSProperties = { padding: '4px 10px', background: 'rgba(0,0,0,0.05)', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', color: '#5A5A55' }