const { hashAdminPassword } = require('../../src/mobile-server/security')

function readPasswordFromPipe () {
  return new Promise((resolve, reject) => {
    let value = ''
    process.stdin.setEncoding('utf8')
    process.stdin.on('data', chunk => {
      value += chunk
    })
    process.stdin.on('end', () => resolve(value.replace(/[\r\n]+$/, '')))
    process.stdin.on('error', reject)
  })
}

function readPasswordFromTty () {
  return new Promise((resolve, reject) => {
    let value = ''
    process.stdout.write('管理员密码（至少 12 位）：')
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.setEncoding('utf8')

    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdout.write('\n')
    }

    process.stdin.on('data', chunk => {
      for (const key of chunk) {
        if (key === '\u0003') {
          cleanup()
          reject(new Error('已取消'))
          return
        }
        if (key === '\r' || key === '\n') {
          cleanup()
          resolve(value)
          return
        }
        if (key === '\u007f') {
          value = value.slice(0, -1)
          continue
        }
        value += key
      }
    })
  })
}

async function main () {
  const password = process.stdin.isTTY
    ? await readPasswordFromTty()
    : await readPasswordFromPipe()
  process.stdout.write(`${hashAdminPassword(password)}\n`)
}

main().catch(err => {
  console.error(err.message)
  process.exitCode = 1
})
