import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/archivo'
import '@fontsource/fragment-mono/400.css'
import './index.css'
import './App.css'
import App from './App'

const initialTheme = localStorage.getItem('stillpoint.theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
document.documentElement.dataset.theme = initialTheme

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
