// Type definition for non-parameterized message items
export interface SimpleMessageItem {
  key: string;
  fallback: string;
}

// Type definition for parameterized message items (generic support)
export interface MessageItem<T extends readonly [any, ...any[]]> {
  key: string;
  fallback: (...args: T) => string;
}

// Type definition for message dictionary
export interface MessageDictionary {
  [key: string]: string;
}

// TypedMessageProvider property type definition
export interface TypedMessageProviderProps {
  messages: MessageDictionary;
  children: React.ReactNode;
}

// Type helper for formatter functions
export type FormatterFunction<T extends readonly [...any[]]> = (...args: T) => string;

// Type for placeholder analysis results
export interface PlaceholderInfo {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'date';
  position: number;
}

// Type for message analysis results
export interface ParsedMessage {
  key: string;
  template: string;
  placeholders: PlaceholderInfo[];
  fallback: string;
} 