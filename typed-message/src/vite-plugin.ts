// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import type { Plugin } from 'vite';
import { existsSync } from 'fs';
import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join, resolve, dirname, extname, basename } from 'path';
import JSON5 from 'json5';
import type { PlaceholderInfo, ParsedMessage } from './types';
import { createConsoleLogger, createViteLoggerAdapter, Logger } from './logger';
import { version, git_commit_hash } from './generated/packageMetadata';

/**
 * Configuration options for the typed-message Vite plugin
 *
 * Defines how the plugin should process locale files and generate TypeScript code.
 * The plugin automatically scans JSON files in the specified directory and generates
 * type-safe message definitions with proper fallback handling.
 *
 * @example
 * ```typescript
 * import typedMessage from 'typed-message/vite';
 *
 * // Basic usage with defaults
 * typedMessage()
 *
 * // Custom configuration
 * typedMessage({
 *   localeDir: 'public/locales',
 *   outputPath: 'src/i18n/messages.ts',
 *   fallbackPriorityOrder: ['ja', 'en', 'fallback']
 * })
 * ```
 */
export interface TypedMessagePluginOptions {
  /**
   * Directory containing JSON locale files (relative to project root)
   * @default 'locale'
   */
  localeDir?: string;
  /**
   * Output path for generated TypeScript file (relative to project root)
   * @default 'src/generated/messages.ts'
   */
  outputPath?: string;
  /**
   * Priority order for fallback message resolution. Messages are searched
   * from first to last element, with later elements taking precedence.
   * @default ['en', 'fallback']
   */
  fallbackPriorityOrder?: string[];
}

// Locale file type definition (simplified)
interface LocaleData {
  [key: string]: string;
}

// Aggregated messages type definition
interface AggregatedMessages {
  [key: string]: ParsedMessage;
}

// Type to store placeholder type inconsistency information
interface PlaceholderTypeConflict {
  parameterName: string;
  conflicts: { localeFile: string; type: string }[];
}

// Type that stores warning information for each message key
interface MessageWarning {
  key: string;
  conflicts: PlaceholderTypeConflict[];
}

// Regular expression for placeholder analysis
const PLACEHOLDER_REGEX = /\{(\w+)(?::(\w+))?\}/g;

// Function to parse placeholders
const parsePlaceholders = (message: string) => {
  const placeholders: PlaceholderInfo[] = [];
  let match;
  let position = 0;

  // Extract placeholders using regular expression
  while ((match = PLACEHOLDER_REGEX.exec(message)) !== null) {
    const [, name, type = 'string'] = match;
    if (name) {
      placeholders.push({
        name,
        type: type as PlaceholderInfo['type'],
        position,
      });
    }
    position++;
  }

  return placeholders;
};

// Parse message and generate PlaceholderInfo
const parseMessage = (
  key: string,
  messageData: string,
  fallback: string
): ParsedMessage => {
  const placeholders = parsePlaceholders(messageData);
  return {
    key,
    template: messageData,
    placeholders,
    fallback,
  };
};

// Generate TypeScript named tuple type string
const generateObjectTypeString = (placeholders: PlaceholderInfo[]) => {
  if (placeholders.length === 0) {
    return '{}';
  }

  const objectProperties = placeholders.map((p) => {
    const tsType = (() => {
      switch (p.type) {
        case 'number':
          return 'number';
        case 'boolean':
          return 'boolean';
        case 'date':
          return 'Date';
        default:
          return 'string';
      }
    })();
    return `${p.name}: ${tsType}`;
  });

  return `{ ${objectProperties.join('; ')} }`;
};

// Function to check placeholder type consistency across locales
const checkPlaceholderTypeConsistency = async (
  localeFiles: string[],
  localeDir: string,
  logger: Logger
) => {
  // Analyze messages in each locale file individually
  const localeMessages: {
    [localeFile: string]: { [key: string]: ParsedMessage };
  } = {};
  const allMessageKeys = new Set<string>();
  const invalidFiles: string[] = [];

  for (const file of localeFiles) {
    const filePath = join(localeDir, file);

    try {
      const content = await readFile(filePath, 'utf-8');
      const localeData: LocaleData = JSON5.parse(content);

      localeMessages[file] = {};

      Object.entries(localeData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          if (!localeMessages[file]) {
            localeMessages[file] = {};
          }
          localeMessages[file][key] = parseMessage(key, value, value);
          allMessageKeys.add(key);
        }
      });
    } catch (error) {
      logger.error(`Error reading locale file ${file}: ${error}`);
      // Continue processing even if an error occurs and add to the list of invalid files
      invalidFiles.push(file);
      continue;
    }
  }

  // Placeholder type consistency check for each message key
  const warnings: MessageWarning[] = [];
  const aggregatedMessages: AggregatedMessages = {};

  for (const messageKey of allMessageKeys) {
    const placeholderTypeMap: {
      [paramName: string]: { [localeFile: string]: string };
    } = {};
    let selectedMessage: ParsedMessage | null = null;

    // Select final messages according to priority order
    for (let i = localeFiles.length - 1; i >= 0; i--) {
      const file = localeFiles[i];
      if (file && localeMessages[file] && localeMessages[file][messageKey]) {
        selectedMessage = localeMessages[file][messageKey];
        break;
      }
    }

    if (!selectedMessage) continue;

    // Collect placeholder types in each locale file
    for (const file of localeFiles) {
      const message = localeMessages[file] && localeMessages[file][messageKey];
      if (message) {
        for (const placeholder of message.placeholders) {
          if (!placeholderTypeMap[placeholder.name]) {
            placeholderTypeMap[placeholder.name] = {};
          }
          const typeMap = placeholderTypeMap[placeholder.name];
          if (typeMap) {
            typeMap[file] = placeholder.type;
          }
        }
      }
    }

    // Placeholder type integrity checks
    const conflicts: PlaceholderTypeConflict[] = [];

    for (const [paramName, typesByFile] of Object.entries(placeholderTypeMap)) {
      const uniqueTypes = [...new Set(Object.values(typesByFile))];

      // Inconsistency if more than one type exists (including combinations of string and explicit types)
      if (uniqueTypes.length > 1) {
        conflicts.push({
          parameterName: paramName,
          conflicts: Object.entries(typesByFile).map(([file, type]) => ({
            localeFile: file,
            type,
          })),
        });
      }
    }

    if (conflicts.length > 0) {
      warnings.push({ key: messageKey, conflicts });
    }

    // Determine final type (preference given to explicit types)
    const finalPlaceholders = selectedMessage.placeholders.map(
      (placeholder) => {
        const typesByFile = placeholderTypeMap[placeholder.name];
        if (typesByFile) {
          // Use an explicit type other than 'string' if available
          const explicitTypes = Object.values(typesByFile).filter(
            (type) => type !== 'string'
          );
          if (explicitTypes.length > 0) {
            return {
              ...placeholder,
              type: explicitTypes[0] as PlaceholderInfo['type'],
            };
          }
        }
        return placeholder;
      }
    );

    aggregatedMessages[messageKey] = {
      ...selectedMessage,
      placeholders: finalPlaceholders,
    };
  }

  return { aggregatedMessages, warnings, invalidFiles };
};

const RESERVED_WORDS = new Set([
  'abstract',
  'any',
  'as',
  'asserts',
  'async',
  'await',
  'boolean',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'debugger',
  'declare',
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

const sanitizeIdentifier = (input: string): string => {
  let sanitized = input.replace(/[^A-Za-z0-9_$]/g, '_');

  if (sanitized.length === 0) {
    sanitized = '_';
  }

  if (/^[^A-Za-z_$]/.test(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  if (RESERVED_WORDS.has(sanitized)) {
    sanitized = `_${sanitized}`;
  }

  return sanitized;
};

const ensureUniqueIdentifier = (
  baseIdentifier: string,
  usedIdentifiers: Set<string>
): string => {
  let candidate = baseIdentifier;
  let index = 1;

  while (usedIdentifiers.has(candidate)) {
    candidate = `${baseIdentifier}_${index}`;
    index++;
  }

  usedIdentifiers.add(candidate);
  return candidate;
};

// Function to generate JSDoc comments for normal messages
const generateNormalJSDoc = (originalKey: string, fallback: string): string => {
  const escapedFallback = fallback.replace(/\*/g, '\\*');
  return `  /**
   * ${originalKey}: ${escapedFallback}
   */`;
};

// Function to generate JSDoc comments for warnings
const generateWarningJSDoc = (
  warning: MessageWarning,
  originalKey: string,
  fallback: string
): string => {
  const escapedFallback = fallback.replace(/\*/g, '\\*');
  const conflictDescriptions = warning.conflicts
    .map((conflict) => {
      const conflictDetails = conflict.conflicts
        .map((c) => `${c.localeFile}: ${c.type}`)
        .join(', ');
      return `   * - ${conflict.parameterName}: ${conflictDetails}`;
    })
    .join('\n');

  return `  /**
   * ${originalKey}: ${escapedFallback}
   * Warning: Placeholder types do not match across locales
${conflictDescriptions}
   */`;
};

// Message file generation function
const generateMessageFile = async (
  options: Required<TypedMessagePluginOptions>,
  rootDir: string,
  logger: Logger
): Promise<void> => {
  try {
    const localeDir = resolve(rootDir, options.localeDir);
    const outputPath = resolve(rootDir, options.outputPath);

    // Create locale directory if it doesn't exist
    if (!existsSync(localeDir)) {
      logger.warn(`Locale directory does not exist: ${localeDir}`);
      return;
    }

    // Read JSON files
    const localeFiles = await getLocaleFiles(
      localeDir,
      options.fallbackPriorityOrder,
      logger
    );
    const fallbackLocale =
      options.fallbackPriorityOrder.length > 0
        ? options.fallbackPriorityOrder[
            options.fallbackPriorityOrder.length - 1
          ]
        : undefined;
    const localeSymbols = localeFiles
      .map((file) => basename(file, extname(file)))
      .filter((locale) => locale !== fallbackLocale);
    const { aggregatedMessages, warnings, invalidFiles } =
      await checkPlaceholderTypeConsistency(localeFiles, localeDir, logger);

    // Generate TypeScript code
    const tsCode = generateTypeScriptCode(
      aggregatedMessages,
      warnings,
      invalidFiles,
      localeSymbols
    );

    // Create output directory
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      await mkdir(outputDir, { recursive: true });
    }

    // Write file
    await writeFile(outputPath, tsCode, 'utf-8');

    logger.info(
      `Generated typed messages: ${outputPath} (${Object.keys(aggregatedMessages).length} keys)`
    );

    // Warnings in logs
    if (warnings.length > 0) {
      logger.warn(
        `Placeholder type mismatches detected in ${warnings.length} message(s):`
      );
      warnings.forEach((warning) => {
        logger.warn(
          `  - ${warning.key}: ${warning.conflicts.map((c) => c.parameterName).join(', ')}`
        );
      });
    }

    if (invalidFiles.length > 0) {
      logger.warn(
        `${invalidFiles.length} invalid JSON file(s) detected: ${invalidFiles.join(', ')}`
      );
    }
  } catch (error) {
    logger.error(`Error generating message file: ${error}`);
  }
};

// Get locale file list
const getLocaleFiles = async (
  localeDir: string,
  fallbackPriorityOrder: string[],
  _logger: Logger
): Promise<string[]> => {
  if (!existsSync(localeDir)) {
    return [];
  }

  const files = await readdir(localeDir);
  const fileMap = new Map<string, string>();

  for (const file of files.sort().reverse()) {
    const filePath = join(localeDir, file);
    const stats = await stat(filePath);
    const isFile = stats.isFile();
    const ext = extname(file);
    const isJson = ext === '.json';
    const isJsonc = ext === '.jsonc';
    const isJson5 = ext === '.json5';

    if (isFile && (isJson5 || isJsonc || isJson)) {
      const bn = basename(file, ext);
      // Apply priority: json5 > jsonc > json
      if (
        !fileMap.has(bn) ||
        ext === '.json5' ||
        (ext === '.jsonc' && extname(fileMap.get(bn)!) === '.json')
      ) {
        fileMap.set(bn, file);
      }
    }
  }

  const filteredFiles = Array.from(fileMap.values());

  return filteredFiles.sort((a, b) => {
    // Get filename without extension
    const aExt = extname(a);
    const bExt = extname(b);
    const aBase = basename(a, aExt);
    const bBase = basename(b, bExt);

    // Get index in fallbackPriorityOrder array (-1 if not found)
    const aIndex = fallbackPriorityOrder.indexOf(aBase);
    const bIndex = fallbackPriorityOrder.indexOf(bBase);

    // If both are in fallbackPriorityOrder
    if (aIndex !== -1 && bIndex !== -1) {
      return aIndex - bIndex;
    }

    // If only a is in fallbackPriorityOrder (prioritize a)
    if (aIndex !== -1 && bIndex === -1) {
      return -1;
    }

    // If only b is in fallbackPriorityOrder (prioritize b)
    if (aIndex === -1 && bIndex !== -1) {
      return 1;
    }

    // If neither is in fallbackPriorityOrder (alphabetical order)
    return a.localeCompare(b);
  });
};

// TypeScript code generation
const generateTypeScriptCode = (
  messages: AggregatedMessages,
  warnings: MessageWarning[],
  invalidFiles: string[],
  locales: string[]
): string => {
  const entries = Object.entries(messages);
  const warningMap = new Map(warnings.map((w) => [w.key, w]));

  const usedIdentifiers = new Set<string>();

  const messageItems = entries
    .map(([originalKey, message]) => {
      const baseIdentifier = sanitizeIdentifier(originalKey);
      const sanitizedKey = ensureUniqueIdentifier(
        baseIdentifier,
        usedIdentifiers
      );
      const escapedKey = JSON.stringify(originalKey);
      const warning = warningMap.get(originalKey);
      const jsDocComment = warning
        ? generateWarningJSDoc(warning, originalKey, message.fallback)
        : generateNormalJSDoc(originalKey, message.fallback);

      if (message.placeholders.length === 0) {
        // SimpleMessageItem for non-parameterized messages
        const escapedFallback = JSON.stringify(message.fallback);
        return `${jsDocComment}
  ${sanitizedKey}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as SimpleMessageItem`;
      } else {
        // MessageItem for parameterized messages - use template string as fallback
        const escapedFallback = JSON.stringify(message.fallback);
        const typeString = generateObjectTypeString(message.placeholders);
        return `${jsDocComment}
  ${sanitizedKey}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as MessageItem<${typeString}>`;
      }
    })
    .join(',\n');

  // Generate JSDoc comments in case of invalid files
  const invalidFilesComment =
    invalidFiles.length > 0
      ? `/**
* Warning: Failed to load the following locale files
* ${invalidFiles.map((file) => ` * - ${file}`).join('\n')}
* These files are not included in the generated code.
*/
`
      : '';

  const localesExport = `/** All known locale symbols */
export const locales = [${locales
    .map((locale) => `'${locale.replace(/'/g, "\\'")}'`)
    .join(', ')}];

`;

  return `// This file is auto-generated by typed-message plugin
// Do not edit manually

import type { MessageItem, SimpleMessageItem } from 'typed-message';

${invalidFilesComment}${localesExport}export const messages = {
${messageItems}
} as const;

export default messages;
`;
};

//////////////////////////////////////////////////////////////////////////////////////////

// Default options
const defaultOptions: Required<TypedMessagePluginOptions> = {
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  fallbackPriorityOrder: ['en', 'fallback'],
};

/**
 * Vite plugin for automatic generation of type-safe internationalization messages
 *
 * This plugin scans JSON locale files, analyzes message patterns and placeholders,
 * then generates TypeScript code with proper type definitions. It supports:
 * - Automatic placeholder detection and type inference
 * - Hot reload during development when locale files change
 * - Configurable fallback priority order
 * - Generation of both SimpleMessageItem and MessageItem types
 *
 * The generated code provides compile-time type safety for message keys and parameters,
 * ensuring that parameterized messages receive the correct argument types.
 *
 * @param options - Plugin configuration options
 * @returns Vite plugin instance with build-time code generation and hot reload support
 *
 * @example
 * ```typescript
 * // vite.config.ts
 * import { defineConfig } from 'vite';
 * import typedMessage from 'typed-message/vite';
 *
 * export default defineConfig({
 *   plugins: [
 *     typedMessage({
 *       localeDir: 'locale',
 *       outputPath: 'src/generated/messages.ts'
 *     })
 *   ]
 * });
 * ```
 */
const typedMessage = (options: TypedMessagePluginOptions = {}): Plugin => {
  const opts = { ...defaultOptions, ...options };
  let rootDir = '';

  // Create logger instance
  let logger = createConsoleLogger('typed-message-vite');

  return {
    name: 'typed-message',
    configResolved: (config) => {
      rootDir = config.root || process.cwd();
      // Use Vite logger if available, otherwise fall back to console logger
      if (config.customLogger || config.logger) {
        logger = createViteLoggerAdapter(
          config.customLogger || config.logger,
          config.logLevel ?? 'info',
          'typed-message-vite'
        );
      }
      logger.info(`${version}-${git_commit_hash}: Started.`);
      logger.info(
        `Locale dir: "${opts.localeDir}", Output: "${opts.outputPath}"`
      );
    },
    buildStart: () => {
      // Generate message file at build start
      return generateMessageFile(opts, rootDir, logger);
    },
    handleHotUpdate: async ({ file, server }) => {
      // Handle hot reload
      if (file.includes(opts.localeDir)) {
        logger.info('Locale file changed, regenerating messages...');
        await generateMessageFile(opts, rootDir, logger);
        server.ws.send({
          type: 'full-reload',
        });
      }
    },
  };
};

/**
 * Backward compatibility symbol, use `typedMessage` default symbol instead.
 * @deprecated Backward compatibility symbol, use `typedMessage` default symbol instead.
 */
export const typedMessagePlugin = typedMessage;

/**
 * Plugin standalone export (for separate entry point)
 */
export default typedMessage;
