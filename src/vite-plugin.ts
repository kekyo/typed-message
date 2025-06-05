import type { Plugin } from 'vite';
import { readFileSync, existsSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'fs';
import { join, resolve, dirname, extname, basename } from 'path';
import type { PlaceholderInfo, ParsedMessage } from './types';

/**
 * Configuration options for the typed-message Vite plugin
 * 
 * Defines how the plugin should process locale files and generate TypeScript code.
 * The plugin automatically scans JSON files in the specified directory and generates
 * type-safe message definitions with proper fallback handling.
 * 
 * @example
 * ```typescript
 * import { typedMessagePlugin } from 'typed-message/vite';
 * 
 * // Basic usage with defaults
 * typedMessagePlugin()
 * 
 * // Custom configuration
 * typedMessagePlugin({
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

// Default options
const defaultOptions: Required<TypedMessagePluginOptions> = {
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  fallbackPriorityOrder: ['en', 'fallback'],
};

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
const parsePlaceholders = (message: string): PlaceholderInfo[] => {
  const placeholders: PlaceholderInfo[] = [];
  let match;
  let position = 0;
  
  // Extract placeholders using regular expression
  while ((match = PLACEHOLDER_REGEX.exec(message)) !== null) {
    const [, name, type = 'string'] = match;
    placeholders.push({
      name,
      type: type as PlaceholderInfo['type'],
      position,
    });
    position++;
  }
  
  return placeholders;
}

// Parse message and generate PlaceholderInfo
const parseMessage = (key: string, messageData: string, fallback: string): ParsedMessage => {
  const placeholders = parsePlaceholders(messageData);
  return {
    key,
    template: messageData,
    placeholders,
    fallback,
  };
}

// Generate TypeScript named tuple type string
const generateObjectTypeString = (placeholders: PlaceholderInfo[]): string => {
  if (placeholders.length === 0) {
    return '{}';
  }
  
  const objectProperties = placeholders.map(p => {
    const tsType = (() => {
      switch (p.type) {
        case 'number': return 'number';
        case 'boolean': return 'boolean';
        case 'date': return 'Date';
        default: return 'string';
      }
    })();
    return `${p.name}: ${tsType}`;
  });
  
  return `{ ${objectProperties.join('; ')} }`;
}

// Function to check placeholder type consistency across locales
const checkPlaceholderTypeConsistency = (
  localeFiles: string[], 
  localeDir: string
): { aggregatedMessages: AggregatedMessages; warnings: MessageWarning[]; invalidFiles: string[] } => {
  // Analyze messages in each locale file individually
  const localeMessages: { [localeFile: string]: { [key: string]: ParsedMessage } } = {};
  const allMessageKeys = new Set<string>();
  const invalidFiles: string[] = [];
  
  for (const file of localeFiles) {
    const filePath = join(localeDir, file);
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const localeData: LocaleData = JSON.parse(content);
      
      localeMessages[file] = {};
      
      Object.entries(localeData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          localeMessages[file][key] = parseMessage(key, value, value);
          allMessageKeys.add(key);
        }
      });
    } catch (error) {
      console.error(`Error reading locale file ${file}:`, error);
      // Continue processing even if an error occurs and add to the list of invalid files
      invalidFiles.push(file);
      continue;
    }
  }
  
  // Placeholder type consistency check for each message key
  const warnings: MessageWarning[] = [];
  const aggregatedMessages: AggregatedMessages = {};
  
  for (const messageKey of allMessageKeys) {
    const placeholderTypeMap: { [paramName: string]: { [localeFile: string]: string } } = {};
    let selectedMessage: ParsedMessage | null = null;
    
    // Select final messages according to priority order
    for (let i = localeFiles.length - 1; i >= 0; i--) {
      const file = localeFiles[i];
      if (localeMessages[file] && localeMessages[file][messageKey]) {
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
          placeholderTypeMap[placeholder.name][file] = placeholder.type;
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
          conflicts: Object.entries(typesByFile).map(([file, type]) => ({ localeFile: file, type }))
        });
      }
    }
    
    if (conflicts.length > 0) {
      warnings.push({ key: messageKey, conflicts });
    }
    
    // Determine final type (preference given to explicit types)
    const finalPlaceholders = selectedMessage.placeholders.map(placeholder => {
      const typesByFile = placeholderTypeMap[placeholder.name];
      if (typesByFile) {
        // Use an explicit type other than 'string' if available
        const explicitTypes = Object.values(typesByFile).filter(type => type !== 'string');
        if (explicitTypes.length > 0) {
          return { ...placeholder, type: explicitTypes[0] as PlaceholderInfo['type'] };
        }
      }
      return placeholder;
    });
    
    aggregatedMessages[messageKey] = {
      ...selectedMessage,
      placeholders: finalPlaceholders
    };
  }
  
  return { aggregatedMessages, warnings, invalidFiles };
}

// Function to generate JSDoc comments for warnings
const generateWarningJSDoc = (warning: MessageWarning): string => {
  const conflictDescriptions = warning.conflicts.map(conflict => {
    const conflictDetails = conflict.conflicts
      .map(c => `${c.localeFile}: ${c.type}`)
      .join(', ');
    return `   * - ${conflict.parameterName}: ${conflictDetails}`;
  }).join('\n');
  
  return `  /**
   * Warning: Placeholder types do not match across locales
${conflictDescriptions}
   */`;
}

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
 * import { typedMessagePlugin } from 'typed-message/vite';
 * 
 * export default defineConfig({
 *   plugins: [
 *     typedMessagePlugin({
 *       localeDir: 'locale',
 *       outputPath: 'src/generated/messages.ts'
 *     })
 *   ]
 * });
 * ```
 */
export const typedMessagePlugin = (options: TypedMessagePluginOptions = {}): Plugin => {
  const opts = { ...defaultOptions, ...options };
  let rootDir = '';
  
  return {
    name: 'typed-message',
    configResolved(config) {
      rootDir = config.root || process.cwd();
      console.log(`TypedMessage plugin initialized. Locale dir: ${opts.localeDir}, Output: ${opts.outputPath}`);
    },
    buildStart() {
      // Generate message file at build start
      generateMessageFile(opts, rootDir);
    },
    handleHotUpdate({ file, server }) {
      // Handle hot reload
      if (file.includes(opts.localeDir)) {
        console.log('Locale file changed, regenerating messages...');
        generateMessageFile(opts, rootDir);
        server.ws.send({
          type: 'full-reload',
        });
      }
    },
  };
};

// Message file generation function
const generateMessageFile = (options: Required<TypedMessagePluginOptions>, rootDir: string) => {
  try {
    const localeDir = resolve(rootDir, options.localeDir);
    const outputPath = resolve(rootDir, options.outputPath);
    
    // Create locale directory if it doesn't exist
    if (!existsSync(localeDir)) {
      console.warn(`Locale directory does not exist: ${localeDir}`);
      return;
    }

    // Read JSON files
    const localeFiles = getLocaleFiles(localeDir, options.fallbackPriorityOrder);
    const { aggregatedMessages, warnings, invalidFiles } = checkPlaceholderTypeConsistency(localeFiles, localeDir);
    
    // Generate TypeScript code
    const tsCode = generateTypeScriptCode(aggregatedMessages, warnings, invalidFiles);
    
    // Create output directory
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Write file
    writeFileSync(outputPath, tsCode, 'utf-8');
    
    console.log(`Generated typed messages: ${outputPath} (${Object.keys(aggregatedMessages).length} keys)`);
    
    // Warnings in logs
    if (warnings.length > 0) {
      console.warn(`Placeholder type mismatches detected in ${warnings.length} message(s):`);
      warnings.forEach(warning => {
        console.warn(`  - ${warning.key}: ${warning.conflicts.map(c => c.parameterName).join(', ')}`);
      });
    }

    if (invalidFiles.length > 0) {
      console.warn(`${invalidFiles.length} invalid JSON file(s) detected:`, invalidFiles);
    }
  } catch (error) {
    console.error('Error generating message file:', error);
  }
}

// Get locale file list
const getLocaleFiles = (localeDir: string, fallbackPriorityOrder: string[]): string[] => {
  if (!existsSync(localeDir)) {
    return [];
  }
  
  return readdirSync(localeDir)
    .filter(file => {
      const filePath = join(localeDir, file);
      const isFile = statSync(filePath).isFile();
      const isJson = extname(file) === '.json';
      return isFile && isJson;
    })
    .sort((a, b) => {
      // Get filename without extension
      const aBase = basename(a, '.json');
      const bBase = basename(b, '.json');

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
}

// TypeScript code generation
const generateTypeScriptCode = (messages: AggregatedMessages, warnings: MessageWarning[], invalidFiles: string[]): string => {
  const entries = Object.entries(messages);
  const warningMap = new Map(warnings.map(w => [w.key, w]));
  
  const messageItems = entries
    .map(([key, message]) => {
      const escapedKey = JSON.stringify(key);
      const warning = warningMap.get(key);
      const warningComment = warning ? generateWarningJSDoc(warning) : '';
      
      if (message.placeholders.length === 0) {
        // SimpleMessageItem for non-parameterized messages
        const escapedFallback = JSON.stringify(message.fallback);
        return `${warningComment}${warningComment ? '\n' : ''}  ${key}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as SimpleMessageItem`;
      } else {
        // MessageItem for parameterized messages - use template string as fallback
        const escapedFallback = JSON.stringify(message.fallback);
        const typeString = generateObjectTypeString(message.placeholders);
        return `${warningComment}${warningComment ? '\n' : ''}  ${key}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as MessageItem<${typeString}>`;
      }
    })
    .join(',\n');

  // Generate JSDoc comments in case of invalid files
  const invalidFilesComment = invalidFiles.length > 0 
    ? `/**
 * Warning: Failed to load the following locale files
 * ${invalidFiles.map(file => ` * - ${file}`).join('\n')}
 * These files are not included in the generated code.
 */
`
    : '';

  return `// This file is auto-generated by typed-message plugin
// Do not edit manually

import type { MessageItem, SimpleMessageItem } from 'typed-message';

${invalidFilesComment}export const messages = {
${messageItems}
} as const;
`;
}

// Plugin standalone export (for separate entry point)
export default typedMessagePlugin;
