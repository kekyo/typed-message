// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

///////////////////////////////////////////////////////////////////////////////////////////////

// Vite plugin entry point for typed-message
// This module provides the Vite plugin for automatic generation of type-safe
// internationalization messages. Import from 'typed-message/vite' to keep
// the main library lightweight and avoid unnecessary Vite dependencies in runtime.
// ```typescript
// import typedMessage from 'typed-message/vite';
// ```

export { default, type TypedMessagePluginOptions } from './vite-plugin';
export { default as typedMessage } from './vite-plugin';

/**
 * @deprecated Backward compatibility symbol, use `typedMessage` default symbol instead.
 */
export { typedMessagePlugin } from './vite-plugin';
