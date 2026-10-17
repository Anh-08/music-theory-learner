/// <reference types="vitest/config" />
import mdx from '@mdx-js/rollup'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import remarkGfm from 'remark-gfm'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages phục vụ site ở /<tên-repo>/ — workflow deploy truyền BASE_PATH vào.
  base: process.env.BASE_PATH ?? '/',
  plugins: [
    // Bài học viết bằng MDX; phải chạy trước plugin React.
    { enforce: 'pre', ...mdx({ remarkPlugins: [remarkGfm] }) },
    react({ include: /\.(mdx|tsx?)$/ }),
    tailwindcss(),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
})
