// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createMutex } from 'async-primitives';
import type { MessageDictionary } from './types';

/**
 * Status flags exposed by {@link useLocaleController}
 */
export type LocaleLoadStatus = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Options for {@link useLocaleController}
 */
export interface UseLocaleControllerOptions {
  /**
   * Initial locale the hook should attempt to load when mounted.
   */
  initialLocale?: string;
  /**
   * Fallback locale name used when no other hints are available.
   */
  fallbackLocale?: string;
  /**
   * Custom loader responsible for returning a message dictionary for a locale.
   */
  loadLocale: (locale: string) => Promise<MessageDictionary>;
  /**
   * Optional list of locales to eagerly preload.
   */
  locales?: readonly string[];
  /**
   * Storage key used for persisting the last successful locale.
   * Defaults to omit persisting.
   */
  storageKey?: string;
}

/**
 * Result object returned by {@link useLocaleController}
 */
export interface TypedMessageLocaleController {
  /**
   * Currently active locale (last successfully loaded).
   */
  locale: string;
  /**
   * Load status for the active locale.
   */
  status: LocaleLoadStatus;
  /**
   * Message dictionary for the active locale.
   */
  dictionary: MessageDictionary;
  /**
   * Error captured during the latest load attempt (if any).
   */
  error: unknown;
  /**
   * Switch to a different locale. Resolves when the locale has finished loading.
   */
  setLocale: (locale: string) => Promise<void>;
  /**
   * Preload message dictionaries without changing the active locale.
   */
  preload: (locales: readonly string[]) => Promise<void>;
}

/**
 * Simplified locale state exposed by {@link useLocale}.
 */
export interface LocaleState {
  locale: string;
  status: LocaleLoadStatus;
  setLocale: TypedMessageLocaleController['setLocale'];
}

/**
 * React hook that encapsulates locale loading, caching and persistence.
 *
 * The hook keeps an in-memory cache of message dictionaries, serializes load
 * requests through a mutex and persists the last successful locale to
 * `localStorage`. Consumers simply pipe the returned dictionary into
 * {@link TypedMessageProvider} to update rendered messages.
 */
export const useLocaleController = (
  options: UseLocaleControllerOptions
): TypedMessageLocaleController => {
  const { initialLocale, fallbackLocale, loadLocale, locales, storageKey } =
    options;

  const cacheRef = useRef(new Map<string, MessageDictionary>());
  const loadLocaleRef = useRef(loadLocale);
  const mutexRef = useRef(createMutex());
  const isMountedRef = useRef(true);
  const localeRef = useRef('');

  useEffect(() => {
    loadLocaleRef.current = loadLocale;
  }, [loadLocale]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const canUseStorage = useMemo(() => {
    return typeof window !== 'undefined' && !!window.localStorage;
  }, []);

  const persistenceKey = storageKey ?? 'typed-message:locale';

  const readStoredLocale = useCallback(() => {
    if (!canUseStorage || storageKey === undefined) {
      return undefined;
    }
    try {
      const stored = window.localStorage.getItem(persistenceKey);
      return stored ?? undefined;
    } catch (_error) {
      return undefined;
    }
  }, [canUseStorage, persistenceKey, storageKey]);

  const persistLocale = useCallback(
    (value: string) => {
      if (!canUseStorage || storageKey === undefined) {
        return;
      }
      try {
        window.localStorage.setItem(persistenceKey, value);
      } catch (_error) {
        // Ignore persistence failures (e.g. private mode quota exceeded)
      }
    },
    [canUseStorage, persistenceKey, storageKey]
  );

  const resolveInitialLocale = useCallback(() => {
    const stored = readStoredLocale();
    if (stored && stored.trim()) {
      return stored.trim();
    }
    if (initialLocale && initialLocale.trim()) {
      return initialLocale.trim();
    }
    if (locales && locales.length > 0) {
      const candidate = locales[0];
      if (candidate && candidate.trim()) {
        return candidate.trim();
      }
    }
    if (fallbackLocale && fallbackLocale.trim()) {
      return fallbackLocale.trim();
    }
    return 'fallback';
  }, [fallbackLocale, initialLocale, locales, readStoredLocale]);

  const [localeState, setLocaleState] = useState(() => resolveInitialLocale());
  const [status, setStatus] = useState<LocaleLoadStatus>('idle');
  const [dictionary, setDictionary] = useState<MessageDictionary>({});
  const [error, setError] = useState<unknown>(null);

  // Keep the locale ref synchronized with state
  useEffect(() => {
    localeRef.current = localeState;
  }, [localeState]);

  const applyLoadedLocale = useCallback(
    (nextLocale: string, nextDictionary: MessageDictionary) => {
      if (!isMountedRef.current) {
        return;
      }
      localeRef.current = nextLocale;
      setDictionary(nextDictionary);
      setLocaleState(nextLocale);
      setStatus('ready');
      setError(null);
      persistLocale(nextLocale);
    },
    [persistLocale]
  );

  const runWithMutex = useCallback(
    async <T>(operation: () => Promise<T>): Promise<T> => {
      const handle = await mutexRef.current.lock();
      try {
        return await operation();
      } finally {
        handle.release();
      }
    },
    []
  );

  const enqueueLoad = useCallback(
    async (requestedLocale: string, apply: boolean) => {
      const normalized = requestedLocale.trim();
      if (!normalized) {
        return;
      }

      const operation = async () => {
        const cached = cacheRef.current.get(normalized);
        if (cached) {
          if (apply) {
            applyLoadedLocale(normalized, cached);
          }
          return cached;
        }

        if (apply && isMountedRef.current) {
          setStatus('loading');
          setError(null);
        }

        const loaded = await loadLocaleRef.current(normalized);
        cacheRef.current.set(normalized, loaded);

        if (apply) {
          applyLoadedLocale(normalized, loaded);
        }

        return loaded;
      };

      try {
        return await runWithMutex(operation);
      } catch (loadError: unknown) {
        if (apply && isMountedRef.current) {
          setStatus('error');
          setError(loadError);
        }
        throw loadError;
      }
    },
    [applyLoadedLocale, runWithMutex]
  );

  const setLocale = useCallback(
    async (requestedLocale: string) => {
      const normalized = requestedLocale.trim();
      if (!normalized) {
        return;
      }

      if (normalized === localeRef.current) {
        const cached = cacheRef.current.get(normalized);
        if (cached) {
          applyLoadedLocale(normalized, cached);
          return;
        }
      }

      await enqueueLoad(normalized, true);
    },
    [applyLoadedLocale, enqueueLoad]
  );

  const preload = useCallback(
    async (requestedLocales: readonly string[]) => {
      const uniqueLocales = Array.from(
        new Set(
          requestedLocales
            .map((localeName) => localeName.trim())
            .filter((localeName) => localeName)
        )
      );
      await Promise.all(
        uniqueLocales.map((localeName) => enqueueLoad(localeName, false))
      );
    },
    [enqueueLoad]
  );

  // Auto-load the initial locale on mount
  useEffect(() => {
    enqueueLoad(localeRef.current || localeState, true).catch(() => {
      // Errors are surfaced through status/error state; swallow to avoid unhandled rejection
    });
  }, [enqueueLoad, localeState]);

  // Preload locales when provided via options
  useEffect(() => {
    if (!locales || locales.length === 0) {
      return;
    }
    preload(locales).catch(() => {
      // Ignore preload errors; active locale remains unchanged
    });
  }, [locales, preload]);

  return {
    locale: localeState,
    status,
    dictionary,
    error,
    setLocale,
    preload,
  };
};

/**
 * @deprecated Use useLocaleController instead.
 */
export const useTypedMessageLocale = useLocaleController;
