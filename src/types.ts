/**
 * Type definition for non-parameterized message items
 * 
 * Represents a simple message that doesn't require any parameters for formatting.
 * Used for basic text messages that are displayed as-is from the locale dictionary.
 * 
 * @example
 * ```typescript
 * const simpleMessage: SimpleMessageItem = {
 *   key: "WELCOME_MESSAGE",
 *   fallback: "Welcome"
 * };
 * ```
 */
export interface SimpleMessageItem {
  /** The key to search for in the message dictionary */
  key: string;
  /** The fallback text to display when the key is not found in the dictionary */
  fallback: string;
}

/**
 * Type definition for parameterized message items with generic support
 * 
 * Represents a message that requires parameters for formatting, such as user names,
 * counts, dates, etc. The generic type T ensures type safety for the parameters
 * passed to the formatter function.
 * 
 * @template T - A readonly tuple type representing the parameters required for this message
 * 
 * @example
 * ```typescript
 * const paramMessage: MessageItem<readonly [string, number]> = {
 *   key: "WELCOME_USER",
 *   fallback: (name: string, age: number) => `Hello ${name}, you are ${age} years old!`
 * };
 * ```
 */
export interface MessageItem<T extends readonly [any, ...any[]]> {
  /** The key to search for in the message dictionary */
  key: string;
  /** A function that takes parameters and returns a formatted string as fallback */
  fallback: (...args: T) => string;
}

/**
 * Type definition for message dictionary
 * 
 * Represents a collection of key-value pairs where keys are message identifiers
 * and values are the actual translated text. This is typically loaded from
 * JSON locale files (e.g., en.json, ja.json).
 * 
 * @example
 * ```typescript
 * const messages: MessageDictionary = {
 *   "WELCOME_MESSAGE": "Welcome!",
 *   "BUTTON_SUBMIT": "Submit",
 *   "USER_GREETING": "Hello {name}!"
 * };
 * ```
 */
export interface MessageDictionary {
  [key: string]: string;
}

/**
 * TypedMessageProvider component props
 * 
 * Props for the React context provider that supplies message dictionaries
 * to child components. The provider manages message retrieval and fallback
 * processing throughout the component tree.
 * 
 * @example
 * ```tsx
 * <TypedMessageProvider messages={enMessages}>
 *   <MyComponent />
 * </TypedMessageProvider>
 * ```
 */
export interface TypedMessageProviderProps {
  /** 
   * Message dictionary containing key-value pairs of message identifiers and their translations.
   * If omitted, defaults to an empty object.
   */
  messages?: MessageDictionary;
  /** Child React components that will have access to the message context */
  children?: React.ReactNode;
}

/**
 * Type helper for formatter functions
 * 
 * Represents a function that takes a variable number of arguments and returns
 * a formatted string. Used internally for message formatting with parameters.
 * 
 * @template T - A tuple type representing the function parameters
 * 
 * @example
 * ```typescript
 * const formatter: FormatterFunction<[string, number]> = (name, age) => 
 *   `Hello ${name}, you are ${age} years old!`;
 * ```
 */
export type FormatterFunction<T extends readonly [...any[]]> = (...args: T) => string;

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
export interface PlaceholderInfo {
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
export interface ParsedMessage {
  /** The message key identifier */
  key: string;
  /** The original message template with placeholder syntax */
  template: string;
  /** Array of placeholder information found in the template */
  placeholders: PlaceholderInfo[];
  /** The fallback message text to use when translation is not available */
  fallback: string;
}
