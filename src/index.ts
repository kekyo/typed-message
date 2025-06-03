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