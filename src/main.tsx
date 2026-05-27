import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { bootstrapTheme } from './lib/useTheme'

// Apply the saved theme synchronously before React renders, so the very
// first paint already matches — no light-mode flash for dark-mode users.
bootstrapTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
