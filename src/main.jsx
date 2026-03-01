import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './App.css'
import './globals.css'
import './index.css'
import { RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@/components/ui/tooltip'
import router from './router'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <TooltipProvider>
      <RouterProvider router={router} />
    </TooltipProvider>
  </StrictMode>,
)
