/**
 * Vite plugin entry point for typed-message
 * 
 * This module provides the Vite plugin for automatic generation of type-safe
 * internationalization messages. Import from 'typed-message/vite' to keep
 * the main library lightweight and avoid unnecessary Vite dependencies in runtime.
 * 
 * @example
 * ```typescript
 * import { typedMessagePlugin } from 'typed-message/vite';
 * ```
 */
export { typedMessagePlugin as default, typedMessagePlugin, type TypedMessagePluginOptions } from './vite-plugin';
