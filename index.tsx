
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// NOTE: Service Worker is registered automatically via vite-plugin-pwa (injectRegister: 'auto')
// No manual import needed here.

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
