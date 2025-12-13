// components/Notifications.jsx
import React, { useEffect, useState } from 'react'

/*
 Simple toast/notification system.
 Usage:
   window.enqueueNotification('Message', { variant:'success'|'error'|'info', ttl:3000 })
*/

const VARIANT_COLORS = {
  info: { bg: '#eef2ff', color: '#0b69a3' },
  success: { bg: '#ecfdf5', color: '#059669' },
  error: { bg: '#fff1f0', color: '#b91c1c' }
}

export default function Notifications() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    // expose global function once
    if (!window.enqueueNotification) {
      window.enqueueNotification = (text, opts = {}) => {
        const id = Math.random().toString(36).slice(2, 9)
        const toast = {
          id, text, variant: opts.variant || 'info', ttl: typeof opts.ttl === 'number' ? opts.ttl : 3000
        }
        setToasts(prev => [toast, ...prev])
        return id
      }
    }
    // expose dismiss
    if (!window.dismissNotification) {
      window.dismissNotification = (id) => {
        setToasts(prev => prev.filter(t => t.id !== id))
      }
    }
    return () => {
      // do not remove globals on unmount; keep available during dev
    }
  }, [])

  useEffect(() => {
    // schedule auto removal
    toasts.forEach(t => {
      if (!t._timeout) {
        t._timeout = setTimeout(() => {
          setToasts(prev => prev.filter(x => x.id !== t.id))
        }, t.ttl)
      }
    })
  }, [toasts])

  return (
    <div style={{
      position: 'fixed', top: 18, right: 18, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 10,
      pointerEvents: 'none'
    }}>
      {toasts.map(t => {
        const style = VARIANT_COLORS[t.variant] || VARIANT_COLORS.info
        return (
          <div key={t.id} style={{
            pointerEvents: 'auto',
            minWidth: 220,
            maxWidth: 360,
            background: style.bg,
            color: style.color,
            padding: '12px 14px',
            borderRadius: 10,
            boxShadow: '0 8px 24px rgba(13,38,59,0.08)',
            border: '1px solid rgba(13,38,59,0.04)',
            fontWeight: 600,
            fontSize: 14,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ marginRight: 12 }}>{t.text}</div>
            <button onClick={() => window.dismissNotification(t.id)} style={{
              border: 'none', background: 'transparent', cursor: 'pointer', color: style.color, fontSize: 16, padding: 4
            }}>×</button>
          </div>
        )
      })}
    </div>
  )
}
