import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { takeHandoff } from './app/person'
import '@fontsource-variable/nunito'
import '@fontsource-variable/fraunces'
import './styles/global.css'

if (!__PREVIEW__) registerSW({ immediate: true })

// The Shire says who is here (?who=her|john) before any database opens.
takeHandoff()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
