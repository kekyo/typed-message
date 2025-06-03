import React, { createContext, useContext } from 'react';
import type { MessageDictionary, TypedMessageProviderProps, MessageItem, SimpleMessageItem } from './types';

// Create Context
const TypedMessageContext = createContext<MessageDictionary | null>(null);

// Provider component
export const TypedMessageProvider: React.FC<TypedMessageProviderProps> = ({ 
  messages, 
  children 
}) => {
  return (
    <TypedMessageContext.Provider value={messages}>
      {children}
    </TypedMessageContext.Provider>
  );
};

// Function to replace placeholders
function replacePlaceholders(template: string, args: readonly any[]): string {
  // Placeholder regex: {name} or {name:type}
  const placeholderRegex = /\{(\w+)(?::\w+)?\}/g;
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

// Hook for getting message function
export const useTypedMessage = () => {
  const messages = useContext(TypedMessageContext);
  
  // Check usage outside provider
  if (messages === null) {
    throw new Error('useTypedMessage must be used within a TypedMessageProvider');
  }
  
  // Overload for case without arguments
  function getMessage(
    messageItem: SimpleMessageItem
  ): string;
  
  // Overload for case with arguments
  function getMessage<T extends readonly [any, ...any[]]>(
    messageItem: MessageItem<T>,
    args: T
  ): string;
  
  // Implementation
  function getMessage<T extends readonly [any, ...any[]]>(
    messageItem: SimpleMessageItem | MessageItem<T>,
    args?: T
  ): string {
    // 1. Get message from context
    let localizedMessage = messages![messageItem.key];
    
    // 2. Use fallback if no localized message
    if (!localizedMessage) {
      // For SimpleMessageItem, fallback is a string
      // For MessageItem, fallback is a function
      if (typeof messageItem.fallback === 'function') {
        // MessageItem<T> case
        if (args) {
          return (messageItem.fallback as (...args: T) => string)(...args);
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
      return replacePlaceholders(localizedMessage, args);
    } else {
      return localizedMessage;
    }
  }
  
  return getMessage;
}; 