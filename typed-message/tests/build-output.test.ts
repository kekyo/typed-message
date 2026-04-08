// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { describe, expect, test } from 'vitest';

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..'
);

describe('build output', () => {
  test('keeps the ESM React JSX runtime externalized', async () => {
    const indexMjs = await readFile(path.join(packageRoot, 'dist/index.mjs'), {
      encoding: 'utf8',
    });

    expect(indexMjs).toMatch(/from ["']react\/jsx-runtime["']/);
    expect(indexMjs).not.toContain('from "./vite.mjs"');
    expect(indexMjs).not.toContain('from "./vite-plugin.mjs"');
    expect(indexMjs).not.toContain('__require("react")');
    expect(indexMjs).not.toContain("require('react')");
    expect(indexMjs).not.toContain('react-jsx-runtime.development.js');
  });

  test('keeps the CJS React JSX runtime as an external require', async () => {
    const indexCjs = await readFile(path.join(packageRoot, 'dist/index.cjs'), {
      encoding: 'utf8',
    });

    expect(indexCjs).toContain('require("react/jsx-runtime")');
    expect(indexCjs).not.toContain('require("./vite.cjs")');
    expect(indexCjs).not.toContain('require("./vite-plugin.cjs")');
    expect(indexCjs).not.toContain('react-jsx-runtime.development.js');
  });
});
