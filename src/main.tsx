import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Math Fingers PWA ServiceWorker registered successfully: ', registration.scope);
        // Register Background Sync if supported
        if ('sync' in registration) {
          (registration as any).sync.register('supabase-sync')
            .then(() => console.log('PWA Background Sync "supabase-sync" registered successfully!'))
            .catch((err: any) => console.warn('PWA Background Sync registration failed:', err));
        }
      })
      .catch((error) => {
        console.error('Math Fingers PWA ServiceWorker registration failed: ', error);
      });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
