import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// GitHub Pages alt yolu: https://<kullanici>.github.io/digital-bartender/
// Yerel geliştirmede (npm run dev) base '/' olur, yayında '/digital-bartender/'.
const base = process.env.GITHUB_PAGES ? '/digital-bartender/' : '/'

// https://vite.dev/config/
export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'icons/icon.svg',
      ],
      manifest: {
        id: base,
        name: 'Dijital Barmen — Interactive Mixology Studio',
        short_name: 'Dijital Barmen',
        description:
          'Kokteylleri okumak yerine adım adım izleyerek hazırla. İnteraktif mixology stüdyosu.',
        lang: 'tr',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#07040d',
        theme_color: '#07040d',
        categories: ['food', 'lifestyle', 'entertainment'],
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-maskable-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: base + 'index.html',
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
})
