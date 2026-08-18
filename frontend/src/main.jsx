import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo'
import '@fontsource/fragment-mono/400.css'
import './index.css'
import './App.css'
import App from './App'
import { readTheme } from './lib/preferences'

const initialTheme = readTheme(localStorage, matchMedia('(prefers-color-scheme: dark)').matches)
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
