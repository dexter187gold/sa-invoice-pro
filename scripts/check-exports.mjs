#!/usr/bin/env node
/** Fail build if a named import is not exported (Cloudflare/Vite guard). */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.join(__dirname, '..', 'src')

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) walk(p, out)
    else if (/\.(js|jsx|mjs)$/.test(ent.name)) out.push(p)
  }
  return out
}

function exportsOf(text) {
  const names = new Set()
  for (const m of text.matchAll(/export\s+(?:async\s+)?function\s+(\w+)/g)) names.add(m[1])
  for (const m of text.matchAll(/export\s+class\s+(\w+)/g)) names.add(m[1])
  for (const m of text.matchAll(/export\s+(?:const|let|var)\s+(\w+)/g)) names.add(m[1])
  for (const m of text.matchAll(/export\s+\{([^}]+)\}/gs)) {
    for (let part of m[1].split(',')) {
      part = part.trim()
      if (!part) continue
      if (part.includes(' as ')) names.add(part.split(' as ').pop().trim())
      else names.add(part.split(/\s+/)[0])
    }
  }
  return names
}

const files = walk(srcRoot)
const exportMap = new Map()
for (const f of files) {
  const rel = path.relative(srcRoot, f).replace(/\\/g, '/')
  exportMap.set(rel, exportsOf(fs.readFileSync(f, 'utf8')))
}

const importRe = /import\s+\{([^}]+)\}\s+from\s+['"](\.[^'"]+)['"]/g
let errors = 0
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8')
  const fromRel = path.relative(srcRoot, f).replace(/\\/g, '/')
  let m
  while ((m = importRe.exec(text))) {
    const names = m[1].split(',').map((s) => s.trim().split(/\s+as\s+/)[0].trim()).filter(Boolean)
    const spec = m[2]
    const base = path.dirname(f)
    const joined = path.join(base, spec)
    const candidates = path.extname(joined)
      ? [joined]
      : [joined + '.js', joined + '.jsx', path.join(joined, 'index.js')]
    let targetRel = null
    let targetExports = null
    for (const c of candidates) {
      const rel = path.relative(srcRoot, path.resolve(c)).replace(/\\/g, '/')
      if (exportMap.has(rel)) {
        targetRel = rel
        targetExports = exportMap.get(rel)
        break
      }
    }
    if (!targetRel) continue
    for (const n of names) {
      if (!targetExports.has(n)) {
        console.error(`[export-check] ${fromRel} imports "${n}" from ${targetRel} — not exported`)
        errors++
      }
    }
  }
}

if (errors) {
  console.error(`\n[export-check] ${errors} missing export(s) — fix before vite build`)
  process.exit(1)
}
console.log(`[export-check] OK — ${files.length} files`)
