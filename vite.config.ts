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
 * `bai-hoc.mdx?meta` chỉ trả về `export const meta = {...}` của bài học, để trang lộ trình có tiêu đề / mô tả
 * mà không phải đóng gói cả nội dung bài (nội dung được tải riêng khi mở bài).
 */
function lessonMeta(): Plugin {
  return {
    name: 'lesson-meta',
    enforce: 'pre',
    load(id) {
      if (!id.endsWith(`.mdx${META_QUERY}`)) return null
      const file = id.slice(0, -META_QUERY.length)
      const match = readFileSync(file, 'utf8').match(/export const meta = (\{[\s\S]*?\n\})/)
      if (!match) throw new Error(`Bài học ${file} thiếu export const meta`)
      return `export const meta = ${match[1]}`
    },
  }
}

/** Plugin MDX, bỏ qua các module `?meta` (đã là JavaScript). */
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
  // GitHub Pages phục vụ site ở /<tên-repo>/ — workflow deploy truyền BASE_PATH vào.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    // Bài học viết bằng MDX; phải chạy trước plugin React.
    lessonMeta(),
    lessonContent(),
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
    // Cài lên điện thoại / máy tính và dùng offline. Tắt khi chạy test.
    !process.env.VITEST &&
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
        manifest: {
          name: 'Music Theory Learner',
          short_name: 'Nhạc lý',
          description: 'Học nhạc lý thực hành trên guitar và piano — Learn music theory on your own instrument.',
          lang: 'vi',
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
          // Sample piano nạp từ Tone.js: lưu lại sau lần nghe đầu tiên để dùng offline.
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
