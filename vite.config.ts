/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Production base comes from BASE_PATH (set by the Pages workflow from
// actions/configure-pages, or by `npm run build:pages`). Never assume root.
function resolveBase(): string {
  const raw = process.env.BASE_PATH?.trim();
  if (!raw) return '/';
  let b = raw.startsWith('/') ? raw : `/${raw}`;
  if (!b.endsWith('/')) b += '/';
  return b;
}

const base = resolveBase();

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version ?? '0.0.0'),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icons/apple-touch-icon.png', 'icons/favicon.svg'],
      manifest: {
        id: base,
        name: 'Pick Three',
        short_name: 'Pick Three',
        description: 'Pick three lifts. Get stronger.',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'any',
        background_color: '#0d1015',
        theme_color: '#0d1015',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Cache only the built shell and bundled assets. User data lives in IndexedDB.
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
        runtimeCaching: [],
      },
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
