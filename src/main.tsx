import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/fira-sans-condensed/400.css'
import '@fontsource/fira-sans-condensed/600.css'
import '@fontsource/ibm-plex-mono/400.css'
import 'mathlive'
import 'mathlive/static.css'
import 'mathlive/fonts.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
