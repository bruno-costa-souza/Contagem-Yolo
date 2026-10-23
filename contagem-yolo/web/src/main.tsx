import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

const elemento = document.getElementById('root')
if (!elemento) {
  throw new Error('elemento root nao encontrado')
}

createRoot(elemento).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
