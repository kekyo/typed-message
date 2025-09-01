import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TypedMessageProvider } from '../src/provider';
import { TypedMessage } from '../src/component';
import type { MessageItem, SimpleMessageItem } from '../src/types';

// Test message items
const testMessage: SimpleMessageItem = {
  key: 'TEST_KEY',
  fallback: 'Default message',
};

const titleMessage: SimpleMessageItem = {
  key: 'TITLE',
  fallback: 'Default title',
};

// Parameterized message item
const paramMessage: MessageItem<{ count: number; name: string }> = {
  key: 'PARAM_MESSAGE',
  fallback: 'You have {count:number} {name}',
};

describe('TypedMessage - SimpleMessageItem', () => {
  it('uses fallback when key does not exist in message dictionary', () => {
    render(
      <TypedMessageProvider messages={{}}>
        <TypedMessage message={testMessage} />
      </TypedMessageProvider>
    );

    expect(screen.getByText('Default message')).toBeDefined();
  });

  it('displays dictionary value when key exists in message dictionary', () => {
    const messages = {
      TEST_KEY: 'Custom message',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <TypedMessage message={testMessage} />
      </TypedMessageProvider>
    );

    expect(screen.getByText('Custom message')).toBeDefined();
    expect(screen.queryByText('Default message')).toBeNull();
  });

  it('displays multiple messages correctly at the same time', () => {
    const messages = {
      TEST_KEY: 'Custom message',
      TITLE: 'Custom title',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <div>
          <span data-testid="test-message">
            <TypedMessage message={testMessage} />
          </span>
          <span data-testid="title-message">
            <TypedMessage message={titleMessage} />
          </span>
        </div>
      </TypedMessageProvider>
    );

    expect(screen.getByTestId('test-message').textContent).toBe(
      'Custom message'
    );
    expect(screen.getByTestId('title-message').textContent).toBe(
      'Custom title'
    );
  });

  it('falls back appropriately when message dictionary partially exists', () => {
    const messages = {
      TEST_KEY: 'Custom message',
      // TITLE does not exist (fallback will be used)
    };

    render(
      <TypedMessageProvider messages={messages}>
        <div>
          <span data-testid="test-message">
            <TypedMessage message={testMessage} />
          </span>
          <span data-testid="title-message">
            <TypedMessage message={titleMessage} />
          </span>
        </div>
      </TypedMessageProvider>
    );

    expect(screen.getByTestId('test-message').textContent).toBe(
      'Custom message'
    );
    expect(screen.getByTestId('title-message').textContent).toBe(
      'Default title'
    );
  });

  it('throws error when used outside provider', () => {
    expect(() => render(<TypedMessage message={testMessage} />)).toThrow(
      'useTypedMessage must be used within a TypedMessageProvider'
    );
  });
});

describe('TypedMessage - MessageItem integrated version', () => {
  it('uses localized value for parameterized message', () => {
    const messages = {
      PARAM_MESSAGE: 'You have {count:number} {name} (English version)',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <TypedMessage
          message={paramMessage}
          params={{ count: 5, name: 'apples' }}
        />
      </TypedMessageProvider>
    );

    expect(
      screen.getByText('You have 5 apples (English version)')
    ).toBeDefined();
  });

  it('uses fallback when no localized value exists for parameterized message', () => {
    render(
      <TypedMessageProvider messages={{}}>
        <TypedMessage
          message={paramMessage}
          params={{ count: 3, name: 'oranges' }}
        />
      </TypedMessageProvider>
    );

    expect(screen.getByText('You have 3 oranges')).toBeDefined();
  });

  it('handles multiple parameters correctly in integrated TypedMessage', () => {
    const userMessage: MessageItem<{
      firstName: string;
      lastName: string;
      age: number;
    }> = {
      key: 'USER_MESSAGE',
      fallback: 'Hello {firstName} {lastName}, you are {age:number} years old',
    };

    const messages = {
      USER_MESSAGE: 'Welcome {firstName} {lastName}, age: {age:number}',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <TypedMessage
          message={userMessage}
          params={{ firstName: 'Taro', lastName: 'Tanaka', age: 25 }}
        />
      </TypedMessageProvider>
    );

    expect(screen.getByText('Welcome Taro Tanaka, age: 25')).toBeDefined();
  });

  it('type safety check: non-parameterized messages do not accept params', () => {
    // This test documents type-level constraints that would cause TypeScript errors at compile time
    // The test itself runs, but the commented code would cause TypeScript errors
    render(
      <TypedMessageProvider messages={{}}>
        <TypedMessage message={testMessage} />
        {/* The following would cause TypeScript error:
        <TypedMessage message={testMessage} params={{ test: 'value' }} />
        */}
      </TypedMessageProvider>
    );

    expect(screen.getByText('Default message')).toBeDefined();
  });

  it('type safety check: parameterized messages require params', () => {
    const messages = {
      PARAM_MESSAGE: 'Test message',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <TypedMessage
          message={paramMessage}
          params={{ count: 10, name: 'bananas' }}
        />
        {/* The following would cause TypeScript error:
        <TypedMessage message={paramMessage} />
        */}
      </TypedMessageProvider>
    );

    expect(screen.getByText('Test message')).toBeDefined();
  });
});
