import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { resolve } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

export default defineConfig(({ command, mode }) => {
  // Demo mode
  if (process.argv.includes('demo') || mode === 'demo') {
    return {
      plugins: [react()],
      root: 'demo',
      build: {
        outDir: '../dist-demo',
        emptyOutDir: true,
      },
      server: {
        port: 3000,
      },
    }
  }

  // Library build mode
  return {
    plugins: [react()],
    build: {
      lib: {
        entry: resolve(__dirname, 'src/index.ts'),
        name: 'TypedMessage',
        formats: ['es', 'cjs'],
        fileName: (format) => `index.${format === 'es' ? 'es.js' : 'js'}`,
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'fs', 'path', 'vite'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
        },
      },
      sourcemap: true,
      emptyOutDir: true,
    },
  }
}) 