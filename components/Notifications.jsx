import { useEffect, useState } from 'react'

export default function Notifications(){
  const [queue, setQueue] = useState([])

  useEffect(()=>{
    // expose a simple global helper for the prototype:
    window.enqueueNotification = (msg, opts = {}) => {
      const id = Date.now() + Math.floor(Math.random()*1000)
      const item = { id, msg, ttl: opts.ttl || 3500, variant: opts.variant || 'success' }
      setQueue(q => [...q, item])
      // return id so caller can remove early if needed
      return id
    }
    window.clearNotification = (id) => {
      setQueue(q => q.filter(x => x.id !== id))
    }
    return () => {
      delete window.enqueueNotification
      delete window.clearNotification
    }
  }, [])

  useEffect(()=>{
    if(queue.length === 0) return
    // set timers to auto-remove
    queue.forEach(item => {
      if(!item._timeout) {
        item._timeout = setTimeout(()=> {
          setQueue(q => q.filter(x => x.id !== item.id))
        }, item.ttl)
      }
    })
  }, [queue])

  if(queue.length === 0) return null
  return (
    <div style={{position:'fixed', right:16, top:16, zIndex:2000, display:'flex', flexDirection:'column', gap:10}}>
      {queue.map(n => (
        <div key={n.id} style={{
          minWidth:220, padding:'10px 14px', borderRadius:10,
          background: n.variant === 'error' ? '#d9534f' : '#0b9a4a',
          color:'#fff', boxShadow:'0 6px 20px rgba(3,7,18,0.12)', fontWeight:700
        }}>
          {n.msg}
        </div>
      ))}
    </div>
  )
}
