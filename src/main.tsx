import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'
import App from './App'
import { registerPWA } from './registerPwa'

createRoot(document.getElementById('root')!).render(
  <StrictMode><App /></StrictMode>,
)

void registerPWA()
