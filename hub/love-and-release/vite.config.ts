import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

// PREVIEW=1 builds a hosted-preview variant: relative asset paths, hash routing, no service worker.
const preview = process.env.PREVIEW === '1'
// Served inside The Shire (Next.js) from public/love-and-release/app; see hub/docs/love-and-release-migration.md.
const BASE = '/love-and-release/app/'

export default defineConfig({
  base: preview ? './' : BASE,
  define: { __PREVIEW__: JSON.stringify(preview) },
  plugins: [
    // A build stamp in index.html (2026-11-26): the service worker only refreshes its cached start page when the page's content
    // changes, and a cached page keeps the headers it was fetched with. Stamping every build means a deploy that changes headers
    // (the frame policy, that day) reaches the browser on the next open instead of waiting for the app itself to change.
    { name: 'shire-build-stamp', transformIndexHtml: (html: string) => html.replace('<head>', `<head>\n    <meta name="shire-build" content="${new Date().toISOString()}">`) },
    react(),
    VitePWA({
      disable: preview,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Re-Centered',
        short_name: 'Re-Centered',
        description: 'A gentle companion for loving people fully and releasing what is theirs to carry.',
        theme_color: '#F5EFE0',
        background_color: '#F5EFE0',
        display: 'standalone',
        start_url: BASE,
        scope: BASE,
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: `${BASE}index.html`,
        // Only this app's routes fall back to its shell; The Shire's pages are never touched.
        navigateFallbackAllowlist: [/^\/love-and-release\/app/],
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
