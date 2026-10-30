import { useEffect, useRef } from 'react'

/**
 * Multi-touch + swipe gestures for SA Invoice Pro shell.
 * - Swipe right from left edge → main menu
 * - Swipe left → close menus
 * - Swipe up → new invoice
 * - Swipe down → home
 * - 2-finger tap → main menu
 * - 3-finger tap → command centre
 */
export default function GestureLayer({
  onOpenMenu,
  onCloseMenu,
  onOpenCommand,
  onCreate,
  enabled = true,
}) {
  const start = useRef(null)

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return

    const EDGE = 28
    const MIN = 56

    const onStart = (e) => {
      if (!e.touches?.length) return
      const tag = (e.target && e.target.tagName) || ''
      if (/INPUT|TEXTAREA|SELECT|OPTION/.test(tag)) return
      if (e.target?.isContentEditable) return

      const t0 = e.touches[0]
      start.current = {
        x: t0.clientX,
        y: t0.clientY,
        t: Date.now(),
        n: e.touches.length,
        edge: t0.clientX <= EDGE,
      }
    }

    const onEnd = (e) => {
      const s = start.current
      start.current = null
      if (!s) return
      const touch = e.changedTouches?.[0]
      if (!touch) return
      const dx = touch.clientX - s.x
      const dy = touch.clientY - s.y
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      const dt = Date.now() - s.t

      if (s.n >= 2 && adx < 24 && ady < 24 && dt < 350) {
        if (s.n >= 3) onOpenCommand?.()
        else onOpenMenu?.()
        return
      }

      if (dt > 900) return
      if (adx < MIN && ady < MIN) return

      if (adx > ady) {
        if (dx > MIN && (s.edge || s.x < 80)) onOpenMenu?.()
        else if (dx < -MIN) onCloseMenu?.()
        return
      }

      if (dy < -MIN) onCreate?.('/invoices/new')
      else if (dy > MIN) onCreate?.('/')
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchend', onEnd, { passive: true })
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchend', onEnd)
    }
  }, [enabled, onOpenMenu, onCloseMenu, onOpenCommand, onCreate])

  return null
}
