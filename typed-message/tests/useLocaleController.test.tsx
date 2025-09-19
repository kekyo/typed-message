import { createRef, forwardRef, useImperativeHandle } from 'react';
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  MockedFunction,
} from 'vitest';
import { render, screen, act, cleanup, waitFor } from '@testing-library/react';
import {
  useLocaleController,
  type TypedMessageLocaleController,
  type UseLocaleControllerOptions,
} from '../src/useLocaleController';

const dictionaries: Record<string, Record<string, string>> = {
  en: { GREETING: 'Hello EN' },
  ja: { GREETING: 'こんにちは' },
  fr: { GREETING: 'Bonjour' },
  fallback: { GREETING: 'Fallback hello' },
};

type Loader = (locale: string) => Promise<Record<string, string>>;

const createLoader = (
  overrides?: Partial<Record<string, () => never>>
): MockedFunction<Loader> => {
  const loader = vi.fn(async (locale: string) => {
    await Promise.resolve();
    if (overrides && overrides[locale]) {
      overrides[locale]!();
    }
    const dictionary = dictionaries[locale];
    if (!dictionary) {
      throw new Error(`Unknown locale: ${locale}`);
    }
    return { ...dictionary };
  }) as MockedFunction<Loader>;

  return loader;
};

interface HarnessProps {
  options: UseLocaleControllerOptions;
}

const HookHarness = forwardRef<TypedMessageLocaleController, HarnessProps>(
  ({ options }, ref) => {
    const result = useLocaleController(options);
    useImperativeHandle(ref, () => result, [result]);

    return (
      <div>
        <span data-testid="locale">{result.locale}</span>
        <span data-testid="status">{result.status}</span>
        <span data-testid="message">{result.dictionary.GREETING ?? ''}</span>
        <span data-testid="error">{result.error ? 'error' : ''}</span>
      </div>
    );
  }
);

HookHarness.displayName = 'HookHarness';

describe('useLocaleController', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('loads the initial locale and exposes the dictionary', async () => {
    const loader = createLoader();
    const ref = createRef<TypedMessageLocaleController>();

    render(
      <HookHarness
        ref={ref}
        options={{
          loadLocale: loader,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('message').textContent).toBe('Hello EN');
    expect(loader).toHaveBeenCalledWith('en');
  });

  it('preloads specified locales without switching the active locale', async () => {
    const loader = createLoader();
    const ref = createRef<TypedMessageLocaleController>();

    render(
      <HookHarness
        ref={ref}
        options={{
          loadLocale: loader,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
          locales: ['en', 'ja'],
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    expect(screen.getByTestId('locale').textContent).toBe('en');

    const loadedLocales = loader.mock.calls.map((call) => call[0]);
    expect(
      loadedLocales.filter((value) => value === 'en').length
    ).toBeGreaterThanOrEqual(1);
    expect(loadedLocales.filter((value) => value === 'ja').length).toBe(1);
  });

  it('loads a new locale once and reuses the cached dictionary afterwards', async () => {
    const loader = createLoader();
    const ref = createRef<TypedMessageLocaleController>();

    render(
      <HookHarness
        ref={ref}
        options={{
          loadLocale: loader,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    await act(async () => {
      await ref.current!.setLocale('ja');
    });

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('ja');
      expect(screen.getByTestId('message').textContent).toBe('こんにちは');
    });

    const callCountAfterFirstSwitch = loader.mock.calls.length;

    await act(async () => {
      await ref.current!.setLocale('ja');
    });

    expect(loader.mock.calls.length).toBe(callCountAfterFirstSwitch);
  });

  it('keeps the previous locale when a load error occurs', async () => {
    const loader = createLoader({
      ja: () => {
        throw new Error('ja failed');
      },
    });
    const ref = createRef<TypedMessageLocaleController>();

    render(
      <HookHarness
        ref={ref}
        options={{
          loadLocale: loader,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    let thrown: unknown;
    await act(async () => {
      try {
        await ref.current!.setLocale('ja');
      } catch (error) {
        thrown = error;
      }
    });

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toContain('ja failed');

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('error');
    });

    expect(screen.getByTestId('locale').textContent).toBe('en');
    expect(screen.getByTestId('message').textContent).toBe('Hello EN');
    expect(screen.getByTestId('error').textContent).toBe('error');
  });

  it('persists the resolved locale to localStorage', async () => {
    const storageKey = 'typed-message:test-locale';
    const loader = createLoader();
    const ref = createRef<TypedMessageLocaleController>();

    const { unmount } = render(
      <HookHarness
        ref={ref}
        options={{
          loadLocale: loader,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
          storageKey,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    await act(async () => {
      await ref.current!.setLocale('ja');
    });

    await waitFor(() => {
      expect(screen.getByTestId('locale').textContent).toBe('ja');
    });

    unmount();

    expect(window.localStorage.getItem(storageKey)).toBe('ja');

    const loader2 = createLoader();
    const ref2 = createRef<TypedMessageLocaleController>();

    render(
      <HookHarness
        ref={ref2}
        options={{
          loadLocale: loader2,
          initialLocale: 'en',
          fallbackLocale: 'fallback',
          storageKey,
        }}
      />
    );

    await waitFor(() => {
      expect(screen.getByTestId('status').textContent).toBe('ready');
    });

    expect(screen.getByTestId('locale').textContent).toBe('ja');
    expect(loader2).toHaveBeenCalledWith('ja');
  });
});
