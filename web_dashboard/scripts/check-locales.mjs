#!/usr/bin/env node

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const localesDir = path.join(rootDir, 'src', 'locales')
const sourceLocale = 'en'
const sourcePath = path.join(localesDir, `${sourceLocale}.json`)

const readJson = (filePath) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (error) {
    throw new Error(`Unable to read ${path.relative(rootDir, filePath)}: ${error.message}`)
  }
}

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const valueType = (value) => {
  if (Array.isArray(value)) return 'array'
  if (value === null) return 'null'
  return typeof value
}

const compareLocaleShape = (source, target, currentPath = '') => {
  const missing = []
  const extra = []
  const mismatched = []

  if (!isPlainObject(source) || !isPlainObject(target)) {
    if (valueType(source) !== valueType(target)) {
      mismatched.push({
        path: currentPath || '<root>',
        expected: valueType(source),
        actual: valueType(target),
      })
    }

    return { missing, extra, mismatched }
  }

  for (const key of Object.keys(source)) {
    const keyPath = currentPath ? `${currentPath}.${key}` : key

    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      missing.push(keyPath)
      continue
    }

    const sourceValue = source[key]
    const targetValue = target[key]

    if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      const nested = compareLocaleShape(sourceValue, targetValue, keyPath)
      missing.push(...nested.missing)
      extra.push(...nested.extra)
      mismatched.push(...nested.mismatched)
      continue
    }

    if (valueType(sourceValue) !== valueType(targetValue)) {
      mismatched.push({
        path: keyPath,
        expected: valueType(sourceValue),
        actual: valueType(targetValue),
      })
    }
  }

  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      extra.push(currentPath ? `${currentPath}.${key}` : key)
    }
  }

  return { missing, extra, mismatched }
}

const formatList = (label, values) => {
  if (!values.length) return []

  return [`  ${label}:`, ...values.map((value) => `    - ${value}`)]
}

const main = () => {
  const source = readJson(sourcePath)
  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((fileName) => fileName.endsWith('.json') && fileName !== `${sourceLocale}.json`)
    .sort()

  const failures = []

  for (const fileName of localeFiles) {
    const localePath = path.join(localesDir, fileName)
    const locale = readJson(localePath)
    const result = compareLocaleShape(source, locale)
    const mismatchLines = result.mismatched.map(
      (mismatch) =>
        `${mismatch.path} (expected ${mismatch.expected}, got ${mismatch.actual})`,
    )

    if (result.missing.length || result.extra.length || mismatchLines.length) {
      failures.push([
        `${fileName} does not match ${sourceLocale}.json`,
        ...formatList('Missing keys', result.missing),
        ...formatList('Extra keys', result.extra),
        ...formatList('Type mismatches', mismatchLines),
      ])
    }
  }

  if (failures.length) {
    console.error('Locale key check failed.\n')
    console.error(failures.map((failure) => failure.join('\n')).join('\n\n'))
    process.exit(1)
  }

  console.log(`Locale key check passed for ${localeFiles.length} locale file(s).`)
}

main()
