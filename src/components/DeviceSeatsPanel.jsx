import React, { useEffect, useState } from 'react'
import { listLocalDevices, revokeLocalDevice, maxDevicesForPlan, currentDeviceRecord } from '../lib/deviceLimits'
import { getLicenseStatus, clearLicenseLocal } from '../lib/license'
import { isolateLicenseForAccount } from '../lib/licenseIsolation'

export default function DeviceSeatsPanel({ toast }) {
  const [devices, setDevices] = useState([])
  const [plan, setPlan] = useState('solo')
  const [max, setMax] = useState(1)
  const [me, setMe] = useState('')

  const reload = async () => {
    const status = await getLicenseStatus().catch(() => null)
    const p = status?.meta?.plan || status?.meta?.planId || 'solo'
    setPlan(p)
    setMax(maxDevicesForPlan(p))
    setDevices(listLocalDevices().filter((d) => !d.revoked))
    try {
      const cur = await currentDeviceRecord()
      setMe(cur.fingerprint)
    } catch {}
  }

  useEffect(() => { reload() }, [])

  return (
    <div className="form-grid">
      <h3 style={{ marginTop: 0 }}>Licence devices</h3>
      <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
        Plan <strong>{plan}</strong> allows <strong>{max}</strong> device{max === 1 ? '' : 's'}.
        Revoke a seat before signing in on another device when you hit the limit.
      </p>
      <p className="muted" style={{ fontSize: 12 }}>In use: {devices.length} / {max}</p>
      {devices.length === 0 && <p className="muted">No devices registered yet on this browser profile.</p>}
      {devices.map((d) => (
        <div key={d.fingerprint} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 6 }}>
          <code style={{ fontSize: 11 }}>{d.fingerprint}</code>
          <span className="muted" style={{ fontSize: 12 }}>{d.label || 'Device'}{d.fingerprint === me ? ' · this device' : ''}</span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => {
              revokeLocalDevice(d.fingerprint)
              toast?.('Device seat released on this browser', 'success')
              reload()
            }}
          >
            Revoke seat
          </button>
        </div>
      ))}
      <button
        type="button"
        className="btn btn-outline"
        onClick={async () => {
          if (!window.confirm('Clear licence activation from this browser? You can activate again with your key.')) return
          await clearLicenseLocal()
          try { await isolateLicenseForAccount('') } catch {}
          toast?.('Licence cleared on this browser', 'success')
          reload()
        }}
      >
        Sign out licence on this browser
      </button>
    </div>
  )
}
