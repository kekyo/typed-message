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

// Regular expression for placeholder analysis
const PLACEHOLDER_REGEX = /\{(\w+)(?::(\w+))?\}/g;

// Function to parse placeholders
function parsePlaceholders(message: string): PlaceholderInfo[] {
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
function parseMessage(key: string, messageData: string, fallback: string): ParsedMessage {
  const placeholders = parsePlaceholders(messageData);
  return {
    key,
    template: messageData,
    placeholders,
    fallback,
  };
}

// Generate TypeScript named tuple type string
function generateNamedTupleTypeString(placeholders: PlaceholderInfo[]): string {
  if (placeholders.length === 0) {
    return 'readonly []';
  }
  
  const namedTypes = placeholders.map(p => {
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
  
  return `readonly [${namedTypes.join(', ')}]`;
}

// Generate formatter function
function generateFormatter(template: string, placeholders: PlaceholderInfo[]): string {
  if (placeholders.length === 0) {
    return `() => \`${template.replace(/`/g, '\\`')}\``;
  }
  
  const paramNames = placeholders.map(p => p.name);
  const paramTypes = placeholders.map(p => {
    switch (p.type) {
      case 'number': return 'number';
      case 'boolean': return 'boolean';
      case 'date': return 'Date';
      default: return 'string';
    }
  });
  
  const params = paramNames.map((name, i) => `${name}: ${paramTypes[i]}`).join(', ');
  
  // Create template string (replace placeholders with ${variableName})
  let formattedTemplate = template;
  placeholders.forEach(placeholder => {
    const regex = new RegExp(`\\{${placeholder.name}(?::\\w+)?\\}`, 'g');
    formattedTemplate = formattedTemplate.replace(regex, `\${${placeholder.name}}`);
  });
  
  return `(${params}) => \`${formattedTemplate.replace(/`/g, '\\`')}\``;
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
function generateMessageFile(options: Required<TypedMessagePluginOptions>, rootDir: string) {
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
    const aggregatedMessages = aggregateMessages(localeFiles, localeDir);
    
    // Generate TypeScript code
    const tsCode = generateTypeScriptCode(aggregatedMessages);
    
    // Create output directory
    const outputDir = dirname(outputPath);
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
    
    // Write file
    writeFileSync(outputPath, tsCode, 'utf-8');
    
    console.log(`Generated typed messages: ${outputPath} (${Object.keys(aggregatedMessages).length} keys)`);
  } catch (error) {
    console.error('Error generating message file:', error);
  }
}

// Get locale file list
function getLocaleFiles(localeDir: string, fallbackPriorityOrder: string[]): string[] {
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

// Message aggregation
function aggregateMessages(localeFiles: string[], localeDir: string): AggregatedMessages {
  const aggregated: { [key: string]: string } = {};
  
  // Process files according to priority (last element has highest priority)
  // Process sorted array in forward order so last element is merged last
  for (let i = 0; i < localeFiles.length; i++) {
    const file = localeFiles[i];
    const filePath = join(localeDir, file);
    
    try {
      const content = readFileSync(filePath, 'utf-8');
      const localeData: LocaleData = JSON.parse(content);
      
      // Extract only string values
      const stringData: { [key: string]: string } = {};
      Object.entries(localeData).forEach(([key, value]) => {
        if (typeof value === 'string') {
          stringData[key] = value;
        }
      });
      
      // Later merged files overwrite
      Object.assign(aggregated, stringData);
      
      console.log(`Loaded locale file: ${file} (${Object.keys(stringData).length} keys)`);
    } catch (error) {
      console.error(`Error reading locale file ${file}:`, error);
    }
  }
  
  // Convert to ParsedMessage format
  const result: AggregatedMessages = {};
  Object.entries(aggregated).forEach(([key, fallback]) => {
    result[key] = parseMessage(key, fallback, fallback);
  });
  
  return result;
}

// TypeScript code generation
function generateTypeScriptCode(messages: AggregatedMessages): string {
  const entries = Object.entries(messages);
  
  const messageItems = entries
    .map(([key, message]) => {
      const escapedKey = JSON.stringify(key);
      
      if (message.placeholders.length === 0) {
        // SimpleMessageItem for non-parameterized messages
        const escapedFallback = JSON.stringify(message.fallback);
        return `  ${key}: { 
    key: ${escapedKey}, 
    fallback: ${escapedFallback} 
  } as SimpleMessageItem`;
      } else {
        // MessageItem for parameterized messages - use formatter as fallback
        const formatter = generateFormatter(message.template, message.placeholders);
        const typeString = generateNamedTupleTypeString(message.placeholders);
        return `  ${key}: { 
    key: ${escapedKey}, 
    fallback: ${formatter} 
  } as MessageItem<${typeString}>`;
      }
    })
    .join(',\n');

  return `// This file is auto-generated by typed-message plugin
// Do not edit manually

import type { MessageItem, SimpleMessageItem } from 'typed-message';

export const messages = {
${messageItems}
} as const;
`;
}

// Plugin standalone export (for separate entry point)
export default typedMessagePlugin;
