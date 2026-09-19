import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { takeHandoff } from './app/handoff';
import './styles/theme.css';

// Offline-first: service worker caches the shell, exercise data and media.
registerSW({ immediate: true });

// The Shire opens Heartwood with ?who=her|john and the day's signals. Read them
// before anything touches a database, then clear them from the address bar.
takeHandoff();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
