#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const localesDir = path.join(rootDir, 'src', 'locales')
const sourceDir = path.join(rootDir, 'src')
const trackerPath = path.join(rootDir, 'tracker.json')
const localeFiles = ['en.json', 'fr.json', 'ar.json']

const SOURCE_EXT = new Set(['.vue', '.ts', '.js', '.mjs', '.cjs'])
const SKIP_DIRS = new Set(['locales', 'node_modules', 'dist', 'coverage'])

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'))

const writeJson = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 4)}\n`)
}

const flattenKeys = (value, prefix = '') => {
  const keys = []
  if (!isPlainObject(value)) {
    if (prefix) keys.push(prefix)
    return keys
  }

  for (const [key, nested] of Object.entries(value)) {
    const next = prefix ? `${prefix}.${key}` : key
    if (isPlainObject(nested)) keys.push(...flattenKeys(nested, next))
    else keys.push(next)
  }

  return keys
}

const walkSourceFiles = (dir, files = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue
      walkSourceFiles(fullPath, files)
      continue
    }
    if (SOURCE_EXT.has(path.extname(entry.name))) files.push(fullPath)
  }
  return files
}

const CALL_RE =
  /\b(?:\$t|i18n\.t|(?<![.\w])(?:t|te))\(\s*(['"`])([^'"`]*?)\1/g
const STRING_RE = /(['"`])([a-zA-Z][a-zA-Z0-9_.]*)\1/g

const collectUsedKeys = (en) => {
  const knownKeys = new Set(flattenKeys(en))
  const used = new Set()
  const prefixes = new Set()
  const files = walkSourceFiles(sourceDir)

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8')

    CALL_RE.lastIndex = 0
    for (const match of text.matchAll(CALL_RE)) {
      const raw = match[2]
      const interpolationIndex = raw.indexOf('${')
      if (interpolationIndex >= 0) {
        const prefix = raw.slice(0, interpolationIndex)
        if (prefix) prefixes.add(prefix)
        continue
      }
      if (knownKeys.has(raw)) used.add(raw)
    }

    STRING_RE.lastIndex = 0
    for (const match of text.matchAll(STRING_RE)) {
      const raw = match[2]
      if (knownKeys.has(raw)) used.add(raw)
    }
  }

  for (const key of knownKeys) {
    for (const prefix of prefixes) {
      if (key.startsWith(prefix)) used.add(key)
    }
  }

  return { used, prefixes: [...prefixes].sort() }
}

const treeFromKeys = (keys) => {
  const tree = {}
  for (const key of [...keys].sort()) {
    const parts = key.split('.')
    let cursor = tree
    for (let i = 0; i < parts.length; i += 1) {
      const part = parts[i]
      if (i === parts.length - 1) {
        cursor[part] = true
      } else {
        if (!isPlainObject(cursor[part])) cursor[part] = {}
        cursor = cursor[part]
      }
    }
  }
  return tree
}

const pruneLocale = (locale, used) => {
  const visit = (value, prefix) => {
    if (!isPlainObject(value)) return used.has(prefix) ? value : undefined

    const next = {}
    for (const [key, nested] of Object.entries(value)) {
      const pathKey = prefix ? `${prefix}.${key}` : key
      const kept = visit(nested, pathKey)
      if (kept !== undefined) next[key] = kept
    }

    return Object.keys(next).length ? next : undefined
  }

  return visit(locale, '') || {}
}

const scan = () => {
  const en = readJson(path.join(localesDir, 'en.json'))
  const { used, prefixes } = collectUsedKeys(en)
  const allKeys = flattenKeys(en)
  const tracker = {
    prefixes,
    keys: [...used].sort(),
    tree: treeFromKeys(used),
  }
  writeJson(trackerPath, tracker)
  return {
    usedCount: used.size,
    totalCount: allKeys.length,
    unusedCount: allKeys.length - used.size,
    prefixes,
  }
}

const prune = () => {
  if (!fs.existsSync(trackerPath)) {
    throw new Error(`Missing ${path.relative(rootDir, trackerPath)}. Run without --prune first.`)
  }

  const tracker = readJson(trackerPath)
  const used = new Set(tracker.keys || [])
  const counts = {}

  for (const fileName of localeFiles) {
    const filePath = path.join(localesDir, fileName)
    const locale = readJson(filePath)
    const before = flattenKeys(locale).length
    const pruned = pruneLocale(locale, used)
    const after = flattenKeys(pruned).length
    writeJson(filePath, pruned)
    counts[fileName] = { before, after, removed: before - after }
  }

  return counts
}

const arg = process.argv[2]
const scanResult = scan()
console.log(
  `Tracker written with ${scanResult.usedCount} used keys of ${scanResult.totalCount} (${scanResult.unusedCount} unused).`,
)
if (scanResult.prefixes.length) {
  console.log(`Dynamic prefixes kept: ${scanResult.prefixes.join(', ')}`)
}

if (arg === '--prune') {
  const counts = prune()
  for (const [fileName, count] of Object.entries(counts)) {
    console.log(
      `Pruned ${fileName}: ${count.before} → ${count.after} (removed ${count.removed})`,
    )
  }
}
