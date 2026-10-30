import React, { useEffect, useState } from 'react'
import {
  loadGesturePrefs,
  saveGesturePrefs,
  DEFAULT_GESTURE_PREFS,
  loadBioPrefs,
  setupBiometric,
  disableBiometric,
  verifyBiometric,
  biometricSupported,
} from '../lib/deviceAccess'

const GESTURE_OPTIONS = [
  ['swipeMenu', 'Swipe right from left edge → main menu'],
  ['swipeClose', 'Swipe left → close menus'],
  ['swipeUpCreate', 'Swipe up → new invoice'],
  ['swipeDownHome', 'Swipe down → home'],
  ['twoFingerMenu', 'Two-finger tap → main menu'],
  ['threeFingerCommand', 'Three-finger tap → command centre'],
]

export default function DeviceAccessPanel({ toast, userLabel }) {
  const [gesturePrefs, setGesturePrefs] = useState(() => loadGesturePrefs())
  const [bioPrefs, setBioPrefs] = useState(() => loadBioPrefs())
  const [bioBusy, setBioBusy] = useState(false)
  const [bioOk, setBioOk] = useState(null)

  useEffect(() => {
    let alive = true
    biometricSupported()
      .then((ok) => { if (alive) setBioOk(!!ok) })
      .catch(() => { if (alive) setBioOk(false) })
    return () => { alive = false }
  }, [])

  return (
    <div className="form-grid">
      <h3 style={{ marginTop: 0 }}>Biometrics (this device)</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Optional Face ID / fingerprint / Windows Hello. Off until you set it up.
        {bioOk === false ? ' This device or browser does not report a platform authenticator.' : ''}
        {bioOk === null ? ' Checking device…' : ''}
      </p>
      <p className="muted" style={{ fontSize: 12 }}>
        Status: {bioPrefs.enabled ? 'Enabled' : 'Not set up'}
        {bioPrefs.setupAt ? ` · since ${new Date(bioPrefs.setupAt).toLocaleString()}` : ''}
      </p>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button
          type="button"
          className="btn btn-primary"
          disabled={bioBusy || bioOk === false}
          onClick={async () => {
            setBioBusy(true)
            try {
              const next = await setupBiometric(userLabel || 'SA Invoice Pro')
              setBioPrefs(next)
              toast?.('Biometrics enabled on this device', 'success')
            } catch (e) {
              toast?.(e?.message || 'Biometric setup failed', 'error')
            } finally {
              setBioBusy(false)
            }
          }}
        >
          {bioBusy ? 'Waiting…' : bioPrefs.enabled ? 'Re-register biometrics' : 'Set up biometrics'}
        </button>
        {bioPrefs.enabled ? (
          <>
            <button
              type="button"
              className="btn btn-outline"
              disabled={bioBusy}
              onClick={async () => {
                setBioBusy(true)
                try {
                  await verifyBiometric()
                  toast?.('Biometric check OK', 'success')
                } catch (e) {
                  toast?.(e?.message || 'Check failed', 'error')
                } finally {
                  setBioBusy(false)
                }
              }}
            >
              Test unlock
            </button>
            <button
              type="button"
              className="btn btn-outline"
              disabled={bioBusy}
              onClick={() => {
                setBioPrefs(disableBiometric())
                toast?.('Biometrics disabled on this device', 'success')
              }}
            >
              Turn off
            </button>
          </>
        ) : null}
      </div>

      <h3 style={{ marginTop: 20 }}>Gestures (opt-in)</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        All gestures stay <strong>off</strong> until you enable them. Nothing intercepts navigation by default.
      </p>
      <label style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          type="checkbox"
          checked={!!gesturePrefs.enabled}
          onChange={(e) => setGesturePrefs(saveGesturePrefs({ ...gesturePrefs, enabled: e.target.checked }))}
        />
        Enable gesture controls on this device
      </label>
      {GESTURE_OPTIONS.map(([key, label]) => (
        <label key={key} style={{ display: 'flex', gap: 8, alignItems: 'center', opacity: gesturePrefs.enabled ? 1 : 0.55 }}>
          <input
            type="checkbox"
            disabled={!gesturePrefs.enabled}
            checked={!!gesturePrefs[key]}
            onChange={(e) => setGesturePrefs(saveGesturePrefs({ ...gesturePrefs, [key]: e.target.checked }))}
          />
          {label}
        </label>
      ))}
      <button
        type="button"
        className="btn btn-outline btn-sm"
        onClick={() => setGesturePrefs(saveGesturePrefs({ ...DEFAULT_GESTURE_PREFS }))}
      >
        Reset gestures (all off)
      </button>
    </div>
  )
}
