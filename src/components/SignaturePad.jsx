import React, { useEffect, useRef, useState } from 'react'

export default function SignaturePad({ value, onChange, label = 'Client signature', height = 140 }) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const [empty, setEmpty] = useState(!value)

  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ctx = c.getContext('2d')
    const dpr = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = rect.width * dpr
    c.height = height * dpr
    ctx.scale(dpr, dpr)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--text')?.trim() || '#e5e5e5'
    if (value) {
      const img = new Image()
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, height)
      img.src = value
      setEmpty(false)
    }
  }, [height])

  const pos = (e) => {
    const c = canvasRef.current
    const r = c.getBoundingClientRect()
    const t = e.touches ? e.touches[0] : e
    return { x: t.clientX - r.left, y: t.clientY - r.top }
  }

  const start = (e) => {
    e.preventDefault()
    drawing.current = true
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  const move = (e) => {
    if (!drawing.current) return
    e.preventDefault()
    const ctx = canvasRef.current.getContext('2d')
    const p = pos(e)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    setEmpty(false)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    try {
      const data = canvasRef.current.toDataURL('image/png')
      onChange?.(data)
    } catch {}
  }

  const clear = () => {
    const c = canvasRef.current
    const ctx = c.getContext('2d')
    ctx.clearRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange?.('')
  }

  return (
    <div className="sig-pad">
      <div className="sig-pad-head">
        <label className="label" style={{ margin: 0 }}>{label}</label>
        <button type="button" className="btn btn-outline btn-sm" onClick={clear}>Clear</button>
      </div>
      <canvas
        ref={canvasRef}
        className="sig-canvas"
        style={{ height }}
        onMouseDown={start}
        onMouseMove={move}
        onMouseUp={end}
        onMouseLeave={end}
        onTouchStart={start}
        onTouchMove={move}
        onTouchEnd={end}
      />
      {empty ? <p className="sig-hint muted">Sign above with finger or mouse</p> : null}
    </div>
  )
}
