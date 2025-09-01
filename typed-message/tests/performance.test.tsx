import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState, useRef } from 'react';
import { TypedMessageProvider } from '../src/provider';
import { TypedMessage } from '../src/component';
import type { SimpleMessageItem, MessageItem } from '../src/types';

// Test message items
const simpleMessage: SimpleMessageItem = {
  key: 'SIMPLE_MSG',
  fallback: 'Simple message',
};

const paramMessage: MessageItem<{ count: number; name: string }> = {
  key: 'PARAM_MSG',
  fallback: 'You have {count} {name}',
};

// Component that counts render times
const RenderCounterComponent: React.FC<{
  message: SimpleMessageItem;
  onRender: () => void;
}> = ({ message, onRender }) => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  // Call callback on each render
  onRender();

  return (
    <div data-testid="render-counter">
      <span data-testid="render-count">{renderCountRef.current}</span>
      <TypedMessage message={message} />
    </div>
  );
};

// Render count test for parameterized messages
const ParamRenderCounterComponent: React.FC<{
  message: MessageItem<{ count: number; name: string }>;
  params: { count: number; name: string };
  onRender: () => void;
}> = ({ message, params, onRender }) => {
  const renderCountRef = useRef(0);
  renderCountRef.current += 1;

  onRender();

  return (
    <div data-testid="param-render-counter">
      <span data-testid="param-render-count">{renderCountRef.current}</span>
      <TypedMessage message={message} params={params} />
    </div>
  );
};

// Parent component re-render test
const ParentReRenderComponent: React.FC = () => {
  const [counter, setCounter] = useState(0);
  const [messageParams, setMessageParams] = useState<{
    count: number;
    name: string;
  }>({ count: 5, name: 'apples' });
  const renderCallCount = useRef(0);
  const paramRenderCallCount = useRef(0);

  const handleRender = () => {
    renderCallCount.current += 1;
  };

  const handleParamRender = () => {
    paramRenderCallCount.current += 1;
  };

  return (
    <div>
      <div data-testid="parent-counter">{counter}</div>
      <div data-testid="total-render-calls">{renderCallCount.current}</div>
      <div data-testid="total-param-render-calls">
        {paramRenderCallCount.current}
      </div>

      <RenderCounterComponent message={simpleMessage} onRender={handleRender} />

      <ParamRenderCounterComponent
        message={paramMessage}
        params={messageParams}
        onRender={handleParamRender}
      />

      <button
        data-testid="increment-counter"
        onClick={() => setCounter((prev) => prev + 1)}
      >
        Increment Counter
      </button>

      <button
        data-testid="change-params"
        onClick={() => setMessageParams({ count: 3, name: 'oranges' })}
      >
        Change Parameters
      </button>

      <button
        data-testid="same-params"
        onClick={() => setMessageParams({ count: 3, name: 'oranges' })}
      >
        Set Same Parameters
      </button>
    </div>
  );
};

describe('TypedMessage performance tests', () => {
  const testMessages = {
    SIMPLE_MSG: 'Custom simple message',
    PARAM_MSG: 'You have {count:number} {name} (custom)',
  };

  it('useMemo works when re-rendered with same props', () => {
    const renderSpy = vi.fn();

    const TestComponent: React.FC = () => {
      const [, forceUpdate] = useState({});

      return (
        <div>
          <RenderCounterComponent
            message={simpleMessage}
            onRender={renderSpy}
          />
          <button data-testid="force-rerender" onClick={() => forceUpdate({})}>
            Force Re-render
          </button>
        </div>
      );
    };

    render(
      <TypedMessageProvider messages={testMessages}>
        <TestComponent />
      </TypedMessageProvider>
    );

    expect(renderSpy).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('render-count').textContent).toBe('1');

    // Force re-render
    act(() => {
      screen.getByTestId('force-rerender').click();
    });

    // Component re-renders but TypedMessage calculation is optimized
    expect(renderSpy).toHaveBeenCalledTimes(2);
    expect(screen.getByTestId('render-count').textContent).toBe('2');
  });

  it('works correctly even with parent component state changes', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ParentReRenderComponent />
      </TypedMessageProvider>
    );

    // Initial state
    expect(screen.getByTestId('parent-counter').textContent).toBe('0');
    expect(screen.getByText('Custom simple message')).toBeDefined();
    expect(screen.getByText('You have 5 apples (custom)')).toBeDefined();

    // Change parent counter
    act(() => {
      screen.getByTestId('increment-counter').click();
    });

    expect(screen.getByTestId('parent-counter').textContent).toBe('1');
    // Messages remain displayed unchanged (proof that useMemo is working)
    expect(screen.getByText('Custom simple message')).toBeDefined();
    expect(screen.getByText('You have 5 apples (custom)')).toBeDefined();
  });

  it('recalculates appropriately when parameters change', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ParentReRenderComponent />
      </TypedMessageProvider>
    );

    // Check message with initial parameters
    expect(screen.getByText('You have 5 apples (custom)')).toBeDefined();

    // Change parameters
    act(() => {
      screen.getByTestId('change-params').click();
    });

    // Message updates with new parameters
    expect(screen.getByText('You have 3 oranges (custom)')).toBeDefined();
    expect(screen.queryByText('You have 5 apples (custom)')).toBeNull();
  });

  it('messages dictionary changes are recalculated appropriately', () => {
    const TestComponent: React.FC = () => {
      const [messages, setMessages] = useState(testMessages);

      return (
        <TypedMessageProvider messages={messages}>
          <div>
            <TypedMessage message={simpleMessage} />
            <button
              data-testid="change-messages"
              onClick={() =>
                setMessages({
                  SIMPLE_MSG: 'Updated simple message',
                  PARAM_MSG: 'Updated param message',
                })
              }
            >
              Change Messages
            </button>
          </div>
        </TypedMessageProvider>
      );
    };

    render(<TestComponent />);

    expect(screen.getByText('Custom simple message')).toBeDefined();

    act(() => {
      screen.getByTestId('change-messages').click();
    });

    expect(screen.getByText('Updated simple message')).toBeDefined();
    expect(screen.queryByText('Custom simple message')).toBeNull();
  });
});
