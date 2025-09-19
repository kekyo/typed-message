// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { JSX, useMemo } from 'react';
import { useTypedMessage, useTypedMessageDynamic } from './provider';
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
 *   params={{ firstName: "John", lastName: "Doe", age: 25 }}
 * />
 * ```
 */
// Function overloads for TypedMessage
export function TypedMessage(props: {
  message: SimpleMessageItem;
}): JSX.Element;
export function TypedMessage<T extends Record<string, any>>(props: {
  message: MessageItem<T>;
  params: T;
}): JSX.Element;
export function TypedMessage<T extends Record<string, any>>(props: {
  message: SimpleMessageItem | MessageItem<T>;
  params?: T;
}): JSX.Element {
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

/**
 * React component counterpart to {@link useTypedMessageDynamic}.
 *
 * It resolves messages by string key at render time. When the key is missing
 * the component renders the marker string `MESSAGE_NOT_FOUND: {key}` so that
 * missing translations remain visible in the UI.
 */
export function TypedMessageDynamic(props: {
  messageKey: string;
  params?: Record<string, unknown>;
}): JSX.Element {
  const { getMessageDynamic } = useTypedMessageDynamic();

  const result = useMemo(
    () => getMessageDynamic(props.messageKey, props.params),
    [getMessageDynamic, props.messageKey, props.params]
  );

  return <>{result}</>;
}
