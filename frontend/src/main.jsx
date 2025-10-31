import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './config/fcl.js' // Initialize FCL configuration (changed from flow.js to fcl.js)
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
