/**
 * Developer / operator endpoint overrides (public URLs only).
 * Real secrets (PayFast, Meta tokens, Google client secrets) stay on Render env — never in the browser.
 */
import { APP_LINKS } from '../config.js'

const KEY = 'sa_dev_config_v1'

export const DEFAULT_ENDPOINTS = {
  syncServer: APP_LINKS?.syncServer || 'https://saip-sync.onrender.com',
  licenseServer: APP_LINKS?.licenseServer || 'https://sa-invoice-license.onrender.com',
  updatesServer: APP_LINKS?.updatesServer || 'https://sa-invoice-updates.onrender.com',
  deskAppUrl: '',
  clientPortalUrl: 'https://sa-invoice-pro-client-portal.pcrepairdex.workers.dev',
  websiteUrl: APP_LINKS?.website || '',
  notes: '',
}

export function loadDevConfig() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '{}')
    return { ...DEFAULT_ENDPOINTS, ...(raw && typeof raw === 'object' ? raw : {}) }
  } catch {
    return { ...DEFAULT_ENDPOINTS }
  }
}

export function saveDevConfig(next) {
  const merged = { ...DEFAULT_ENDPOINTS, ...(next || {}) }
  // strip accidental secrets if pasted
  for (const k of Object.keys(merged)) {
    if (typeof merged[k] === 'string') merged[k] = merged[k].trim()
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(merged))
  } catch (e) {
    throw new Error('Could not save config on this device')
  }
  try {
    window.dispatchEvent(new CustomEvent('sa-dev-config', { detail: merged }))
  } catch {}
  return merged
}

export function resetDevConfig() {
  try { localStorage.removeItem(KEY) } catch {}
  try { window.dispatchEvent(new CustomEvent('sa-dev-config', { detail: { ...DEFAULT_ENDPOINTS } })) } catch {}
  return { ...DEFAULT_ENDPOINTS }
}

export function getEndpoint(name, fallback = '') {
  const cfg = loadDevConfig()
  const v = cfg[name]
  if (v != null && String(v).trim()) return String(v).replace(/\/$/, '')
  if (fallback) return String(fallback).replace(/\/$/, '')
  return String(DEFAULT_ENDPOINTS[name] || '').replace(/\/$/, '')
}

/** Render / ops secret names (documentation only — values never stored in the app). */
export const RENDER_SECRET_CHECKLIST = [
  { service: 'saip-sync', keys: ['JWT_SECRET', 'GIT_STORE_TOKEN', 'PORT'] },
  { service: 'sa-invoice-license', keys: ['ADMIN_TOKEN', 'PAYFAST_MERCHANT_ID', 'PAYFAST_MERCHANT_KEY', 'PAYFAST_PASSPHRASE', 'GOOGLE_CLIENT_ID'] },
  { service: 'sa-invoice-updates', keys: ['UPDATE_TOKEN'] },
  { service: 'desk / Pages', keys: ['(none required for static SPA)'] },
]
