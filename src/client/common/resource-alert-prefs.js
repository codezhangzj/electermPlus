/**
 * electermPlus resource-monitor alert preferences + OS notification helper.
 *
 * Thresholds and the desktop-notification toggle are persisted in
 * localStorage (same lightweight approach as the AI agent audit log).
 *
 * notifyResourceAlert only fires an OS notification when a server escalates
 * to a more severe level (healthy -> warn -> danger), debounced per server,
 * so a sustained high-load state does not spam the user every refresh tick.
 */

const PREFS_KEY = 'plus_resource_alert_prefs'

const DEFAULT_PREFS = {
  notify: true,
  warn: 70,
  danger: 90
}

function clampPercent (value, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) {
    return fallback
  }
  return Math.max(1, Math.min(100, Math.round(n)))
}

export function getAlertPrefs () {
  try {
    const raw = JSON.parse(window.localStorage.getItem(PREFS_KEY) || '{}')
    const warn = clampPercent(raw.warn, DEFAULT_PREFS.warn)
    let danger = clampPercent(raw.danger, DEFAULT_PREFS.danger)
    // danger must stay at or above warn to keep the tiers ordered
    if (danger < warn) {
      danger = warn
    }
    return {
      notify: raw.notify === undefined ? DEFAULT_PREFS.notify : Boolean(raw.notify),
      warn,
      danger
    }
  } catch (_) {
    return { ...DEFAULT_PREFS }
  }
}

export function setAlertPrefs (next) {
  const merged = { ...getAlertPrefs(), ...next }
  if (merged.danger < merged.warn) {
    merged.danger = merged.warn
  }
  window.localStorage.setItem(PREFS_KEY, JSON.stringify(merged))
  return merged
}

// Map the worst metric value to a tier given the configured thresholds.
export function getAlertLevel (maxPercent, prefs = getAlertPrefs()) {
  if (maxPercent >= prefs.danger) {
    return 'danger'
  }
  if (maxPercent >= prefs.warn) {
    return 'warn'
  }
  return 'healthy'
}

const levelRank = { healthy: 0, warn: 1, danger: 2 }

// Tracks the last notified level per server so we only notify on escalation.
const lastLevelMap = new Map()

export function resetAlertTracking (serverKey) {
  if (serverKey) {
    lastLevelMap.delete(serverKey)
  } else {
    lastLevelMap.clear()
  }
}

/**
 * Fire an OS notification when serverKey escalates to a higher tier.
 * Returns true if a notification was shown.
 */
export function notifyResourceAlert ({ serverKey, level, title, detail }) {
  const prev = lastLevelMap.get(serverKey) || 'healthy'
  lastLevelMap.set(serverKey, level)

  // only on escalation (e.g. healthy->warn, warn->danger, healthy->danger)
  if (levelRank[level] <= levelRank[prev]) {
    return false
  }
  if (!getAlertPrefs().notify) {
    return false
  }
  if (typeof window.Notification === 'undefined') {
    return false
  }
  try {
    if (window.Notification.permission === 'granted') {
      // eslint-disable-next-line no-new
      new window.Notification(title, { body: detail })
      return true
    }
    if (window.Notification.permission !== 'denied') {
      window.Notification.requestPermission().then(perm => {
        if (perm === 'granted') {
          // eslint-disable-next-line no-new
          new window.Notification(title, { body: detail })
        }
      })
    }
  } catch (_) {
    return false
  }
  return false
}
