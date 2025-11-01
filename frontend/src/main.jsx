import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global error handler to catch and log errors
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('Global error caught:', event.error);
    // Log but don't prevent - let React Error Boundary handle it
  });

  // Ensure window object has necessary properties
  if (!window.location) {
    window.location = { href: '', origin: window.location?.origin || '' };
  }
}

// Initialize FCL configuration - import will execute fcl.js code
import './config/fcl.js';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
