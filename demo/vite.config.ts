import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import typedMessage from 'typed-message/vite';

export default defineConfig({
  plugins: [
    react(),
    typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['ja', 'en', 'fallback'],
    }),
  ],
  server: {
    port: 3000,
  },
  build: {
    rollupOptions: {
    }
  }
});
