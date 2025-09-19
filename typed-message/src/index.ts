// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

export {
  TypedMessageProvider,
  useTypedMessage,
  useTypedMessageDynamic,
  useLocale,
} from './provider';
export { TypedMessage, TypedMessageDynamic } from './component';
export { useLocaleController } from './useLocaleController';
export type {
  LocaleLoadStatus,
  TypedMessageLocaleController,
  UseLocaleControllerOptions,
  LocaleState,
} from './useLocaleController';

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

// @prettier-max-ignore-deprecated
export { useTypedMessageLocale } from './useLocaleController';
