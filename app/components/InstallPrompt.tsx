'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isStandalone, setIsStandalone] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true
    setIsStandalone(standalone)
    if (standalone) return

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setIsIOS(ios)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (isStandalone || dismissed) return null
  if (!deferredPrompt && !isIOS) return null

  return (
    <>
      <style>{`@media (min-width:640px){.install-banner{display:none!important}}`}</style>
      <div className="install-banner" style={{
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)', maxWidth: '420px', zIndex: 9999,
        background: '#0F6E56', color: '#fff', borderRadius: '14px',
        padding: '14px 14px 14px 16px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
        display: 'flex', alignItems: 'center', gap: '12px',
        fontFamily: 'system-ui, sans-serif',
      }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '10px', background: 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
          📲
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '14px', marginBottom: '3px' }}>Install Support Training</div>
          {isIOS
            ? <div style={{ fontSize: '12px', opacity: 0.85, lineHeight: 1.4 }}>Tap the <strong>Share</strong> button then <strong>Add to Home Screen</strong></div>
            : <div style={{ fontSize: '12px', opacity: 0.85 }}>Add to your home screen for quick access</div>
          }
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={async () => {
              deferredPrompt.prompt()
              const { outcome } = await deferredPrompt.userChoice
              if (outcome === 'accepted') setDeferredPrompt(null)
              setDismissed(true)
            }}
            style={{ padding: '9px 16px', background: '#fff', color: '#0F6E56', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
            Install
          </button>
        )}
        <button
          onClick={() => setDismissed(true)}
          style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.65)', fontSize: '22px', cursor: 'pointer', padding: '2px 4px', flexShrink: 0, lineHeight: 1 }}>
          ×
        </button>
      </div>
    </>
  )
}
