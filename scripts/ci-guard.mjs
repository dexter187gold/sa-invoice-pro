#!/usr/bin/env node
/**
 * Permanent preflight for CI and agents.
 * Fails fast on version drift, PLACEHOLDER file damage, empty source files, and broken exports.
 */
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const errors = []

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ent.name === 'node_modules' || ent.name === 'dist' || ent.name === '.git') continue
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.(js|jsx|mjs|ts|tsx|yml|yaml|md|json)$/.test(ent.name)) out.push(p)
  }
  return out
}

// 1) PLACEHOLDER damage (never commit these)
const bad = []
for (const f of walk(path.join(root, 'src')).concat(
  walk(path.join(root, '.github')),
  [path.join(root, 'package.json'), path.join(root, 'version.json')],
)) {
  try {
    const text = fs.readFileSync(f, 'utf8').trim()
    if (text === 'PLACEHOLDER' || text === 'PLACEHOLDER_REPLACE' || /^PLACEHOLDER\b/.test(text)) {
      bad.push(path.relative(root, f))
    }
  } catch {}
}
if (bad.length) {
  errors.push('PLACEHOLDER content in: ' + bad.join(', '))
}

// 1b) Empty source files under src/ (never ship zero-byte modules)
const empty = []
for (const f of walk(path.join(root, 'src'))) {
  try {
    if (fs.statSync(f).size === 0) empty.push(path.relative(root, f))
  } catch {}
}
if (empty.length) {
  errors.push('Empty source files: ' + empty.join(', '))
}

// 2) version + exports via existing scripts
for (const script of ['scripts/check-version.mjs', 'scripts/check-exports.mjs']) {
  const r = spawnSync(process.execPath, [path.join(root, script)], { encoding: 'utf8' })
  if (r.status !== 0) {
    errors.push((r.stderr || r.stdout || script + ' failed').trim())
  }
}

// 3) Critical files must exist and be non-empty
for (const rel of [
  'src/pages/License.jsx',
  'src/pages/Settings.jsx',
  'src/lib/payments.js',
  'src/lib/db.js',
  'src/lib/backupImport.js',
  'src/worker.js',
  '.github/workflows/e2e-smoke.yml',
]) {
  const p = path.join(root, rel)
  if (!fs.existsSync(p)) errors.push('Missing critical file: ' + rel)
  else if (fs.statSync(p).size === 0) errors.push('Empty critical file: ' + rel)
}

if (errors.length) {
  console.error('[ci-guard] FAILED')
  for (const e of errors) console.error('- ' + e)
  process.exit(1)
}
console.log('[ci-guard] OK')
