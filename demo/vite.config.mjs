import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { typedMessagePlugin } from '../src/vite-plugin.js'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig({
  plugins: [
    react(),
    typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      enableFormatter: true,
      fallbackPriorityOrder: ['ja', 'en', 'fallback'],
    }),
  ],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      'typed-message': resolve(__dirname, '../src/index.ts'),
    },
  },
}) 