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

// Automatically unregister stale service workers to ensure fresh API connections
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations().then((registrations) => {
      for (let registration of registrations) {
        registration.unregister();
      }
    }).catch(() => { });
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
