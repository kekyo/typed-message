import React, { useMemo } from 'react';
import { useTypedMessage } from './provider';
import type { SimpleMessageItem, MessageItem } from './types';

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