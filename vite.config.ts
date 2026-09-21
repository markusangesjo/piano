import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

function normalizeBasePath(basePath: string) {
  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '')
  const basePath = normalizeBasePath(env.VITE_BASE_PATH || '/')

  return {
    plugins: [
      react(),
      VitePWA({
        injectRegister: false,
        registerType: 'autoUpdate',
        includeAssets: ['icon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Note Nest',
          short_name: 'Note Nest',
          description: 'A playful piano lesson for learning treble-clef notes from C4 to C5.',
          theme_color: '#7165d7',
          background_color: '#fffaf1',
          display: 'standalone',
          orientation: 'portrait',
          start_url: basePath,
          scope: basePath,
          icons: [
            { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
            { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
            { src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,webmanifest}'],
          navigateFallback: 'index.html',
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'StaleWhileRevalidate',
              options: {
                cacheName: 'google-font-stylesheets',
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-font-webfonts',
                cacheableResponse: {
                  statuses: [0, 200],
                },
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: false,
        },
      }),
    ],
    base: basePath,
  }
})
