'use client'

// Temporary design preview page — delete after picking a card style
// Visit: /card-preview

const SAMPLE = {
  title: 'Fire Safety Awareness',
  description: 'Understand fire hazards, prevention methods, and evacuation procedures to keep staff and residents safe.',
  type: 'mandatory',
  pass_mark: 80,
  icon: '🔥',
}

const GRADIENTS = [
  'linear-gradient(135deg,#FF8A5B,#E5482C)',
  'linear-gradient(135deg,#6FA0F5,#1E3FB8)',
  'linear-gradient(135deg,#8F86E0,#4A3FB0)',
  'linear-gradient(135deg,#3FC9A0,#0F6E56)',
]
const STATUSES = [
  { key: 'not_started', label: 'Not started', dot: '#C4C4BE', bg: 'rgba(0,0,0,0.05)', color: '#8A8A82' },
  { key: 'in_progress', label: 'In progress', dot: '#854F0B', bg: 'rgba(133,79,11,0.1)', color: '#854F0B' },
  { key: 'completed',   label: 'Completed',   dot: '#0F6E56', bg: 'rgba(15,110,86,0.1)',  color: '#0F6E56' },
]

function StatusBadge({ s }: { s: typeof STATUSES[0] }) {
  return (
    <span style={{ display:'inline-flex', alignItems:'center', gap:'5px', background:s.bg, color:s.color, padding:'4px 10px', borderRadius:'20px', fontSize:'11px', fontWeight:600, whiteSpace:'nowrap' }}>
      <span style={{ width:'6px', height:'6px', borderRadius:'50%', background:s.dot, flexShrink:0 }} />
      {s.label}
    </span>
  )
}

// ─────────────────────────────────────────────────────────
// STYLE 1 — Gradient header band
// ─────────────────────────────────────────────────────────
function Style1({ grad, status }: { grad: string; status: typeof STATUSES[0] }) {
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', overflow:'hidden', width:'260px', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Gradient top */}
      <div style={{ background:grad, padding:'28px 20px 20px', display:'flex', flexDirection:'column', alignItems:'center', gap:'8px' }}>
        <div style={{ width:'56px', height:'56px', borderRadius:'16px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'28px' }}>
          {SAMPLE.icon}
        </div>
        <StatusBadge s={status} />
      </div>
      {/* White content */}
      <div style={{ padding:'16px 18px 18px' }}>
        <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'6px', lineHeight:1.3, color:'#1A1A18' }}>{SAMPLE.title}</div>
        <div style={{ fontSize:'12px', color:'#5A5A55', lineHeight:1.55, marginBottom:'14px', display:'-webkit-box', overflow:'hidden', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{SAMPLE.description}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', gap:'6px', alignItems:'center' }}>
            <span style={{ fontSize:'10px', fontWeight:700, background:'rgba(153,60,29,0.1)', color:'#993C1D', padding:'3px 9px', borderRadius:'20px', textTransform:'uppercase', letterSpacing:'0.04em' }}>⚡ Mandatory</span>
            <span style={{ fontSize:'11px', color:'#8A8A82' }}>Pass {SAMPLE.pass_mark}%</span>
          </div>
          <span style={{ fontSize:'12px', fontWeight:600, color:'#2D5BE3' }}>Start →</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// STYLE 2 — Full gradient card
// ─────────────────────────────────────────────────────────
function Style2({ grad, status }: { grad: string; status: typeof STATUSES[0] }) {
  return (
    <div style={{ background:grad, overflow:'hidden', width:'260px', padding:'22px 20px', boxShadow:'0 4px 20px rgba(0,0,0,0.15)', position:'relative' }}>
      {/* Decorative circle */}
      <div style={{ position:'absolute', right:'-30px', top:'-30px', width:'130px', height:'130px', borderRadius:'50%', background:'rgba(255,255,255,0.1)', pointerEvents:'none' }} />
      <div style={{ position:'absolute', left:'-20px', bottom:'-20px', width:'100px', height:'100px', borderRadius:'50%', background:'rgba(255,255,255,0.07)', pointerEvents:'none' }} />
      {/* Top row */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', position:'relative' }}>
        <div style={{ width:'48px', height:'48px', borderRadius:'14px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'24px' }}>
          {SAMPLE.icon}
        </div>
        <span style={{ fontSize:'10px', fontWeight:700, background:'rgba(255,255,255,0.2)', color:'#fff', padding:'3px 10px', borderRadius:'20px', textTransform:'uppercase', letterSpacing:'0.06em' }}>
          {status.label}
        </span>
      </div>
      {/* Content */}
      <div style={{ position:'relative' }}>
        <div style={{ fontSize:'15px', fontWeight:800, color:'#fff', lineHeight:1.3, marginBottom:'6px' }}>{SAMPLE.title}</div>
        <div style={{ fontSize:'12px', color:'rgba(255,255,255,0.75)', lineHeight:1.55, marginBottom:'16px', display:'-webkit-box', overflow:'hidden', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{SAMPLE.description}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:'10px', fontWeight:700, color:'rgba(255,255,255,0.7)', textTransform:'uppercase', letterSpacing:'0.06em' }}>⚡ Mandatory · Pass {SAMPLE.pass_mark}%</div>
          </div>
          <div style={{ padding:'7px 14px', background:'rgba(255,255,255,0.95)', borderRadius:'8px', fontSize:'12px', fontWeight:700, color:'#1A1A18' }}>Start →</div>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// STYLE 3 — Left colour stripe
// ─────────────────────────────────────────────────────────
function Style3({ grad, status }: { grad: string; status: typeof STATUSES[0] }) {
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', overflow:'hidden', width:'260px', display:'flex', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Left stripe */}
      <div style={{ width:'5px', background:grad, flexShrink:0 }} />
      {/* Content */}
      <div style={{ padding:'18px 16px', flex:1 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'10px' }}>
          <div style={{ width:'42px', height:'42px', borderRadius:'12px', background:grad, display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', flexShrink:0 }}>
            {SAMPLE.icon}
          </div>
          <StatusBadge s={status} />
        </div>
        <div style={{ fontSize:'15px', fontWeight:700, marginBottom:'5px', lineHeight:1.3, color:'#1A1A18' }}>{SAMPLE.title}</div>
        <div style={{ fontSize:'12px', color:'#5A5A55', lineHeight:1.55, marginBottom:'14px', display:'-webkit-box', overflow:'hidden', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{SAMPLE.description}</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:'10px', fontWeight:700, background:'rgba(153,60,29,0.1)', color:'#993C1D', padding:'3px 9px', borderRadius:'20px' }}>⚡ Mandatory</span>
          <span style={{ fontSize:'11px', color:'#8A8A82' }}>Pass {SAMPLE.pass_mark}%</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// STYLE 4 — Split layout
// ─────────────────────────────────────────────────────────
function Style4({ grad, status }: { grad: string; status: typeof STATUSES[0] }) {
  return (
    <div style={{ background:'#fff', border:'1px solid rgba(0,0,0,0.07)', overflow:'hidden', width:'260px', display:'flex', boxShadow:'0 2px 12px rgba(0,0,0,0.06)' }}>
      {/* Left icon block */}
      <div style={{ width:'80px', background:grad, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:'8px', padding:'16px 8px', flexShrink:0 }}>
        <div style={{ fontSize:'32px', lineHeight:1 }}>{SAMPLE.icon}</div>
        <div style={{ fontSize:'9px', fontWeight:700, color:'rgba(255,255,255,0.8)', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center', lineHeight:1.3 }}>Pass<br/>{SAMPLE.pass_mark}%</div>
      </div>
      {/* Right content */}
      <div style={{ padding:'14px 14px', flex:1, display:'flex', flexDirection:'column', justifyContent:'space-between' }}>
        <div>
          <div style={{ marginBottom:'6px' }}><StatusBadge s={status} /></div>
          <div style={{ fontSize:'14px', fontWeight:700, lineHeight:1.3, color:'#1A1A18', marginBottom:'5px' }}>{SAMPLE.title}</div>
          <div style={{ fontSize:'11px', color:'#5A5A55', lineHeight:1.5, display:'-webkit-box', overflow:'hidden', WebkitLineClamp:2, WebkitBoxOrient:'vertical' as any }}>{SAMPLE.description}</div>
        </div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:'10px' }}>
          <span style={{ fontSize:'10px', fontWeight:700, background:'rgba(153,60,29,0.1)', color:'#993C1D', padding:'3px 8px', borderRadius:'20px' }}>⚡ Mandatory</span>
          <span style={{ fontSize:'12px', fontWeight:600, color:'#2D5BE3' }}>Start →</span>
        </div>
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────
// Preview page
// ─────────────────────────────────────────────────────────
export default function CardPreview() {
  const styles = [
    { num: 1, name: 'Gradient header band', Comp: Style1 },
    { num: 2, name: 'Full gradient card',   Comp: Style2 },
    { num: 3, name: 'Left colour stripe',   Comp: Style3 },
    { num: 4, name: 'Split layout',         Comp: Style4 },
  ]

  return (
    <div style={{ fontFamily:'system-ui, sans-serif', background:'#F4F3EF', minHeight:'100vh', padding:'40px 5%', color:'#1A1A18' }}>
      <div style={{ maxWidth:'1200px', margin:'0 auto' }}>
        <h1 style={{ fontSize:'22px', fontWeight:800, marginBottom:'6px' }}>Course card designs</h1>
        <p style={{ fontSize:'14px', color:'#8A8A82', marginBottom:'40px' }}>Each style shown with all three progress states. Tell me which one you want and I'll apply it. This page will be deleted after.</p>

        {styles.map(({ num, name, Comp }) => (
          <div key={num} style={{ marginBottom:'48px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
              <div style={{ width:'30px', height:'30px', borderRadius:'8px', background:'#1A1A18', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:'14px', fontWeight:800 }}>{num}</div>
              <div>
                <div style={{ fontSize:'16px', fontWeight:700 }}>{name}</div>
              </div>
            </div>
            <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
              {STATUSES.map(s => (
                <div key={s.key}>
                  <div style={{ fontSize:'11px', fontWeight:600, color:'#8A8A82', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>{s.label}</div>
                  <Comp grad={GRADIENTS[num % GRADIENTS.length]} status={s} />
                </div>
              ))}
              {/* Extra colour sample */}
              <div>
                <div style={{ fontSize:'11px', fontWeight:600, color:'#8A8A82', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:'8px' }}>Another colour</div>
                <Comp grad={GRADIENTS[(num + 1) % GRADIENTS.length]} status={STATUSES[0]} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
