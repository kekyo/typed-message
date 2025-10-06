// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

// vite-plugin is server-side only, so exclude from client-side index.ts
// export typedMessage from 'typed-message/vite'

///////////////////////////////////////////////////////////////////////////////////////////////

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

// Type definition exports
export type {
  MessageItem,
  SimpleMessageItem,
  MessageDictionary,
  TypedMessageProviderProps,
  GetMessageFunction,
  UseTypedMessageDynamicResult,
} from './types';

/**
 * @deprecated Use useLocaleController instead.
 */
export { useTypedMessageLocale } from './useLocaleController';
