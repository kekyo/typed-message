import { createContext, useContext, useCallback, useMemo } from 'react';
import type { MessageDictionary, TypedMessageProviderProps, MessageItem, SimpleMessageItem } from './types';

// Create Context
const TypedMessageContext = createContext<MessageDictionary | null>(null);

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
  messages, children
}: TypedMessageProviderProps) => {
  const ms = useMemo(() => messages ?? {}, [messages]);
  return (
    <TypedMessageContext.Provider value={ms}>
      {children}
    </TypedMessageContext.Provider>
  );
};

// Function to replace placeholders
function replacePlaceholders(template: string, args: readonly any[], paramNames?: readonly string[]): string {
  // Placeholder regex: {name} or {name:type}
  const placeholderRegex = /\{(\w+)(?::\w+)?\}/g;
  
  // If paramNames are provided, use name-based replacement
  if (paramNames && paramNames.length > 0) {
    return template.replace(placeholderRegex, (match, paramName) => {
      const paramIndex = paramNames.indexOf(paramName);
      if (paramIndex !== -1 && paramIndex < args.length) {
        const value = args[paramIndex];
        // Format Date type appropriately
        if (value instanceof Date) {
          return value.toLocaleDateString();
        }
        return String(value);
      }
      return match; // Return as-is if parameter not found
    });
  }
  
  // Fallback to index-based replacement for backward compatibility
  let argIndex = 0;
  return template.replace(placeholderRegex, (match) => {
    if (argIndex < args.length) {
      const value = args[argIndex];
      argIndex++;
      // Format Date type appropriately
      if (value instanceof Date) {
        return value.toLocaleDateString();
      }
      return String(value);
    }
    return match; // Return as-is if not enough arguments
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
 *   - `(messageItem: MessageItem<T>, args: T) => string` - For parameterized messages
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
 *       <p>{getMessage(messages.WELCOME_USER, ["John", "Doe", 25])}</p>
 *     </div>
 *   );
 * };
 * ```
 */
export const useTypedMessage = () => {
  const messages = useContext(TypedMessageContext);
  
  // Check usage outside provider
  if (messages === null) {
    throw new Error('useTypedMessage must be used within a TypedMessageProvider');
  }
  
  // Define the overloaded function type
  type GetMessageFunction = {
    (messageItem: SimpleMessageItem): string;
    <T extends readonly [any, ...any[]]>(messageItem: MessageItem<T>, args: T): string;
  };
  
  // Memoize the getMessage function using useCallback
  const getMessage = useCallback(
    ((
      messageItem: SimpleMessageItem | MessageItem<any>,
      args?: any
    ): string => {
      // 1. Get message from context
      let localizedMessage = messages![messageItem.key];
      
      // 2. Use fallback if no localized message
      if (!localizedMessage) {
        // For SimpleMessageItem, fallback is a string
        // For MessageItem, fallback is a function
        if (typeof messageItem.fallback === 'function') {
          // MessageItem<T> case
          if (args) {
            return (messageItem.fallback as (...args: any) => string)(...args);
          } else {
            return (messageItem.fallback as () => string)();
          }
        } else {
          // SimpleMessageItem case
          localizedMessage = messageItem.fallback;
        }
      }
      
      // 3. Placeholder replacement
      if (args && args.length > 0) {
        const paramNames = 'paramNames' in messageItem ? messageItem.paramNames : undefined;
        return replacePlaceholders(localizedMessage, args, paramNames);
      } else {
        return localizedMessage;
      }
    }) as GetMessageFunction,
    [messages] // Only recreate when messages change
  );
  
  return getMessage;
};
