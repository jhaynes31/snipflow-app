/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import { fileURLToPath, URL } from 'node:url';

// Served inside The Shire (Next.js) from public/fitness/app; see hub/docs/heartwood-migration-plan.md.
const BASE = '/fitness/app/';

export default defineConfig({
  base: BASE,
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  plugins: [
    // A build stamp in index.html (2026-11-26): the service worker only refreshes its cached start page when the page's content
    // changes, and a cached page keeps the headers it was fetched with. Stamping every build means a deploy that changes headers
    // (the frame policy, that day) reaches the browser on the next open instead of waiting for the app itself to change.
    { name: 'shire-build-stamp', transformIndexHtml: (html: string) => html.replace('<head>', `<head>\n    <meta name="shire-build" content="${new Date().toISOString()}">`) },
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.svg', 'media/**/*'],
      manifest: {
        name: 'Heartwood',
        short_name: 'Heartwood',
        description: 'Your personal trainer and physical therapist. Open, press Start, follow along.',
        theme_color: '#2F4A2E',
        background_color: '#FAF6EC',
        display: 'standalone',
        orientation: 'portrait',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: `${BASE}icons/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
          { src: `${BASE}icons/icon-maskable.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache the whole app shell, exercise data and media so sessions work offline outdoors.
        globPatterns: ['**/*.{js,css,html,svg,png,gif,webp,woff2,json}'],
        maximumFileSizeToCacheInBytes: 8 * 1024 * 1024,
        navigateFallback: `${BASE}index.html`,
        // Only Heartwood's own routes fall back to its shell; The Shire's pages are never touched.
        navigateFallbackAllowlist: [/^\/fitness\/app/],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['./src/test/setup.ts'],
  },
});
