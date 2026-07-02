/**
 * AI agent audit log, persisted in the main process.
 *
 * The renderer used to keep this trail in localStorage, which can be
 * cleared or tampered with from the page context. Entries are now written
 * as JSONL next to the app data files, with a simple size-based rotation
 * (current file + one rotated generation).
 */

const fs = require('fs')
const { resolve } = require('path')
const { appPath } = require('../common/app-props')
const { appDataDirName } = require('../common/runtime-constants')
const log = require('../common/log')

const MAX_FILE_SIZE = 2 * 1024 * 1024
const MAX_READ_ENTRIES = 500

function getAuditDir () {
  return process.env.DATA_PATH || resolve(appPath, appDataDirName)
}

function getAuditPath () {
  return resolve(getAuditDir(), 'ai-agent-audit.jsonl')
}

function getRotatedPath () {
  return getAuditPath() + '.1'
}

function rotateIfNeeded (filePath) {
  try {
    const stat = fs.statSync(filePath)
    if (stat.size < MAX_FILE_SIZE) {
      return
    }
    fs.renameSync(filePath, getRotatedPath())
  } catch (_) {
    // file does not exist yet
  }
}

exports.appendAIAuditLog = (entry) => {
  try {
    const dir = getAuditDir()
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const filePath = getAuditPath()
    rotateIfNeeded(filePath)
    const record = {
      ...entry,
      timestamp: entry?.timestamp || Date.now()
    }
    fs.appendFileSync(filePath, JSON.stringify(record) + '\n')
    return { ok: true }
  } catch (e) {
    log.error('append AI audit log error', e)
    return { ok: false, error: e.message }
  }
}

function readLines (filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8')
      .split('\n')
      .filter(Boolean)
  } catch (_) {
    return []
  }
}

exports.readAIAuditLog = (limit = 100) => {
  const lines = [
    ...readLines(getRotatedPath()),
    ...readLines(getAuditPath())
  ]
  const entries = []
  // newest entries live at the end of the file
  for (let i = lines.length - 1; i >= 0 && entries.length < Math.min(limit, MAX_READ_ENTRIES); i--) {
    try {
      entries.push(JSON.parse(lines[i]))
    } catch (_) {}
  }
  return entries
}

exports.clearAIAuditLog = () => {
  for (const filePath of [getAuditPath(), getRotatedPath()]) {
    try {
      fs.unlinkSync(filePath)
    } catch (_) {}
  }
  return { ok: true }
}
