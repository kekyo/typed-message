import React, { createRef, forwardRef, useImperativeHandle } from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import {
  TypedMessageProvider,
  useTypedMessage,
  useTypedMessageDynamic,
  useLocale,
} from '../src/provider';
import { TypedMessageDynamic } from '../src/component';
import type { MessageItem } from '../src/types';
import {
  useLocaleController,
  type LocaleState,
  type UseLocaleControllerOptions,
} from '../src/useLocaleController';

// Test component
const TestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const message = { key: 'TEST_KEY', fallback: 'Fallback message' };
  return <div data-testid="message">{getMessage(message)}</div>;
};

// Error test component
const ErrorTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  return <div>This should throw an error</div>;
};

// Fallback test component
const FallbackTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const message = { key: 'NONEXISTENT_KEY', fallback: 'This is fallback' };
  return <div data-testid="fallback-message">{getMessage(message)}</div>;
};

// Placeholder replacement test component
const PlaceholderTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage: MessageItem<{ count: number; name: string }> = {
    key: 'PLACEHOLDER_KEY',
    fallback: 'You have {count:number} {name}',
  };
  const result = getMessage(testMessage, { count: 5, name: 'apples' });
  return <div data-testid="placeholder-message">{result}</div>;
};

// Parameterized fallback test component
const ParameterizedFallbackTestComponent: React.FC = () => {
  const getMessage = useTypedMessage();
  const testMessage: MessageItem<{ firstName: string; lastName: string }> = {
    key: 'PARAM_FALLBACK_KEY',
    fallback: 'Hello {firstName} {lastName}',
  };
  const result = getMessage(testMessage, {
    firstName: 'John',
    lastName: 'Doe',
  });
  return <div data-testid="param-fallback-message">{result}</div>;
};

const DynamicMessageComponent: React.FC<{
  messageKey: string;
  params?: Record<string, unknown>;
}> = ({ messageKey, params }) => {
  const { getMessageDynamic } = useTypedMessageDynamic();
  const result = getMessageDynamic(messageKey, params);
  return <div data-testid="dynamic-message">{result}</div>;
};

const DynamicTryComponent: React.FC<{
  messageKey: string;
  params?: Record<string, unknown>;
}> = ({ messageKey, params }) => {
  const { tryGetMessageDynamic } = useTypedMessageDynamic();
  const result = tryGetMessageDynamic(messageKey, params);
  return (
    <div data-testid="dynamic-try">
      {result === undefined ? 'undefined' : result}
    </div>
  );
};

const LocaleConsumer = forwardRef<LocaleState>((_, ref) => {
  const localeState = useLocale();
  useImperativeHandle(ref, () => localeState, [localeState]);

  return (
    <>
      <span data-testid="current-locale">{localeState.locale}</span>
      <span data-testid="current-status">{localeState.status}</span>
    </>
  );
});

LocaleConsumer.displayName = 'LocaleConsumer';

const LocaleControllerHarness = forwardRef<
  LocaleState,
  { options: UseLocaleControllerOptions }
>(({ options }, ref) => {
  const controller = useLocaleController(options);

  return (
    <TypedMessageProvider messages={controller}>
      <TestComponent />
      <LocaleConsumer ref={ref} />
    </TypedMessageProvider>
  );
});

LocaleControllerHarness.displayName = 'LocaleControllerHarness';

describe('TypedMessageProvider', () => {
  it('returns dictionary value when localized message exists', () => {
    const testMessages = {
      TEST_KEY: 'Localized message',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('message');
    expect(element.textContent).toBe('Localized message');
  });

  it('returns fallback when message does not exist in dictionary', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <FallbackTestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('fallback-message');
    expect(element.textContent).toBe('This is fallback');
  });

  it('throws error when used outside provider', () => {
    // This should throw an error
    expect(() => {
      render(<ErrorTestComponent />);
    }).toThrow('useTypedMessage must be used within a TypedMessageProvider');
  });

  it('uses parameterized fallback when message does not exist in dictionary', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <ParameterizedFallbackTestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('param-fallback-message');
    expect(element.textContent).toBe('Hello John Doe');
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
      const testMessage: MessageItem<{ date: Date }> = {
        key: 'DATE_KEY',
        fallback: 'Today is {date:date}',
      };
      const testDate = new Date('2024-01-01');
      const result = getMessage(testMessage, { date: testDate });
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

  it('handles placeholders in different orders correctly', () => {
    const PlaceholderOrderTestComponent: React.FC = () => {
      const getMessage = useTypedMessage();
      const testMessage: MessageItem<{
        firstName: string;
        lastName: string;
        age: number;
      }> = {
        key: 'PLACEHOLDER_ORDER_KEY',
        fallback:
          'Hello {firstName} {lastName}, you are {age:number} years old',
      };
      const result = getMessage(testMessage, {
        firstName: '太郎',
        lastName: '田中',
        age: 25,
      });
      return <div data-testid="placeholder-order-message">{result}</div>;
    };

    // Japanese: {lastName} {firstName} order
    const jaMessages = {
      PLACEHOLDER_ORDER_KEY:
        'こんにちは {lastName} {firstName}さん、あなたは{age:number}歳です！',
    };

    render(
      <TypedMessageProvider messages={jaMessages}>
        <PlaceholderOrderTestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('placeholder-order-message');
    expect(element.textContent).toBe(
      'こんにちは 田中 太郎さん、あなたは25歳です！'
    );
  });

  it('handles placeholders in different orders correctly - English version', () => {
    const PlaceholderOrderTestComponent: React.FC = () => {
      const getMessage = useTypedMessage();
      const testMessage: MessageItem<{
        firstName: string;
        lastName: string;
        age: number;
      }> = {
        key: 'PLACEHOLDER_ORDER_KEY',
        fallback:
          'Hello {firstName} {lastName}, you are {age:number} years old',
      };
      const result = getMessage(testMessage, {
        firstName: '太郎',
        lastName: '田中',
        age: 25,
      });
      return <div data-testid="placeholder-order-message">{result}</div>;
    };

    // English: {firstName} {lastName} order
    const enMessages = {
      PLACEHOLDER_ORDER_KEY:
        'Hello {firstName} {lastName}, you are {age:number} years old!',
    };

    render(
      <TypedMessageProvider messages={enMessages}>
        <PlaceholderOrderTestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('placeholder-order-message');
    expect(element.textContent).toBe('Hello 太郎 田中, you are 25 years old!');
  });

  it('handles missing placeholders gracefully', () => {
    const MissingPlaceholderTestComponent: React.FC = () => {
      const getMessage = useTypedMessage();
      const testMessage: MessageItem<{
        firstName: string;
        lastName: string;
        age: number;
      }> = {
        key: 'MISSING_PLACEHOLDER_KEY',
        fallback:
          'Hello {firstName} {lastName}, you are {age:number} years old',
      };
      const result = getMessage(testMessage, {
        firstName: '太郎',
        lastName: '田中',
        age: 25,
      });
      return <div data-testid="missing-placeholder-message">{result}</div>;
    };

    // Message with only some placeholders
    const messages = {
      MISSING_PLACEHOLDER_KEY: 'Hello {firstName}, welcome! Age: {age:number}',
    };

    render(
      <TypedMessageProvider messages={messages}>
        <MissingPlaceholderTestComponent />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('missing-placeholder-message');
    expect(element.textContent).toBe('Hello 太郎, welcome! Age: 25');
  });

  it('getMessageDynamic returns localized message when available', () => {
    const testMessages = {
      DYNAMIC_KEY: 'Dynamic hello {name}',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <DynamicMessageComponent
          messageKey="DYNAMIC_KEY"
          params={{ name: 'Alice' }}
        />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('dynamic-message');
    expect(element.textContent).toBe('Dynamic hello Alice');
  });

  it('getMessageDynamic returns not found marker when key missing', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <DynamicMessageComponent messageKey="UNKNOWN_KEY" />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('dynamic-message');
    expect(element.textContent).toBe('MESSAGE_NOT_FOUND: UNKNOWN_KEY');
  });

  it('tryGetMessageDynamic returns undefined when key missing', () => {
    const testMessages = {};

    render(
      <TypedMessageProvider messages={testMessages}>
        <DynamicTryComponent messageKey="MISSING_KEY" />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('dynamic-try');
    expect(element.textContent).toBe('undefined');
  });

  it('tryGetMessageDynamic returns formatted message when available', () => {
    const testMessages = {
      TRY_KEY: 'Count {value:number}',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <DynamicTryComponent messageKey="TRY_KEY" params={{ value: 7 }} />
      </TypedMessageProvider>
    );

    const element = screen.getByTestId('dynamic-try');
    expect(element.textContent).toBe('Count 7');
  });

  it('TypedMessageDynamic renders dynamic message lookup', () => {
    const testMessages = {
      COMPONENT_KEY: 'Component message {item}',
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <TypedMessageDynamic
          messageKey="COMPONENT_KEY"
          params={{ item: 'value' }}
        />
      </TypedMessageProvider>
    );

    expect(screen.getByText('Component message value').textContent).toBe(
      'Component message value'
    );
  });

  it('exposes locale controller through useLocale when provider receives controller', async () => {
    const dictionaries: Record<string, Record<string, string>> = {
      en: { TEST_KEY: 'Localized EN' },
      ja: { TEST_KEY: 'Localized JA' },
      fallback: { TEST_KEY: 'Fallback message' },
    };

    const loadLocale = vi.fn(async (locale: string) => {
      await Promise.resolve();
      const dictionary = dictionaries[locale];
      if (!dictionary) {
        throw new Error(`Unknown locale: ${locale}`);
      }
      return { ...dictionary };
    });

    const options: UseLocaleControllerOptions = {
      loadLocale,
      initialLocale: 'en',
      fallbackLocale: 'fallback',
    };

    const ref = createRef<LocaleState>();

    render(<LocaleControllerHarness ref={ref} options={options} />);

    await waitFor(() => {
      expect(screen.getByTestId('current-status').textContent).toBe('ready');
    });

    expect(screen.getByTestId('current-locale').textContent).toBe('en');
    expect(screen.getByTestId('message').textContent).toBe('Localized EN');

    await act(async () => {
      await ref.current!.setLocale('ja');
    });

    await waitFor(() => {
      expect(screen.getByTestId('current-locale').textContent).toBe('ja');
    });

    expect(screen.getByTestId('message').textContent).toBe('Localized JA');
  });

  it('useLocale throws when provider is configured with a plain dictionary', () => {
    const InvalidConsumer: React.FC = () => {
      useLocale();
      return null;
    };

    expect(() => {
      render(
        <TypedMessageProvider messages={{}}>
          <InvalidConsumer />
        </TypedMessageProvider>
      );
    }).toThrow(
      'useLocale must be used within a TypedMessageProvider configured with a locale controller.'
    );
  });
});
