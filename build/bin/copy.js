const { resolve } = require('path')
const { cp, mkdir } = require('shelljs')
const from = resolve(
  __dirname,
  '../../node_modules/@electerm/electerm-resource/tray-icons/*'
)
const fromPlus = resolve(
  __dirname,
  '../../src/app/assets/images/*'
)
const from0 = resolve(
  __dirname,
  '../../node_modules/electerm-icons/icons'
)
const to1 = resolve(
  __dirname,
  '../../work/app/assets/images/'
)
const to2 = resolve(
  __dirname,
  '../../work/app/assets/icons'
)
const arr = [
  {
    from,
    to: to1,
    file: true
  }, {
    from: fromPlus,
    to: to1,
    file: true
  }, {
    from: from0,
    to: to2
  }
]

for (const obj of arr) {
  const {
    file, from, to
  } = obj
  mkdir('-p', to)
  if (file) {
    cp(from, to)
  } else {
    cp('-r', from, to)
  }
}
