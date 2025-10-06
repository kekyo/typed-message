// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

///////////////////////////////////////////////////////////////////////////////////////////////

/**
 * Reserved words that cannot be used as-is for generated identifiers.
 */
const RESERVED_WORDS = new Set([
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'from',
  'function',
  'get',
  'if',
  'implements',
  'import',
  'in',
  'infer',
  'instanceof',
  'interface',
  'is',
  'keyof',
  'let',
  'module',
  'namespace',
  'never',
  'new',
  'null',
  'number',
  'object',
  'of',
  'package',
  'private',
  'protected',
  'public',
  'readonly',
  'require',
  'return',
  'set',
  'static',
  'string',
  'super',
  'switch',
  'symbol',
  'this',
  'throw',
  'true',
  'try',
  'type',
  'typeof',
  'undefined',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);

/**
 * Normalizes a raw message key into a TypeScript-safe identifier string.
 * @param input - Original message key sourced from locale data.
 * @returns Identifier that avoids reserved words and invalid characters.
 */
export const sanitizeIdentifier = (input: string): string => {
  // Replace unsupported characters so the resulting identifier is valid.
  let sanitized = input.replace(/[^A-Za-z0-9_$]/g, '_');

  if (sanitized.length === 0) {
    // Guarantee we always return a non-empty string.
    sanitized = '_';
  }

  if (/^[^A-Za-z_$]/.test(sanitized)) {
    // Prefix invalid starting characters to satisfy TypeScript naming rules.
    sanitized = `_${sanitized}`;
  }

  if (RESERVED_WORDS.has(sanitized)) {
    // Avoid colliding with reserved words by prepending an underscore.
    sanitized = `_${sanitized}`;
  }

  return sanitized;
};

/**
 * Ensures a sanitized identifier does not collide with previously generated names.
 * @param baseIdentifier - Preferred identifier derived from the message key.
 * @param usedIdentifiers - Set containing identifiers already assigned.
 * @returns Unique identifier suitable for inclusion in generated code.
 */
export const ensureUniqueIdentifier = (
  baseIdentifier: string,
  usedIdentifiers: Set<string>
): string => {
  let candidate = baseIdentifier;
  let index = 1;

  while (usedIdentifiers.has(candidate)) {
    // Append an incrementing suffix until the identifier becomes unique.
    candidate = `${baseIdentifier}_${index}`;
    index++;
  }

  // Reserve the identifier so future lookups respect uniqueness.
  usedIdentifiers.add(candidate);
  return candidate;
};
