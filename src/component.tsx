import React, { useMemo } from 'react';
import { useTypedMessage } from './provider';
import type { SimpleMessageItem, MessageItem } from './types';

/**
 * Unified React component for displaying type-safe internationalized messages
 * 
 * Supports both non-parameterized and parameterized messages with compile-time type safety.
 * Uses TypeScript function overloads to ensure proper usage - params are required only for
 * parameterized messages and must match the expected parameter types.
 * 
 * The component automatically handles message retrieval from the context, fallback processing,
 * and parameter substitution for dynamic content.
 * 
 * @example
 * ```tsx
 * // Non-parameterized message
 * <TypedMessage message={messages.WELCOME_MESSAGE} />
 * 
 * // Parameterized message - TypeScript ensures type safety
 * <TypedMessage 
 *   message={messages.WELCOME_USER} 
 *   params={["John", "Doe", 25]} 
 * />
 * ```
 */
// Integrated TypedMessage - ensures type safety with overloads
export function TypedMessage(props: { message: SimpleMessageItem }): React.ReactElement;
export function TypedMessage<T extends readonly [any, ...any[]]>(props: { 
  message: MessageItem<T>; 
  params: T 
}): React.ReactElement;
export function TypedMessage<T extends readonly [any, ...any[]]>(props: {
  message: SimpleMessageItem | MessageItem<T>;
  params?: T;
}): React.ReactElement {
  const getMessage = useTypedMessage();
  
  const result = useMemo(() => {
    if (props.params !== undefined) {
      // When params exist, treat as MessageItem<T>
      return getMessage(props.message as MessageItem<T>, props.params);
    } else {
      // When no params, treat as SimpleMessageItem
      return getMessage(props.message as SimpleMessageItem);
    }
  }, [getMessage, props.message, props.params]);
  
  return <>{result}</>;
}
