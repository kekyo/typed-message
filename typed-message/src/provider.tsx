// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { createContext, useContext, useCallback, useMemo, useRef } from 'react';
import type {
  MessageDictionary,
  TypedMessageProviderProps,
  MessageItem,
  SimpleMessageItem,
  UseTypedMessageDynamicResult,
  GetMessageFunction,
} from './types';
import type {
  TypedMessageLocaleController,
  LocaleState,
} from './useLocaleController';
import { ensureUniqueIdentifier, sanitizeIdentifier } from './util';

///////////////////////////////////////////////////////////////////////////////////////////////

// Context value exposes both the raw dictionary and a lazily computed map that
// mirrors the plugin's identifier sanitization rules.
interface TypedMessageContextValue {
  messages: MessageDictionary;
  getSanitizedDictionary: () => Map<string, string>;
}

// Create Context
const TypedMessageContext = createContext<TypedMessageContextValue | null>(
  null
);
const LocaleControllerContext =
  createContext<TypedMessageLocaleController | null>(null);

const isLocaleController = (
  value: MessageDictionary | TypedMessageLocaleController | undefined
): value is TypedMessageLocaleController => {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Partial<TypedMessageLocaleController> & {
    dictionary?: unknown;
    setLocale?: unknown;
    preload?: unknown;
    locale?: unknown;
    status?: unknown;
  };
  return (
    typeof candidate.setLocale === 'function' &&
    typeof candidate.preload === 'function' &&
    typeof candidate.locale === 'string' &&
    typeof candidate.status === 'string' &&
    !!candidate.dictionary &&
    typeof candidate.dictionary === 'object'
  );
};

///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * React context provider component for typed internationalization messages
 *
 * Provides message dictionaries to child components through React context.
 * Manages message retrieval and fallback processing throughout the component tree.
 * All {@link TypedMessage} components and {@link useTypedMessage} hooks must be used within this provider.
 *
 * @param props - Provider configuration props
 * @param props.messages - Message dictionary containing key-value pairs of message identifiers and their translations
 * @param props.children - Child React components that will have access to the message context
 *
 * @example
 * ```tsx
 * import { TypedMessageProvider } from 'typed-message';
 * import messages from './generated/message';
 * import enMessages from '../locale/en.json';
 *
 * const App = () => {
 *   return (
 *     <TypedMessageProvider messages={enMessages}>
 *       <div>
 *         <TypedMessage message={messages.PAGE_TITLE} params={{ name: "The blog" }} />
 *       </div>
 *     </TypedMessageProvider>
 *   );
 * };
 * ```
 */
export const TypedMessageProvider = ({
  messages,
  children,
}: TypedMessageProviderProps) => {
  const controller = isLocaleController(messages) ? messages : null;
  const dictionary = useMemo(() => {
    if (controller) {
      return controller.dictionary;
    }
    return (messages as MessageDictionary | undefined) ?? {};
  }, [controller, messages]);
  const sanitizedCacheRef = useRef<{
    source: MessageDictionary;
    map: Map<string, string>;
  } | null>(null);

  const getSanitizedDictionary = useCallback(() => {
    const cache = sanitizedCacheRef.current;
    if (cache && cache.source === dictionary) {
      return cache.map;
    }

    const usedIdentifiers = new Set<string>();
    const sanitizedMap = new Map<string, string>();

    for (const dictionaryKey of Object.keys(dictionary)) {
      const sanitized = sanitizeIdentifier(dictionaryKey);
      const uniqueKey = ensureUniqueIdentifier(sanitized, usedIdentifiers);

      if (!sanitizedMap.has(uniqueKey)) {
        sanitizedMap.set(uniqueKey, dictionaryKey);
      }
    }

    sanitizedCacheRef.current = { source: dictionary, map: sanitizedMap };
    return sanitizedMap;
  }, [dictionary]);

  const contextValue = useMemo<TypedMessageContextValue>(
    () => ({
      messages: dictionary,
      getSanitizedDictionary,
    }),
    [dictionary, getSanitizedDictionary]
  );

  return (
    <LocaleControllerContext.Provider value={controller}>
      <TypedMessageContext.Provider value={contextValue}>
        {children}
      </TypedMessageContext.Provider>
    </LocaleControllerContext.Provider>
  );
};

///////////////////////////////////////////////////////////////////////////////////////////////

// Function to replace placeholders
const replacePlaceholders = (
  template: string,
  params: Record<string, any>
): string => {
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
};

/**
 * React hook for retrieving type-safe internationalized messages
 *
 * Note: Instead of hooks, there is also the {@link TypedMessage} component,
 * which is simpler and can be written declaratively using JSX syntax.
 *
 * Returns a function that can retrieve both non-parameterized and parameterized messages
 * in a type-safe manner. The function automatically handles message lookup from the
 * provided dictionary, fallback processing, and parameter substitution for dynamic messages.
 *
 * Must be used within a {@link TypedMessageProvider} context.
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
  const context = useContext(TypedMessageContext);

  // Check usage outside provider
  if (context === null) {
    throw new Error(
      'useTypedMessage must be used within a TypedMessageProvider'
    );
  }

  const { messages } = context;

  // Memoize the getMessage function using useCallback
  const getMessage = useCallback(
    ((
      messageItem: SimpleMessageItem | MessageItem<any>,
      params?: any
    ): string => {
      // 1. Get message from context
      let localizedMessage = messages[messageItem.key];

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

///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * React hook to access and mutate the active locale managed by a
 * {@link TypedMessageLocaleController}.
 *
 * @throws {Error} When the surrounding provider was not given a locale controller.
 */
export const useLocale = (): LocaleState => {
  const controller = useContext(LocaleControllerContext);

  if (controller === null) {
    throw new Error(
      'useLocale must be used within a TypedMessageProvider configured with a locale controller.'
    );
  }

  return useMemo<LocaleState>(
    () => ({
      locale: controller.locale,
      status: controller.status,
      setLocale: controller.setLocale,
    }),
    [controller.locale, controller.setLocale, controller.status]
  );
};

///////////////////////////////////////////////////////////////////////////////////////////////

const MESSAGE_NOT_FOUND_PREFIX = 'MESSAGE_NOT_FOUND: ';

/**
 * Attention: Normally, use {@link TypedMessage} or {@link useTypedMessage} instead of this.
 * This function is designed for special use cases and LOSES type safety.
 *
 * React hook for runtime message resolution using string keys.
 *
 * Unlike useTypedMessage, this hook does not rely on generated message
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
 *
 * @returns {UseTypedMessageDynamicResult} Runtime helpers for string-key lookups.
 */
export const useTypedMessageDynamic = (): UseTypedMessageDynamicResult => {
  const context = useContext(TypedMessageContext);

  if (context === null) {
    throw new Error(
      'useTypedMessageDynamic must be used within a TypedMessageProvider'
    );
  }

  const { messages, getSanitizedDictionary } = context;

  // The generated message module sanitizes identifiers and may append suffixes
  // for collisions, so the runtime dictionary still uses original keys. The
  // provider caches a sanitized lookup map instead of directly calling
  // messages[sanitizeIdentifier(key)].
  const sanitizedKeyToDictionaryKey = getSanitizedDictionary();

  const tryGetMessageDynamic = useCallback(
    (key: string, params?: Record<string, unknown>) => {
      let localizedMessage = messages[key];

      if (!localizedMessage) {
        const sanitizedBase = sanitizeIdentifier(key);

        let resolvedDictionaryKey =
          sanitizedKeyToDictionaryKey.get(sanitizedBase);

        if (!resolvedDictionaryKey) {
          for (const [
            sanitizedCandidate,
            dictionaryKey,
          ] of sanitizedKeyToDictionaryKey) {
            if (sanitizedCandidate.startsWith(`${sanitizedBase}_`)) {
              resolvedDictionaryKey = dictionaryKey;
              break;
            }
          }
        }

        if (resolvedDictionaryKey) {
          localizedMessage = messages[resolvedDictionaryKey];
        }
      }

      if (!localizedMessage) {
        return undefined;
      }

      if (params && typeof params === 'object') {
        return replacePlaceholders(localizedMessage, params);
      }

      return localizedMessage;
    },
    [messages, sanitizedKeyToDictionaryKey]
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
