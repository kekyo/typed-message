// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dts from 'unplugin-dts/vite';
import screwUp from 'screw-up';
import prettierMax from 'prettier-max';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig(() => {
  const buildTarget = process.env.BUILD_TARGET ?? 'runtime';
  const isViteBuild = buildTarget === 'vite';

  return {
    plugins: [
      ...(!isViteBuild
        ? [
            dts({
              include: ['src/**/*'],
              exclude: ['src/**/*.test.*', 'src/**/*.spec.*'],
              insertTypesEntry: true,
            }),
          ]
        : []),
      screwUp({
        outputMetadataFile: true,
      }),
      prettierMax(),
    ],
    build: {
      lib: {
        entry: isViteBuild
          ? {
              vite: resolve(__dirname, 'src/vite.ts'),
            }
          : {
              index: resolve(__dirname, 'src/index.ts'),
            },
        name: 'typed-message',
        fileName: (format, entryName) =>
          `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
        formats: ['es', 'cjs'],
      },
      rolldownOptions: {
        external: isViteBuild
          ? ['fs', 'fs/promises', 'os', 'crypto', 'path', 'vite']
          : [
              'react',
              'react-dom',
              'react/jsx-runtime',
              'react/jsx-dev-runtime',
            ],
        output: {
          globals: {
            react: 'React',
            'react-dom': 'ReactDOM',
          },
          exports: 'named',
          hoistTransitiveImports: false,
        },
      },
      target: 'es2018',
      sourcemap: true,
      minify: false,
      emptyOutDir: !isViteBuild,
    },
  };
});
