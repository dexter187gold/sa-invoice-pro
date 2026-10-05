import React from 'react'
import { Segmented } from './ui'

export function useMode(key, fallback = 'simple') {
  const [mode, setMode] = React.useState(() => localStorage.getItem(key) || fallback)
  const set = (m) => {
    setMode(m)
    localStorage.setItem(key, m)
  }
  return [mode, set]
}

export default function ModeToggle({ mode, onChange }) {
  return (
    <Segmented
      options={[{ id: 'simple', label: 'Simple' }, { id: 'advanced', label: 'Advanced' }]}
      value={mode === 'advanced' ? 'advanced' : 'simple'}
      onChange={onChange}
    />
  )
}
