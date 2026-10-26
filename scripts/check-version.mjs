#!/usr/bin/env node
/** Keep the release version consistent across package, app metadata, README, and changelog. */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const app = JSON.parse(fs.readFileSync(path.join(root, 'version.json'), 'utf8'))
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')
const changelog = fs.readFileSync(path.join(root, 'CHANGELOG.md'), 'utf8')
const errors = []

if (!pkg.version) errors.push('package.json is missing version')
if (app.version !== pkg.version) {
  errors.push(`version.json (${app.version}) does not match package.json (${pkg.version})`)
}
const readmeVersion = readme.match(/^# SA Invoice Pro (\d+\.\d+\.\d+)/m)?.[1]
if (readmeVersion !== pkg.version) {
  errors.push(`README title version (${readmeVersion || 'missing'}) does not match package.json (${pkg.version})`)
}
const changelogVersion = changelog.match(/^## (\d+\.\d+\.\d+)/m)?.[1]
if (changelogVersion !== pkg.version) {
  errors.push(`latest changelog version (${changelogVersion || 'missing'}) does not match package.json (${pkg.version})`)
}

if (errors.length) {
  console.error('[version-check] FAILED')
  for (const error of errors) console.error(`- ${error}`)
  process.exit(1)
}
console.log(`[version-check] OK — ${pkg.version}`)
