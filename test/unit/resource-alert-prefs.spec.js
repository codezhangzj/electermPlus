const { test, describe, beforeEach } = require('node:test')
const assert = require('assert/strict')

// Minimal browser-global stub so the ESM module under test can run in node.
function installWindowStub () {
  const fired = []
  global.window = {
    localStorage: {
      _d: {},
      getItem (k) { return this._d[k] || null },
      setItem (k, v) { this._d[k] = v },
      removeItem (k) { delete this._d[k] }
    },
    Notification: class {
      constructor (title, opts) { fired.push({ title, opts }) }
    }
  }
  global.window.Notification.permission = 'granted'
  return fired
}

describe('resource alert prefs + escalation', () => {
  let mod
  let fired

  beforeEach(async () => {
    fired = installWindowStub()
    // fresh module state each test (clears the per-server level map)
    mod = await import('../../src/client/common/resource-alert-prefs.js?' + Math.random())
  })

  test('getAlertLevel maps values to tiers by threshold', () => {
    const prefs = { notify: true, warn: 70, danger: 90 }
    assert.equal(mod.getAlertLevel(50, prefs), 'healthy')
    assert.equal(mod.getAlertLevel(70, prefs), 'warn')
    assert.equal(mod.getAlertLevel(89, prefs), 'warn')
    assert.equal(mod.getAlertLevel(90, prefs), 'danger')
    assert.equal(mod.getAlertLevel(100, prefs), 'danger')
  })

  test('prefs persist and danger is clamped to >= warn', () => {
    mod.setAlertPrefs({ warn: 80, danger: 60 })
    const p = mod.getAlertPrefs()
    assert.equal(p.warn, 80)
    assert.equal(p.danger, 80) // clamped up to warn
  })

  test('notifies only on upward level transitions', () => {
    const key = 'srv1'
    const fire = level => mod.notifyResourceAlert({ serverKey: key, level, title: 't', detail: 'd' })

    assert.equal(fire('healthy'), false)
    assert.equal(fire('warn'), true) // escalate
    assert.equal(fire('warn'), false) // sustained, no re-spam
    assert.equal(fire('danger'), true) // escalate
    assert.equal(fire('danger'), false) // sustained
    assert.equal(fire('warn'), false) // de-escalate is quiet
    assert.equal(fire('danger'), true) // re-escalate fires again
    assert.equal(fired.length, 3)
  })

  test('respects the notify=off toggle', () => {
    mod.setAlertPrefs({ notify: false })
    assert.equal(mod.notifyResourceAlert({ serverKey: 's2', level: 'danger', title: 't', detail: 'd' }), false)
    assert.equal(fired.length, 0)
  })
})
