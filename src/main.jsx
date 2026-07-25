import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './index.css';
import { AuthProvider } from './context/AuthContext';
import { CompetitionProvider } from './context/CompetitionContext';
import { ThemeProvider } from './context/ThemeContext';
import { SocketProvider } from './context/SocketContext';
import { ErrorBoundary } from './components/ErrorBoundary';

// Keep the UI bundle current without interrupting an active form edit.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' });
      let pendingWorker = registration.waiting;
      let reloadRequested = false;

      const hasActiveInput = () => {
        const active = document.activeElement;
        return Boolean(active?.matches?.('input, textarea, select, [contenteditable="true"]'));
      };
      const activateWhenSafe = () => {
        if (!pendingWorker || hasActiveInput() || document.visibilityState !== 'visible') return;
        console.info('[AppUpdate] activating waiting service worker');
        pendingWorker.postMessage({ type: 'SKIP_WAITING' });
      };
      const trackInstallingWorker = (worker) => {
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) {
            console.info('[AppUpdate] new UI bundle is ready');
            pendingWorker = worker;
            activateWhenSafe();
          }
        });
      };

      trackInstallingWorker(registration.installing);
      registration.addEventListener('updatefound', () => trackInstallingWorker(registration.installing));
      window.addEventListener('focus', activateWhenSafe);
      document.addEventListener('visibilitychange', activateWhenSafe);
      document.addEventListener('focusout', () => window.setTimeout(activateWhenSafe, 500));

      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (reloadRequested) return;
        const lastReload = Number(sessionStorage.getItem('dsc_sw_reload_at') || 0);
        if (Date.now() - lastReload < 30000) {
          console.warn('[AppUpdate] reload suppressed to prevent a service-worker loop');
          return;
        }
        reloadRequested = true;
        sessionStorage.setItem('dsc_sw_reload_at', String(Date.now()));
        window.location.reload();
      });

      window.setInterval(() => registration.update().catch(() => { }), 60000);
      activateWhenSafe();
    } catch (error) {
      console.warn(`[AppUpdate] service worker registration failed: ${error.message}`);
    }
  });
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <SocketProvider>
          <ThemeProvider>
            <AuthProvider>
              <CompetitionProvider>
                <App />
              </CompetitionProvider>
            </AuthProvider>
          </ThemeProvider>
        </SocketProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
