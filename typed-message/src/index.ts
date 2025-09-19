// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

export {
  TypedMessageProvider,
  useTypedMessage,
  useTypedMessageDynamic,
} from './provider';
export { TypedMessage, TypedMessageDynamic } from './component';

// vite-plugin is server-side only, so exclude from client-side index.ts
// export typedMessage from 'typed-message/vite'

// Type definition exports
export type {
  MessageItem,
  SimpleMessageItem,
  MessageDictionary,
  TypedMessageProviderProps,
  FormatterFunction,
  PlaceholderInfo,
  ParsedMessage,
} from './types';
