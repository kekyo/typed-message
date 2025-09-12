// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import type { LogLevel, Logger as ViteLogger } from 'vite';
import createDebug from 'debug';

/**
 * Logger interface
 */
export interface Logger {
  /**
   * Log an debug message
   * @param msg - The message to log
   */
  readonly debug: (msg: string) => void;
  /**
   * Log an info message
   * @param msg - The message to log
   */
  readonly info: (msg: string) => void;
  /**
   * Log a warning message
   * @param msg - The message to log
   */
  readonly warn: (msg: string) => void;
  /**
   * Log an error message
   * @param msg - The message to log
   */
  readonly error: (msg: string) => void;
}

// Simple logger implementation with prefix
export const createConsoleLogger = (prefix: string): Logger => {
  return {
    debug: (msg: string) => console.debug(`[${prefix}]: ${msg}`),
    info: (msg: string) => console.info(`[${prefix}]: ${msg}`),
    warn: (msg: string) => console.warn(`[${prefix}]: ${msg}`),
    error: (msg: string) => console.error(`[${prefix}]: ${msg}`),
  };
};

// Vite logger adapter with prefix
export const createViteLoggerAdapter = (
  viteLogger: ViteLogger,
  logLevel: LogLevel,
  prefix: string
): Logger => {
  // Create debug instance with vite:plugin:typed-message namespace
  const debug = createDebug('vite:plugin:typed-message');

  return {
    debug: (msg: string) => {
      // Use debug module for debug level (enabled with vite --debug or DEBUG=vite:*)
      debug(msg);
    },
    info:
      logLevel !== 'silent'
        ? (msg: string) => viteLogger.info(`[${prefix}]: ${msg}`)
        : () => {},
    warn:
      logLevel === 'warn' || logLevel === 'info' || logLevel === 'error'
        ? (msg: string) => viteLogger.warn(`[${prefix}]: ${msg}`)
        : () => {},
    error:
      logLevel !== 'silent'
        ? (msg: string) => viteLogger.error(`[${prefix}]: ${msg}`)
        : () => {},
  };
};
