import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const currentDir = dirname(fileURLToPath(import.meta.url))
const root = resolve(currentDir, '../../src/mobile-web')
const gatewayTarget = process.env.MOBILE_SSH_DEV_GATEWAY || 'http://127.0.0.1:5581'

export default defineConfig({
  plugins: [react()],
  root,
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5580,
    proxy: {
      '/api/mobile-ssh': {
        target: gatewayTarget
      },
      '/ws/mobile-ssh': {
        target: gatewayTarget,
        ws: true
      }
    }
  },
  build: {
    target: 'esnext',
    emptyOutDir: true,
    outDir: resolve(currentDir, '../../work/mobile-web')
  }
})
