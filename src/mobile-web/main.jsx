import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import MobileSshApp from './app.jsx'
import './mobile-ssh-app.styl'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MobileSshApp />
  </StrictMode>
)
