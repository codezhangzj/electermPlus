// build html
/**
 * build common files with react module in it
 */
const fs = require('fs')
const pug = require('pug')
const { resolve } = require('path')
const pack = require('../../package.json')
const deepCopy = require('json-deep-copy')

const entryPug = resolve(
  __dirname,
  '../../src/client/views/index.pug'
)
const targetFilePath = resolve(
  __dirname,
  '../../work/app/assets/index.html'
)
const manifestPath = resolve(
  __dirname,
  '../../work/app/assets/.vite/manifest.json'
)
const pugContent = fs.readFileSync(entryPug, 'utf-8')
const manifest = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  : {}

function getManifestFile (name, fallback) {
  const entry = manifest[`src/client/entry/${name}`]
  return entry?.file || fallback
}

function getStyleFile () {
  const entry = manifest['src/client/entry/basic.js']
  return manifest['style.css']?.file || entry?.css?.[0] || `css/style-${pack.version}.css`
}

const data = {
  version: pack.version,
  siteName: pack.name,
  isDev: false,
  assets: {
    basic: getManifestFile('basic.js', `js/basic-${pack.version}.js`),
    electerm: getManifestFile('electerm.jsx', `js/electerm-${pack.version}.js`),
    worker: getManifestFile('worker.js', `js/worker-${pack.version}.js`),
    style: getStyleFile()
  }
}
const htmlContent = pug.render(pugContent, {
  filename: entryPug,
  ...data,
  _global: deepCopy(data)
})
fs.writeFileSync(targetFilePath, htmlContent, 'utf8')
