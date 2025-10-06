// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React, { useState } from 'react';
import { TypedMessageProvider } from '../src/provider';
import { TypedMessage } from '../src/component';
import type { SimpleMessageItem } from '../src/types';

// Test message items
const messages = {
  message1: { key: 'MSG_1', fallback: 'Message 1' } as SimpleMessageItem,
  message2: { key: 'MSG_2', fallback: 'Message 2' } as SimpleMessageItem,
  message3: { key: 'MSG_3', fallback: 'Message 3' } as SimpleMessageItem,
};

// Component that renders TypedMessage with conditional logic
const ConditionalRenderingComponent: React.FC = () => {
  const [items, setItems] = useState([
    { id: 1, available: true, msg: messages.message1 },
    { id: 2, available: false, msg: messages.message2 },
    { id: 3, available: true, msg: messages.message3 },
  ]);

  const toggleItem = (id: number) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, available: !item.available } : item
      )
    );
  };

  return (
    <div>
      <div data-testid="messages">
        {items.map((item) => (
          <div key={item.id} data-testid={`item-${item.id}`}>
            {item.available ? (
              <TypedMessage message={item.msg} />
            ) : (
              <span>Unavailable</span>
            )}
          </div>
        ))}
      </div>
      <div data-testid="controls">
        {items.map((item) => (
          <button
            key={item.id}
            data-testid={`toggle-${item.id}`}
            onClick={() => toggleItem(item.id)}
          >
            Toggle {item.id}
          </button>
        ))}
      </div>
    </div>
  );
};

// More complex conditional logic test
const ComplexConditionalComponent: React.FC = () => {
  const [condition, setCondition] = useState<
    'none' | 'first' | 'second' | 'both'
  >('none');

  return (
    <div>
      <div data-testid="result">
        {condition === 'first' && <TypedMessage message={messages.message1} />}
        {condition === 'second' && <TypedMessage message={messages.message2} />}
        {condition === 'both' && (
          <>
            <TypedMessage message={messages.message1} />
            <TypedMessage message={messages.message2} />
          </>
        )}
        {condition === 'none' && <span>Nothing displayed</span>}
      </div>
      <button
        data-testid="change-condition"
        onClick={() => {
          const conditions: Array<'none' | 'first' | 'second' | 'both'> = [
            'none',
            'first',
            'second',
            'both',
          ];
          const currentIndex = conditions.indexOf(condition);
          const nextIndex = (currentIndex + 1) % conditions.length;
          setCondition(conditions[nextIndex]);
        }}
      >
        Change State
      </button>
    </div>
  );
};

describe('TypedMessage with conditional rendering', () => {
  const testMessages = {
    MSG_1: 'Custom Message 1',
    MSG_2: 'Custom Message 2',
    MSG_3: 'Custom Message 3',
  };

  it('renders correctly in initial state', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ConditionalRenderingComponent />
      </TypedMessageProvider>
    );

    // Initial state: item1=true, item2=false, item3=true
    expect(screen.getByTestId('item-1').textContent).toBe('Custom Message 1');
    expect(screen.getByTestId('item-2').textContent).toBe('Unavailable');
    expect(screen.getByTestId('item-3').textContent).toBe('Custom Message 3');
  });

  it('no hook errors occur when conditions change', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ConditionalRenderingComponent />
      </TypedMessageProvider>
    );

    // Check initial state
    expect(screen.getByTestId('item-2').textContent).toBe('Unavailable');

    // Make item2 available
    act(() => {
      screen.getByTestId('toggle-2').click();
    });

    // Updates without error
    expect(screen.getByTestId('item-2').textContent).toBe('Custom Message 2');

    // Make item1 unavailable
    act(() => {
      screen.getByTestId('toggle-1').click();
    });

    expect(screen.getByTestId('item-1').textContent).toBe('Unavailable');
    expect(screen.getByTestId('item-2').textContent).toBe('Custom Message 2');
  });

  it('no errors occur with multiple state changes', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ConditionalRenderingComponent />
      </TypedMessageProvider>
    );

    // Perform multiple state changes
    // Initial: item1=true, item2=false, item3=true
    // toggle-1: item1=false, item2=false, item3=true
    // toggle-2: item1=false, item2=true, item3=true
    // toggle-3: item1=false, item2=true, item3=false
    // toggle-1: item1=true, item2=true, item3=false
    // toggle-2: item1=true, item2=false, item3=false
    const toggles = [
      'toggle-1',
      'toggle-2',
      'toggle-3',
      'toggle-1',
      'toggle-2',
    ];

    toggles.forEach((toggleId) => {
      act(() => {
        screen.getByTestId(toggleId).click();
      });
    });

    // Check final state (processed without errors)
    expect(screen.getByTestId('item-1').textContent).toBe('Custom Message 1');
    expect(screen.getByTestId('item-2').textContent).toBe('Unavailable');
    expect(screen.getByTestId('item-3').textContent).toBe('Unavailable');
  });

  it('no errors occur with complex conditional logic', () => {
    render(
      <TypedMessageProvider messages={testMessages}>
        <ComplexConditionalComponent />
      </TypedMessageProvider>
    );

    // Initial state (none)
    expect(screen.getByTestId('result').textContent).toBe('Nothing displayed');

    // first state
    act(() => {
      screen.getByTestId('change-condition').click();
    });
    expect(screen.getByTestId('result').textContent).toBe('Custom Message 1');

    // second state
    act(() => {
      screen.getByTestId('change-condition').click();
    });
    expect(screen.getByTestId('result').textContent).toBe('Custom Message 2');

    // both state
    act(() => {
      screen.getByTestId('change-condition').click();
    });
    expect(screen.getByTestId('result').textContent).toBe(
      'Custom Message 1Custom Message 2'
    );

    // back to none
    act(() => {
      screen.getByTestId('change-condition').click();
    });
    expect(screen.getByTestId('result').textContent).toBe('Nothing displayed');
  });

  it('no warnings output to error console', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const consoleWarnSpy = vi
      .spyOn(console, 'warn')
      .mockImplementation(() => {});

    render(
      <TypedMessageProvider messages={testMessages}>
        <ConditionalRenderingComponent />
      </TypedMessageProvider>
    );

    // Perform multiple state changes
    act(() => {
      screen.getByTestId('toggle-1').click();
      screen.getByTestId('toggle-2').click();
      screen.getByTestId('toggle-1').click();
    });

    // Check console errors and warnings
    expect(consoleSpy).not.toHaveBeenCalled();
    expect(consoleWarnSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
    consoleWarnSpy.mockRestore();
  });
});
