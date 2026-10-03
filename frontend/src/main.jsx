import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo'
import '@fontsource/fragment-mono/400.css'
import './index.css'
import './App.css'
import App from './App'
import './Appearance.css'
import { readWorkProtocol } from './lib/preferences'

const preferences = readWorkProtocol(localStorage)
const initialTheme = preferences.brightness === 'system' ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : preferences.brightness
document.documentElement.dataset.palette = preferences.palette
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
