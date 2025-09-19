// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { createContext, useContext, useCallback, useMemo } from 'react';
import type {
  MessageDictionary,
  TypedMessageProviderProps,
  MessageItem,
  SimpleMessageItem,
} from './types';

// Create Context
const TypedMessageContext = createContext<MessageDictionary | null>(null);

const MESSAGE_NOT_FOUND_PREFIX = 'MESSAGE_NOT_FOUND: ';

/**
 * React context provider component for typed internationalization messages
 *
 * Provides message dictionaries to child components through React context.
 * Manages message retrieval and fallback processing throughout the component tree.
 * All TypedMessage components and useTypedMessage hooks must be used within this provider.
 *
 * @param props - Provider configuration props
 * @param props.messages - Message dictionary containing key-value pairs of message identifiers and their translations
 * @param props.children - Child React components that will have access to the message context
 *
 * @example
 * ```tsx
 * import { TypedMessageProvider } from 'typed-message';
 * import enMessages from '../locale/en.json';
 *
 * const App = () => {
 *   return (
 *     <TypedMessageProvider messages={enMessages}>
 *       <MyComponent />
 *     </TypedMessageProvider>
 *   );
 * };
 * ```
 */
export const TypedMessageProvider = ({
  messages,
  children,
}: TypedMessageProviderProps) => {
  const ms = useMemo(() => messages ?? {}, [messages]);
  return (
    <TypedMessageContext.Provider value={ms}>
      {children}
    </TypedMessageContext.Provider>
  );
};

// Function to replace placeholders
function replacePlaceholders(
  template: string,
  params: Record<string, any>
): string {
  // Placeholder regex: {name} or {name:type}
  const placeholderRegex = /\{(\w+)(?::\w+)?\}/g;

  return template.replace(placeholderRegex, (match, paramName) => {
    if (params.hasOwnProperty(paramName)) {
      const value = params[paramName];
      // Format Date type appropriately
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return String(value);
    }
    return match; // Return as-is if parameter not found
  });
}

/**
 * React hook for retrieving type-safe internationalized messages
 *
 * Returns a function that can retrieve both non-parameterized and parameterized messages
 * in a type-safe manner. The function automatically handles message lookup from the
 * provided dictionary, fallback processing, and parameter substitution for dynamic messages.
 *
 * Must be used within a TypedMessageProvider context.
 *
 * @returns A getMessage function with two overloads:
 *   - `(messageItem: SimpleMessageItem) => string` - For non-parameterized messages
 *   - `(messageItem: MessageItem<T>, params: T) => string` - For parameterized messages
 *
 * @throws {Error} When used outside of TypedMessageProvider context
 *
 * @example
 * ```tsx
 * import { useTypedMessage } from 'typed-message';
 * import { messages } from './generated/messages';
 *
 * const MyComponent = () => {
 *   const getMessage = useTypedMessage();
 *
 *   return (
 *     <div>
 *       <h1>{getMessage(messages.WELCOME_MESSAGE)}</h1>
 *       <p>{getMessage(messages.WELCOME_USER, { firstName: "John", lastName: "Doe", age: 25 })}</p>
 *     </div>
 *   );
 * };
 * ```
 */
export const useTypedMessage = () => {
  const messages = useContext(TypedMessageContext);

  // Check usage outside provider
  if (messages === null) {
    throw new Error(
      'useTypedMessage must be used within a TypedMessageProvider'
    );
  }

  // Define the overloaded function type
  type GetMessageFunction = {
    (messageItem: SimpleMessageItem): string;
    <T extends Record<string, any>>(
      messageItem: MessageItem<T>,
      params: T
    ): string;
  };

  // Memoize the getMessage function using useCallback
  const getMessage = useCallback(
    ((
      messageItem: SimpleMessageItem | MessageItem<any>,
      params?: any
    ): string => {
      // 1. Get message from context
      let localizedMessage = messages![messageItem.key];

      // 2. Use fallback if no localized message
      if (!localizedMessage) {
        // Both SimpleMessageItem and MessageItem now use string fallback
        localizedMessage = messageItem.fallback;
      }

      // 3. Placeholder replacement
      if (params && typeof params === 'object') {
        return replacePlaceholders(localizedMessage, params);
      } else {
        return localizedMessage;
      }
    }) as GetMessageFunction,
    [messages] // Only recreate when messages change
  );

  return getMessage;
};

/**
 * React hook for runtime message resolution using string keys.
 *
 * Unlike {@link useTypedMessage}, this hook does not rely on generated message
 * metadata and therefore skips compile-time validation. It is intended for
 * scenarios where message keys are only known at runtime (e.g. CMS content or
 * user input).
 *
 * The hook exposes two helpers:
 * - `getMessageDynamic(key, params?)`: returns the formatted message or the
 *   marker `MESSAGE_NOT_FOUND: {key}` when the lookup fails.
 * - `tryGetMessageDynamic(key, params?)`: returns the formatted message or
 *   `undefined` when the lookup fails, allowing the caller to decide how to
 *   handle missing keys.
 */
export const useTypedMessageDynamic = () => {
  const messages = useContext(TypedMessageContext);

  if (messages === null) {
    throw new Error(
      'useTypedMessageDynamic must be used within a TypedMessageProvider'
    );
  }

  const tryGetMessageDynamic = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      const localizedMessage = messages[key];

      if (!localizedMessage) {
        return undefined;
      }

      if (params && typeof params === 'object') {
        return replacePlaceholders(localizedMessage, params);
      }

      return localizedMessage;
    },
    [messages]
  );

  const getMessageDynamic = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      const result = tryGetMessageDynamic(key, params);

      if (result === undefined) {
        return `${MESSAGE_NOT_FOUND_PREFIX}${key}`;
      }

      return result;
    },
    [tryGetMessageDynamic]
  );

  return { getMessageDynamic, tryGetMessageDynamic };
};
