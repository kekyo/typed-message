import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import react from '@vitejs/plugin-react-swc';
import dts from 'vite-plugin-dts';
import screwUp from 'screw-up';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(({ _, mode }) => {
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
    };
  }

  // Library build mode
  return {
    plugins: [
      react(),
      dts({
        include: ['src/**/*'],
        exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
        outDir: 'dist',
        insertTypesEntry: true,
      }),
      screwUp()
    ],
    build: {
      lib: {
        entry: {
          index: resolve(__dirname, 'src/index.ts'),
          'vite-plugin': resolve(__dirname, 'src/vite.ts'),
        },
        name: 'TypedMessage',
        formats: ['es', 'cjs'],
        fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'es.js' : 'js'}`,
      },
      rollupOptions: {
        external: ['react', 'react-dom', 'fs', 'fs/promises', 'os', 'crypto', 'path', 'vite'],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          exports: 'named',
        },
      },
      sourcemap: true,
      emptyOutDir: true,
    },
  };
});
