const assert = require('node:assert/strict')
const { describe, test } = require('node:test')
const {
  hashAdminPassword,
  isHostAllowed,
  loadMobileSshConfig,
  parseAllowedHosts,
  verifyAdminPassword
} = require('../../src/mobile-server/security')

describe('mobile SSH security configuration', () => {
  test('hashes and verifies the single administrator password', () => {
    const encoded = hashAdminPassword('correct-horse-battery')
    assert.match(encoded, /^scrypt\$[a-f0-9]+\$[a-f0-9]+$/)
    assert.equal(verifyAdminPassword('correct-horse-battery', encoded), true)
    assert.equal(verifyAdminPassword('wrong-password', encoded), false)
  })

  test('requires an explicit host allowlist', () => {
    const allowed = parseAllowedHosts('server.example.com,10.20.0.18')
    assert.equal(isHostAllowed('SERVER.EXAMPLE.COM', allowed), true)
    assert.equal(isHostAllowed('10.20.0.18', allowed), true)
    assert.equal(isHostAllowed('other.example.com', allowed), false)
  })

  test('rejects insecure public origins unless explicitly enabled for local testing', () => {
    const passwordHash = hashAdminPassword('correct-horse-battery')
    assert.throws(() => loadMobileSshConfig({
      MOBILE_SSH_ADMIN_PASSWORD_HASH: passwordHash,
      MOBILE_SSH_ALLOWED_HOSTS: '127.0.0.1',
      MOBILE_SSH_JWT_SECRET: '0123456789abcdef0123456789abcdef',
      MOBILE_SSH_KNOWN_HOSTS_PATH: '/tmp/mobile-known-hosts-test',
      MOBILE_SSH_PUBLIC_ORIGIN: 'http://mobile.example.test'
    }), /https/)
  })
})
