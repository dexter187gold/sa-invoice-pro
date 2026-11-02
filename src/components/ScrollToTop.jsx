import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

/** Scroll window (and main shell) to top on every route change after login. */
export default function ScrollToTop() {
  const { pathname, search } = useLocation()

  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    } catch {
      try { window.scrollTo(0, 0) } catch {}
    }
    const mains = document.querySelectorAll('main, .main-content, .app-main, .shell-main, #main')
    mains.forEach((el) => {
      try { el.scrollTop = 0 } catch {}
    })
  }, [pathname, search])

  return null
}
