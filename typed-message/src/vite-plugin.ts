// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import type { Plugin } from 'vite';
import { existsSync } from 'fs';
import { readFile, readdir, stat, writeFile, mkdir } from 'fs/promises';
import { join, resolve, dirname, extname, basename } from 'path';
import JSON5 from 'json5';
import { createConsoleLogger, createViteLoggerAdapter, Logger } from './logger';
import { version, git_commit_hash } from './generated/packageMetadata';
import { ensureUniqueIdentifier, sanitizeIdentifier } from './util';

//////////////////////////////////////////////////////////////////////////////////////////

/**
 * Type for placeholder analysis results
 *
 * Contains information about a single placeholder found in a message template.
 * Used by the Vite plugin during code generation to analyze message patterns
 * and generate appropriate TypeScript types.
 *
 * @example
 * ```typescript
 * const placeholder: PlaceholderInfo = {
 *   name: "userName",
 *   type: "string",
 *   position: 0
 * };
 * ```
 */
interface PlaceholderInfo {
  /** The name of the placeholder variable (e.g., "name" from "{name}") */
  name: string;
  /** The TypeScript type of the placeholder value */
  type: 'string' | 'number' | 'boolean' | 'date';
  /** The position of this placeholder in the parameter list (0-based index) */
  position: number;
}

/**
 * Type for message analysis results
 *
 * Contains comprehensive information about a parsed message template,
 * including its placeholders and fallback content. Used by the Vite plugin
 * to generate type-safe message definitions.
 *
 * @example
 * ```typescript
 * const parsedMessage: ParsedMessage = {
 *   key: "WELCOME_USER",
 *   template: "Hello {name}, you are {age:number} years old!",
 *   placeholders: [
 *     { name: "name", type: "string", position: 0 },
 *     { name: "age", type: "number", position: 1 }
 *   ],
 *   fallback: "Hello {name}, you are {age:number} years old!"
 * };
 * ```
 */
interface ParsedMessage {
  /** The message key identifier */
  key: string;
  /** The original message template with placeholder syntax */
  template: string;
  /** Array of placeholder information found in the template */
  placeholders: PlaceholderInfo[];
  /** The fallback message text to use when translation is not available */
  fallback: string;
}

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

//////////////////////////////////////////////////////////////////////////////////////////

/**
 * Simplified representation of locale JSON content.
 * Maps message keys to their string templates.
 */
interface LocaleData {
  [key: string]: string;
}

/** Represents reconciled messages bundled with placeholder metadata. */
interface AggregatedMessages {
  [key: string]: ParsedMessage;
}

/**
 * Captures conflicting placeholder typing information across locales.
 * Associates a parameter name with the locale file and detected type.
 */
interface PlaceholderTypeConflict {
  parameterName: string;
  conflicts: { localeFile: string; type: string }[];
}

/**
 * Describes placeholder mismatches discovered for a specific message key.
 * Used to emit aggregated warnings and annotate generated output.
 */
interface MessageWarning {
  key: string;
  conflicts: PlaceholderTypeConflict[];
}

/**
 * Global regular expression that extracts placeholder segments from message templates.
 * Supports optional type suffixes in the `{name:type}` format.
 */
const PLACEHOLDER_REGEX = /\{(\w+)(?::(\w+))?\}/g;

/**
 * Extracts placeholder metadata from a message template.
 * @param message - Raw message string potentially containing `{name:type}` tokens.
 * @returns Ordered collection of placeholder descriptors discovered in the template.
 */
const parsePlaceholders = (message: string) => {
  // Collect metadata for every placeholder embedded in the template string.
  const placeholders: PlaceholderInfo[] = [];
  // Iterate over regex matches reusing the compiled global expression.
  let match;
  // Maintain ordinal position so generated tuples keep the original order.
  let position = 0;

  // Extract placeholders using regular expression
  while ((match = PLACEHOLDER_REGEX.exec(message)) !== null) {
    // Capture the placeholder name and optional explicit type suffix.
    const [, name, type = 'string'] = match;
    if (name) {
      // Store placeholder information for downstream type generation.
      placeholders.push({
        name,
        type: type as PlaceholderInfo['type'],
        position,
      });
    }
    // Advance position even if the name resolves to a duplicate placeholder.
    position++;
  }

  // Returning a flat list keeps the rest of the pipeline functional.
  return placeholders;
};

/**
 * Builds a parsed message including placeholder metadata and fallback text.
 * @param key - Message identifier taken from the locale file.
 * @param messageData - Raw message template string for the current locale.
 * @param fallback - Fallback string to use when no locale-specific text is available.
 * @returns Structured message ready for aggregation and type inference.
 */
const parseMessage = (
  key: string,
  messageData: string,
  fallback: string
): ParsedMessage => {
  // Extract structured placeholder information from the raw message value.
  const placeholders = parsePlaceholders(messageData);
  return {
    key,
    // Preserve the original template text for runtime formatting.
    template: messageData,
    placeholders,
    // Use the source locale string as the default fallback.
    fallback,
  };
};

/**
 * Builds a TypeScript type literal describing the placeholders used by a message.
 * @param placeholders - Collection of placeholders associated with a message key.
 * @returns Type literal expressed as a string for use inside generated source.
 */
const generateObjectTypeString = (placeholders: PlaceholderInfo[]) => {
  if (placeholders.length === 0) {
    return '{}';
  }

  // Build up each placeholder property so message arguments remain strongly typed.
  const objectProperties = placeholders.map((p) => {
    // Resolve the placeholder's domain specific type into a TypeScript primitive.
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

  // Join the properties into a structural type literal exposed to callers.
  return `{ ${objectProperties.join('; ')} }`;
};

/**
 * Validates placeholder type consistency across all locale files and merges results.
 * @param localeFiles - Ordered list of locale file names participating in generation.
 * @param localeDir - Absolute path to the directory containing locale files.
 * @param logger - Logger instance used to report warnings and diagnostics.
 * @returns Aggregated messages together with warnings and a list of invalid files.
 */
const checkPlaceholderTypeConsistency = async (
  localeFiles: string[],
  localeDir: string,
  logger: Logger
) => {
  // Analyze messages in each locale file individually
  // Build a map so we can inspect placeholder shapes per locale later on.
  const localeMessages: {
    [localeFile: string]: { [key: string]: ParsedMessage };
  } = {};
  // Track every message key discovered regardless of the source locale.
  const allMessageKeys = new Set<string>();
  // Remember files that could not be parsed for warning reporting downstream.
  const invalidFiles: string[] = [];

  for (const file of localeFiles) {
    const filePath = join(localeDir, file);

    try {
      // Read and parse the locale file using JSON5 to support relaxed syntax.
      const content = await readFile(filePath, 'utf-8');
      const localeData: LocaleData = JSON5.parse(content);

      localeMessages[file] = {};

      Object.entries(localeData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          if (!localeMessages[file]) {
            localeMessages[file] = {};
          }
          // Store the parsed message so we can merge placeholders later.
          localeMessages[file][key] = parseMessage(key, value, value);
          // Record each key so consistency checks cover every available message.
          allMessageKeys.add(key);
        }
      });
    } catch (error) {
      logger.error(`Error reading locale file ${file}: ${error}`);
      // Continue processing even if an error occurs and add to the list of invalid files
      // Defer to the warnings system so the build can still succeed gracefully.
      invalidFiles.push(file);
      continue;
    }
  }

  // Placeholder type consistency check for each message key
  const warnings: MessageWarning[] = [];
  // Store the final reconciled message definitions keyed by message id.
  const aggregatedMessages: AggregatedMessages = {};

  for (const messageKey of allMessageKeys) {
    // Combine placeholder details across files to detect conflicts by name.
    const placeholderTypeMap: {
      [paramName: string]: { [localeFile: string]: string };
    } = {};
    // Track the message selected after applying the configured fallback order.
    let selectedMessage: ParsedMessage | null = null;

    // Select final messages according to priority order
    for (let i = localeFiles.length - 1; i >= 0; i--) {
      const file = localeFiles[i];
      if (file && localeMessages[file] && localeMessages[file][messageKey]) {
        // First match wins because we iterate from lowest to highest priority.
        selectedMessage = localeMessages[file][messageKey];
        break;
      }
    }

    // Skip keys that appear only in invalid or unreadable locale files.
    if (!selectedMessage) continue;

    // Collect placeholder types in each locale file
    for (const file of localeFiles) {
      const message = localeMessages[file] && localeMessages[file][messageKey];
      if (message) {
        // Walk every placeholder defined within the specific locale message.
        for (const placeholder of message.placeholders) {
          if (!placeholderTypeMap[placeholder.name]) {
            placeholderTypeMap[placeholder.name] = {};
          }
          const typeMap = placeholderTypeMap[placeholder.name];
          if (typeMap) {
            // Record the placeholder type exposed by the current locale file.
            typeMap[file] = placeholder.type;
          }
        }
      }
    }

    // Placeholder type integrity checks
    const conflicts: PlaceholderTypeConflict[] = [];

    for (const [paramName, typesByFile] of Object.entries(placeholderTypeMap)) {
      // Observe how many unique placeholder types share the same parameter name.
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
      // Surface parameter conflicts to the consumer for manual resolution.
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
            // Prefer explicit types to keep consumers aligned with stricter locales.
            return {
              ...placeholder,
              type: explicitTypes[0] as PlaceholderInfo['type'],
            };
          }
        }
        // Fall back to the original definition when no discrepancies were detected.
        return placeholder;
      }
    );

    aggregatedMessages[messageKey] = {
      ...selectedMessage,
      // Replace the raw placeholders with the reconciled, type-safe variant.
      placeholders: finalPlaceholders,
    };
  }

  return { aggregatedMessages, warnings, invalidFiles };
};

// List of disallowed identifiers to prevent generating invalid TypeScript names.

/**
 * Builds a JSDoc block for non-parameterized messages in the generated file.
 * @param originalKey - Message key as defined in the locale source.
 * @param fallback - Fallback string that will appear in the generated docs.
 * @returns Multiline string representing the JSDoc comment.
 */
const generateNormalJSDoc = (originalKey: string, fallback: string): string => {
  // Escape asterisks so the generated block comment stays valid.
  const escapedFallback = fallback.replace(/\*/g, '\\*');
  return `  /**
   * ${originalKey} ==> "${escapedFallback}"
   */`;
};

/**
 * Builds a JSDoc block that includes placeholder conflict details for a message.
 * @param warning - Placeholder mismatch descriptor associated with the message.
 * @param originalKey - Message key as defined in the locale source.
 * @param fallback - Fallback string that will appear in the generated docs.
 * @returns Multiline string representing the conflict-aware JSDoc comment.
 */
const generateWarningJSDoc = (
  warning: MessageWarning,
  originalKey: string,
  fallback: string
): string => {
  const escapedFallback = fallback.replace(/\*/g, '\\*');
  // Describe every conflicting locale so developers can reconcile differences.
  const conflictDescriptions = warning.conflicts
    .map((conflict) => {
      const conflictDetails = conflict.conflicts
        .map((c) => `${c.localeFile}: ${c.type}`)
        .join(', ');
      return `   * - ${conflict.parameterName}: ${conflictDetails}`;
    })
    .join('\n');

  return `  /**
   * ${originalKey} ==> "${escapedFallback}"
   * Warning: Placeholder types do not match across locales
${conflictDescriptions}
   */`;
};

/**
 * Generates the TypeScript message module based on available locale files.
 * @param options - Fully resolved plugin configuration including defaults.
 * @param rootDir - Project root directory resolved from the Vite config.
 * @param logger - Logger for reporting progress and issues during generation.
 */
const generateMessageFile = async (
  options: Required<TypedMessagePluginOptions>,
  rootDir: string,
  logger: Logger
): Promise<void> => {
  try {
    // Resolve absolute paths so the plugin works regardless of Vite root.
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
    // The last entry in the priority list becomes our implicit fallback locale.
    const fallbackLocale =
      options.fallbackPriorityOrder.length > 0
        ? options.fallbackPriorityOrder[
            options.fallbackPriorityOrder.length - 1
          ]
        : undefined;
    // Strip out the fallback locale when building the exportable locale list.
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
    // The generated source includes diagnostics, exports, and type metadata.

    // Create output directory
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      // Ensure the destination directory hierarchy exists before writing files.
      await mkdir(outputDir, { recursive: true });
    }

    // Write file
    await writeFile(outputPath, tsCode, 'utf-8');

    // Provide quick feedback in both build and dev workflows.
    logger.info(
      `Generated typed messages: ${outputPath} (${Object.keys(aggregatedMessages).length} keys)`
    );

    // Warnings in logs
    if (warnings.length > 0) {
      logger.warn(
        `Placeholder type mismatches detected in ${warnings.length} message(s):`
      );
      // Output each parameter name so developers can locate mismatched locales quickly.
      warnings.forEach((warning) => {
        logger.warn(
          `  - ${warning.key}: ${warning.conflicts.map((c) => c.parameterName).join(', ')}`
        );
      });
    }

    if (invalidFiles.length > 0) {
      // Highlight files that failed parsing so they can be fixed or removed.
      logger.warn(
        `${invalidFiles.length} invalid JSON file(s) detected: ${invalidFiles.join(', ')}`
      );
    }
  } catch (error) {
    logger.error(`Error generating message file: ${error}`);
  }
};

/**
 * Collects locale file names while respecting format priority and fallback order.
 * @param localeDir - Absolute path to the locale directory.
 * @param fallbackPriorityOrder - Array defining locale precedence for fallbacks.
 * @param _logger - Logger placeholder for future diagnostic use.
 * @returns Sorted list of locale file names chosen for generation.
 */
const getLocaleFiles = async (
  localeDir: string,
  fallbackPriorityOrder: string[],
  _logger: Logger
): Promise<string[]> => {
  if (!existsSync(localeDir)) {
    return [];
  }

  // Load the directory contents so we can evaluate each candidate locale file.
  const files = await readdir(localeDir);
  // Track the preferred file extension for each locale basename.
  const fileMap = new Map<string, string>();

  // Sort so higher priority extensions appear first when iterating.
  for (const file of files.sort().reverse()) {
    const filePath = join(localeDir, file);
    const stats = await stat(filePath);
    // Skip directories and focus only on locale candidates.
    const isFile = stats.isFile();
    const ext = extname(file);
    // Support JSON, JSONC, and JSON5 so teams can choose their preferred format.
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
        // Favor richer formats so comments and relaxed syntax win over vanilla JSON.
        fileMap.set(bn, file);
      }
    }
  }

  // Convert the map back into a plain array for prioritised sorting.
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
    // Keep alphabetical ordering stable so generated output remains deterministic.
    return a.localeCompare(b);
  });
};

/**
 * Emits the final TypeScript source containing message definitions and metadata.
 * @param messages - Aggregated message map with resolved placeholders.
 * @param warnings - Placeholder conflict warnings to surface in generated JSDoc.
 * @param invalidFiles - List of locale files that failed to load.
 * @param locales - Locale symbols to export for runtime enumeration.
 * @returns TypeScript source string ready to be written to disk.
 */
const generateTypeScriptCode = (
  messages: AggregatedMessages,
  warnings: MessageWarning[],
  invalidFiles: string[],
  locales: string[]
): string => {
  const entries = Object.entries(messages);
  // Quick lookup for warnings so we can annotate problematic message keys.
  const warningMap = new Map(warnings.map((w) => [w.key, w]));

  // Deduplicate generated identifier names to avoid collisions.
  const usedIdentifiers = new Set<string>();

  // Map each message into an exportable structure with documentation and types.
  const messageItems = entries
    .map(([originalKey, message]) => {
      // Start with a sanitized identifier derived from the message key.
      const baseIdentifier = sanitizeIdentifier(originalKey);
      const sanitizedKey = ensureUniqueIdentifier(
        baseIdentifier,
        usedIdentifiers
      );
      // Quote the original message key so special characters remain intact.
      const escapedKey = JSON.stringify(originalKey);
      const warning = warningMap.get(originalKey);
      // Select the appropriate JSDoc factory depending on conflict presence.
      const jsDocComment = warning
        ? generateWarningJSDoc(warning, originalKey, message.fallback)
        : generateNormalJSDoc(originalKey, message.fallback);

      if (message.placeholders.length === 0) {
        // SimpleMessageItem for non-parameterized messages
        // Ensure fallback strings are properly escaped for inclusion in code.
        const escapedFallback = JSON.stringify(message.fallback);
        // Emit a lightweight structure when the message takes no parameters.
        return `${jsDocComment}
  ${sanitizedKey}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as SimpleMessageItem`;
      } else {
        // MessageItem for parameterized messages - use template string as fallback
        // Serialize the fallback template to preserve braces and formatting.
        const escapedFallback = JSON.stringify(message.fallback);
        const typeString = generateObjectTypeString(message.placeholders);
        // Attach placeholder object types so consumers receive rich intellisense.
        return `${jsDocComment}
  ${sanitizedKey}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as MessageItem<${typeString}>`;
      }
    })
    .join(',\n');

  // Only import helper types when at least one message is present.
  const importStatement =
    entries.length === 0
      ? ''
      : "import type { MessageItem, SimpleMessageItem } from 'typed-message';\n\n";

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

  // Export the list of locales so runtime code can iterate over available translations.
  const localesExport = `/** All known locale symbols */
export const locales = [${locales
    .map((locale) => `'${locale.replace(/'/g, "\\'")}'`)
    .join(', ')}];

`;

  // Compose the final output including optional imports and diagnostic comments.
  return `// @ts-nocheck
// This file is auto-generated by typed-message plugin
// Do not edit manually

${importStatement}${invalidFilesComment}${localesExport}/**
 * Type-safe message symbols generated by typed-message
 */
export const messages = {
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
  // Merge user provided overrides with sensible defaults.
  const opts = { ...defaultOptions, ...options };
  // Resolved once Vite shares the actual project root.
  let rootDir = '';

  // Create logger instance
  // Start with the console logger and swap in Vite's logger when available.
  let logger = createConsoleLogger('typed-message-vite');

  return {
    name: 'typed-message',
    configResolved: (config) => {
      // Capture the root directory to support monorepos and custom project layouts.
      rootDir = config.root || process.cwd();
      // Use Vite logger if available, otherwise fall back to console logger
      if (config.customLogger || config.logger) {
        logger = createViteLoggerAdapter(
          config.customLogger || config.logger,
          config.logLevel ?? 'info',
          'typed-message-vite'
        );
      }
      // Log plugin version details so diagnostics are easier to correlate.
      logger.info(`${version}-${git_commit_hash}: Started.`);
      logger.info(
        `Locale dir: "${opts.localeDir}", Output: "${opts.outputPath}"`
      );
    },
    buildStart: () => {
      // Generate message file at build start
      // Returning the promise lets Vite wait for the initial generation step.
      return generateMessageFile(opts, rootDir, logger);
    },
    handleHotUpdate: async ({ file, server }) => {
      // Handle hot reload
      if (file.includes(opts.localeDir)) {
        // Regenerate the TypeScript output whenever a locale asset changes.
        logger.info('Locale file changed, regenerating messages...');
        await generateMessageFile(opts, rootDir, logger);
        // Ask Vite's dev server to reload so consumers pick up the new messages.
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
