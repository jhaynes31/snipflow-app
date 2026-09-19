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
    react(),
    VitePWA({
      disable: preview,
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Love & Release',
        short_name: 'Love & Release',
        description: 'A gentle companion for loving people fully and releasing what is theirs to carry.',
        theme_color: '#f6efe6',
        background_color: '#f6efe6',
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
