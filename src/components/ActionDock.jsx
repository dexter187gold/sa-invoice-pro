import React from 'react'
import { Link } from 'react-router-dom'

/**
 * Sticky action dock under page headers — more control without hunting menus.
 * items: [{ key, label, onClick?, to?, tone?: 'primary'|'secondary'|'danger'|'outline', disabled? }]
 */
export default function ActionDock({ items = [], title }) {
  if (!items.length) return null
  return (
    <div className="action-dock card" role="toolbar" aria-label={title || 'Actions'}>
      {title ? <div className="action-dock-title muted">{title}</div> : null}
      <div className="action-dock-row">
        {items.map((it) => {
          const cls =
            it.tone === 'primary'
              ? 'btn btn-primary btn-sm'
              : it.tone === 'secondary'
                ? 'btn btn-secondary btn-sm'
                : it.tone === 'danger'
                  ? 'btn btn-danger btn-sm'
                  : 'btn btn-outline btn-sm'
          if (it.to) {
            return (
              <Link key={it.key} className={cls} to={it.to} title={it.title}>
                {it.label}
              </Link>
            )
          }
          return (
            <button
              key={it.key}
              type="button"
              className={cls}
              disabled={it.disabled}
              onClick={it.onClick}
              title={it.title}
            >
              {it.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
