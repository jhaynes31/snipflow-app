import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { goToShireFrame, inShire, takeHandoff } from './app/person'
import '@fontsource-variable/nunito'
import '@fontsource-variable/fraunces'
import './styles/global.css'

if (!__PREVIEW__) registerSW({ immediate: true })

// Opened outside The Shire's frame: go there instead, address intact.
if (!goToShireFrame()) {
  document.documentElement.dataset.framed = inShire() ? 'true' : 'false'
  // The Shire says who is here (?who=her|john) before any database opens.
  takeHandoff()
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
