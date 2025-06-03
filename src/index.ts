/**
 * typed-message - Type-safe internationalization library for React and TypeScript
 * 
 * This library provides compile-time type safety for internationalization messages,
 * supporting both non-parameterized and parameterized messages with automatic
 * fallback handling and hot reload support.
 * 
 * Main exports:
 * - TypedMessageProvider: React context provider for message dictionaries
 * - TypedMessage: Component for displaying messages with type safety
 * - useTypedMessage: Hook for programmatic message retrieval
 * - Type definitions for all message and configuration types
 * 
 * For Vite plugin usage, import from 'typed-message/vite' instead.
 * 
 * @example
 * ```tsx
 * import { TypedMessageProvider, TypedMessage } from 'typed-message';
 * import { messages } from './generated/messages';
 * import enMessages from '../locale/en.json';
 * 
 * const App = () => (
 *   <TypedMessageProvider messages={enMessages}>
 *     <TypedMessage message={messages.WELCOME_MESSAGE} />
 *   </TypedMessageProvider>
 * );
 * ```
 */

// typed-message library main exports

export { TypedMessageProvider, useTypedMessage } from './provider'
export { TypedMessage } from './component'
// vite-plugin is server-side only, so exclude from client-side index.ts
// export { typedMessagePlugin } from './vite-plugin'

// Type definition exports
export type { 
  MessageItem, 
  SimpleMessageItem, 
  MessageDictionary, 
  TypedMessageProviderProps, 
  FormatterFunction,
  PlaceholderInfo,
  ParsedMessage
} from './types'
