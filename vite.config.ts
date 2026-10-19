/// <reference types="vitest/config" />
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { readFileSync } from 'node:fs'
import remarkGfm from 'remark-gfm'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

const META_QUERY = '?meta'

/**
 * `lesson.mdx?meta` returns only the lesson's `export const meta = {...}`, so the curriculum page gets titles / descriptions
 * without bundling the whole lesson content (content is loaded when the lesson is opened).
 */
function lessonMeta(): Plugin {
  return {
    name: 'lesson-meta',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith(`.mdx${META_QUERY}`)) return null
      const file = id.slice(0, -META_QUERY.length)
      const match = readFileSync(file, 'utf8').match(/export const meta = (\{[\s\S]*?\n\})/)
      if (!match) throw new Error(`Lesson ${file} is missing export const meta`)
      return `export const meta = ${match[1]}`
    },
  }
}

/** MDX plugin, skipping `?meta` modules (already JavaScript). */
function lessonContent(): Plugin {
  const plugin = mdx({ remarkPlugins: [remarkGfm] }) as Plugin
  const transform = plugin.transform as (this: unknown, code: string, id: string) => unknown
  return {
    ...plugin,
    enforce: 'pre',
    transform(code, id) {
      if (id.endsWith(META_QUERY)) return null
      return transform.call(this, code, id) as ReturnType<Exclude<Plugin['transform'], undefined | { handler: unknown }>>
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages serves the site at /<repo-name>/ — the deploy workflow passes BASE_PATH.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    // Lessons are written in MDX; must run before the React plugin.
    lessonMeta(),
    lessonContent(),
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
    // Installable on phones / desktops and usable offline. Disabled in tests.
    !process.env.VITEST &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Music Theory Learner',
          short_name: 'Music Theory',
          description: 'Learn music theory on your own instrument — guitar or piano. In English and Vietnamese.',
          lang: 'en',
          start_url: '.',
          scope: '.',
          display: 'standalone',
          background_color: '#fafaf9',
          theme_color: '#f43f5e',
          icons: [
            { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
            { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
            { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,svg,png}'],
          // Piano samples loaded from Tone.js: cached after the first listen for offline use.
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/tonejs\.github\.io\/audio\//,
              handler: 'CacheFirst',
              options: { cacheName: 'piano-samples', expiration: { maxEntries: 80, maxAgeSeconds: 60 * 60 * 24 * 365 }, cacheableResponse: { statuses: [0, 200] } },
            },
          ],
        },
      }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
