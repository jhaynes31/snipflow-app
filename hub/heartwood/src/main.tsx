import React from 'react';
import ReactDOM from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/App';
import { goToShireFrame, inShire } from './app/base';
import { takeHandoff } from './app/handoff';
import '@fontsource-variable/nunito';
import '@fontsource-variable/fraunces';
import './styles/theme.css';

// Opened outside The Shire's frame: go there instead, address intact.
if (!goToShireFrame()) {
  document.documentElement.dataset.framed = inShire() ? 'true' : 'false';

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
}
