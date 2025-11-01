import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Global error handler to catch and log errors
window.addEventListener('error', (event) => {
  console.error('Global error caught:', event.error);
  // Prevent default error handling for specific errors
  if (event.error?.message?.includes("Cannot read properties of undefined")) {
    console.warn('Undefined property access detected, continuing...');
    event.preventDefault();
  }
});

// Initialize FCL configuration with error boundary
try {
  import('./config/fcl.js');
} catch (error) {
  console.error('Failed to import FCL config:', error);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
