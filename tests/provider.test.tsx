import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { TypedMessageProvider, useTypedMessage } from '../src/provider';
import type { MessageItem, SimpleMessageItem } from '../src/types';

// Test component
const TestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage: SimpleMessageItem = { 
    key: 'TEST_KEY', 
    fallback: 'Test fallback' 
  };
  const result = getMessage(testMessage);
  return <div data-testid="message">{result}</div>;
};

// Parameterized message test component
const ParamTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage: MessageItem<readonly [firstName: string, age: number]> = { 
    key: 'PARAM_KEY', 
    fallback: (firstName: string, age: number) => `Hello ${firstName}, you are ${age} years old`
  };
  const result = getMessage(testMessage, ['Taro', 25]);
  return <div data-testid="param-message">{result}</div>;
};

// Placeholder replacement test component
const PlaceholderTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage: MessageItem<readonly [count: number, name: string]> = { 
    key: 'PLACEHOLDER_KEY', 
    fallback: (count: number, name: string) => `You have ${count} ${name}`
  };
  const result = getMessage(testMessage, [5, 'apples']);
  return <div data-testid="placeholder-message">{result}</div>;
};

// Component to test multiple messages
const MultiTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage1: SimpleMessageItem = { 
    key: 'KEY1', 
    fallback: 'Fallback 1' 
  };
  const testMessage2: SimpleMessageItem = { 
    key: 'KEY2', 
    fallback: 'Fallback 2' 
  };
  
  return (
    <div>
      <div data-testid="message1">{getMessage(testMessage1)}</div>
      <div data-testid="message2">{getMessage(testMessage2)}</div>
    </div>
  );
};

describe('TypedMessageProvider', () => {
  it('returns dictionary value when localized message exists', () => {
    const testMessages = {
      TEST_KEY: 'Custom message',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('message');
    expect(element.textContent).toBe('Custom message');
  });

  it('uses fallback when localized message does not exist', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('message');
    expect(element.textContent).toBe('Test fallback');
  });

  it('uses localized value for parameterized message', () => {
    const testMessages = {
      PARAM_KEY: 'Welcome {firstName}, you are {age:number} years old',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <ParamTestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('param-message');
    expect(element.textContent).toBe('Welcome Taro, you are 25 years old');
  });

  it('uses formatter when no localized value exists for parameterized message', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <ParamTestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('param-message');
    expect(element.textContent).toBe('Hello Taro, you are 25 years old');
  });

  it('placeholder replacement works correctly', () => {
    const testMessages = {
      PLACEHOLDER_KEY: 'You have {count:number} {name} (English version)',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <PlaceholderTestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('placeholder-message');
    expect(element.textContent).toBe('You have 5 apples (English version)');
  });

  it('Date type arguments are formatted correctly', () => {
    const DateTestComponent: React.FC = () => {
      const getMessage = useTypedMessage();
      const testMessage: MessageItem<readonly [date: Date]> = { 
        key: 'DATE_KEY', 
        fallback: (date: Date) => `Today is ${date.toLocaleDateString()}`
      };
      const testDate = new Date('2024-01-01');
      const result = getMessage(testMessage, [testDate]);
      return <div data-testid="date-message">{result}</div>;
    };

    const testMessages = {
      DATE_KEY: 'Today is {date:date}',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <DateTestComponent />
      </TypedMessageProvider>
    );
    
    const element = screen.getByTestId('date-message');
    expect(element.textContent).toContain('2024');
  });

  it('re-renders when messages change', () => {
    const initialMessages = { TEST_KEY: 'Initial message' };
    const updatedMessages = { TEST_KEY: 'Updated message' };

    const { rerender } = render(
      <TypedMessageProvider messages={initialMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );
    
    expect(screen.getByTestId('message').textContent).toBe('Initial message');

    rerender(
      <TypedMessageProvider messages={updatedMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );
    
    expect(screen.getByTestId('message').textContent).toBe('Updated message');
  });

  it('handles multiple messages appropriately', () => {
    const messages = {
      KEY1: 'Custom 1',
      // KEY2 does not exist (formatter will be used)
    };

    render(
      <TypedMessageProvider messages={messages}>
        <MultiTestComponent />
      </TypedMessageProvider>
    );
    
    expect(screen.getByTestId('message1').textContent).toBe('Custom 1');
    expect(screen.getByTestId('message2').textContent).toBe('Fallback 2');
  });

  it('throws error when useTypedMessage is used outside provider', () => {
    const ErrorComponent = () => {
      useTypedMessage();
      return <div>This should not render</div>;
    };

    // Test to catch error
    expect(() => render(<ErrorComponent />)).toThrow(
      'useTypedMessage must be used within a TypedMessageProvider'
    );
  });
}); 