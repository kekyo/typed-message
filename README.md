# typed-message

A TypeScript and React library for providing type-safe internationalized messages.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/typed-message.svg)](https://badge.fury.io/js/typed-message)

[(日本語はこちら)](./README_ja.md)

## Features

- 🔒 **Completely Type-Safe** - Compile-time validation of message keys with TypeScript
- 🔄 **Hot Reload Support** - Automatic detection of locale file changes during development
- 📦 **Automatic Fallback Message Aggregation** - Specify fallback messages for when a message is not found
- 🎯 **Parameterized Messages** - Dynamic message formatting using placeholders (type-safe)
- 🎨 **Unified API** - Handle both non-parameterized and parameterized messages with the same component
- ⚡ **Lightweight** - Minimal dependencies and bundle size
- 🎯 **Vite Optimized** - Automatic code generation via Vite plugin

## Installation

```bash
npm install typed-message
```

## Basic Usage

### 1. Vite Plugin Configuration

Add the plugin to your `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { typedMessagePlugin } from 'typed-message/vite'

export default defineConfig({
  plugins: [
    react(),
    typedMessagePlugin({
      localeDir: 'locale',  // Directory containing JSON files
      outputPath: 'src/generated/messages.ts'  // Path for generated file
    })
  ]
})
```

**Note**: The Vite plugin is imported from `typed-message/vite` sub-path to keep the main library lightweight and avoid unnecessary Vite dependencies for runtime usage.

### 2. Creating Locale Files

Create a `locale` directory in your project root and place JSON files in it.
`fallback.json` is referenced when messages cannot be found in other locale files.

#### Basic Messages

**locale/fallback.json**
```json
{
  "WELCOME_MESSAGE": "Welcome",
  "BUTTON_SUBMIT": "Submit"
}
```

**locale/en.json**
```json
{
  "WELCOME_MESSAGE": "Welcome!!",
  "BUTTON_SUBMIT": "Submit!!"
}
```

**locale/ja.json**
```json
{
  "WELCOME_MESSAGE": "ようこそ！！",
  "BUTTON_SUBMIT": "送信する"
}
```

#### Parameterized Messages

You can use placeholder syntax `{variableName}` and type specification `{variableName:type}`:

**locale/fallback.json**
```json
{
  "WELCOME_USER": "Hello {firstName} {lastName}, you are {age:number} years old!",
  "ITEM_COUNT": "You have {count:number} {itemType}",
  "FORMATTED_DATE": "Today is {date:date}, temperature is {temp:number}°C"
}
```

**locale/en.json**
```json
{
  "WELCOME_USER": "Welcome {firstName} {lastName}! Age: {age:number}",
  "ITEM_COUNT": "You have {count:number} {itemType} in your cart",
  "FORMATTED_DATE": "Today: {date:date}, Temperature: {temp:number}°C"
}
```

**locale/ja.json**
```json
{
  "WELCOME_USER": "こんにちは {firstName} {lastName}さん、{age:number}歳ですね",
  "ITEM_COUNT": "{itemType}が{count:number}個あります",
  "FORMATTED_DATE": "今日は{date:date}、気温は{temp:number}度です"
}
```

Supported types:
- `string` - String (default, type specification can be omitted)
- `number` - Number
- `boolean` - Boolean
- `date` - Date object

### 3. Usage in React Applications

#### TypedMessage Component (Recommended)

```tsx
import React, { useState } from 'react'
import { TypedMessageProvider, TypedMessage } from 'typed-message'
import { messages } from './generated/messages'

// Import locale dictionaries
import enMessages from '../locale/en.json'
import jaMessages from '../locale/ja.json'

const App = () => {
  const [locale, setLocale] = useState('en')

  const localeMessages = {
    en: enMessages,
    ja: jaMessages
  }

  return (
    <TypedMessageProvider messages={localeMessages[locale]}>
      <div>
        {/* Non-parameterized messages */}
        <h1>
          <TypedMessage message={messages.WELCOME_MESSAGE} />
        </h1>
        <button>
          <TypedMessage message={messages.BUTTON_SUBMIT} />
        </button>
        
        {/* Parameterized messages - Type-checked by TypeScript! */}
        <p>
          <TypedMessage 
            message={messages.WELCOME_USER} 
            params={{ firstName: "John", lastName: "Doe", age: 25 }} 
          />
        </p>
        <p>
          <TypedMessage 
            message={messages.ITEM_COUNT} 
            params={{ count: 3, itemType: "books" }} 
          />
        </p>
        <p>
          <TypedMessage 
            message={messages.FORMATTED_DATE} 
            params={{ date: new Date(), temp: 23 }} 
          />
        </p>
        
        {/* Language switcher */}
        <select onChange={(e) => setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">Japanese</option>
        </select>
      </div>
    </TypedMessageProvider>
  )
}

export default App
```

#### Using useTypedMessage Hook Directly

```tsx
import React, { useState } from 'react'
import { TypedMessageProvider, useTypedMessage } from 'typed-message'
import { messages } from './generated/messages'

// Import locale dictionaries
import enMessages from '../locale/en.json'
import jaMessages from '../locale/ja.json'

const MyComponent = () => {
  const getMessage = useTypedMessage()

  return (
    <div>
      {/* Non-parameterized messages */}
      <h1>{getMessage(messages.WELCOME_MESSAGE)}</h1>
      <button>{getMessage(messages.BUTTON_SUBMIT)}</button>
      
      {/* Parameterized messages - Type-safe object format */}
      <p>{getMessage(messages.WELCOME_USER, { firstName: "Jane", lastName: "Smith", age: 30 })}</p>
      <p>{getMessage(messages.ITEM_COUNT, { count: 5, itemType: "apples" })}</p>
      <p>{getMessage(messages.FORMATTED_DATE, { date: new Date(), temp: 18 })}</p>
    </div>
  )
}

const App = () => {
  const [locale, setLocale] = useState('en')

  const localeMessages = {
    en: enMessages,
    ja: jaMessages
  }

  return (
    <TypedMessageProvider messages={localeMessages[locale]}>
      <MyComponent />
      
      {/* Language switcher */}
      <select onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="ja">Japanese</option>
      </select>
    </TypedMessageProvider>
  )
}

export default App
```

## API Reference

### TypedMessageProvider

A React context provider that provides message dictionaries. It internally creates a message retrieval function and manages fallback processing.

#### Props

| Property | Type | Description |
|----------|---------|------------|
| `messages` | `Record<string, string>` (optional) | Message dictionary. Defaults to empty object if omitted |
| `children` | `React.ReactNode` | Child elements |

#### Example

```tsx
<TypedMessageProvider messages={{ HELLO: "Hello" }}>
  {/* Child components */}
</TypedMessageProvider>
```

### TypedMessage

A React component for displaying messages. Uses TypeScript overloads to handle both non-parameterized and parameterized messages in a type-safe manner.

#### Props (Non-parameterized Messages)

| Property | Type | Description |
|----------|---------|------------|
| `message` | `SimpleMessageItem` | Message item to display |

#### Props (Parameterized Messages)

| Property | Type | Description |
|----------|---------|------------|
| `message` | `MessageItem<T>` | Message item to display |
| `params` | `T` | Parameters to pass to the message (object format) |

#### Example

```tsx
{/* Non-parameterized message */}
<TypedMessage message={messages.WELCOME_MESSAGE} />

{/* Parameterized message */}
<TypedMessage 
  message={messages.WELCOME_USER} 
  params={{ firstName: "John", lastName: "Doe", age: 25 }} 
/>
```

#### Type Safety

TypeScript automatically infers the necessity and types of `params`:

```typescript
// ✅ Correct usage
<TypedMessage message={simpleMessage} />
<TypedMessage message={paramMessage} params={{ name: "value1", count: 42 }} />

// ❌ Compile errors
<TypedMessage message={simpleMessage} params={{ invalid: "param" }} />
<TypedMessage message={paramMessage} />  // params required
<TypedMessage message={paramMessage} params={{ wrong: "types" }} />
```

### typedMessagePlugin

A Vite plugin that generates TypeScript code from JSON. It detects placeholders and automatically generates types for parameterized messages.

#### Options

| Property | Type | Default | Description |
|----------|---------|-----------|------------|
| `localeDir` | `string` | `'locale'` | Directory containing JSON files |
| `outputPath` | `string` | `'src/generated/messages.ts'` | Path for generated file |
| `fallbackPriorityOrder` | `string[]` | `['en', 'fallback']` | Priority order for fallback values (fallback to later elements in array) |

#### Example

```typescript
import { typedMessagePlugin } from 'typed-message/vite'

typedMessagePlugin({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // Priority order: search messages in ja.json, en.json, fallback.json order
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
})
```

#### Controlling Fallback Priority Order

The `fallbackPriorityOrder` option controls the priority order of fallback messages:

```typescript
import { typedMessagePlugin } from 'typed-message/vite'

typedMessagePlugin({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // Priority order: search messages in ja.json, en.json, fallback.json order
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
})
```

- Fallback messages are searched **towards the last element** of the array
- Files not included in the array are processed in alphabetical order
- When the same key exists in multiple files, the value from the higher priority file is used as the fallback message

### MessageItem / SimpleMessageItem

Types for generated message items.

#### SimpleMessageItem (Non-parameterized)

```typescript
interface SimpleMessageItem {
  key: string;
  fallback: string;
}
```

#### MessageItem (Parameterized)

```typescript
interface MessageItem<T extends Record<string, any>> {
  key: string;
  fallback: string;
}
```

- `key`: Key to search in the locale dictionary
- `fallback`: The fallback message template with placeholder syntax

### useTypedMessage

A hook to get the message retrieval function from TypedMessageProvider. This function takes message items, searches for messages in the dictionary, and uses the fallback template when not found.

```typescript
const getMessage = useTypedMessage()

// Non-parameterized messages
const simpleResult = getMessage(simpleMessage)

// Parameterized messages
const paramResult = getMessage(paramMessage, { name: "John", age: 30 })
```

## Advanced Features

### Placeholder Type Validation

The Vite plugin automatically validates placeholder types across different locale files and provides warnings when inconsistencies are detected.

#### Type Consistency Checking

When the same placeholder name is used with different types across locale files, the plugin will:

1. **Generate JSDoc warnings** in the generated TypeScript code
2. **Display console warnings** during build time
3. **Use explicit types** over implicit `string` types when available

**Example of type conflicts:**

**locale/fallback.json**
```json
{
  "USER_MESSAGE": "User {userId} has {balance:number} points and status {isActive:boolean}"
}
```

**locale/en.json**
```json
{
  "USER_MESSAGE": "User {userId:number} has {balance:number} points and status {isActive:boolean}"
}
```

**locale/ja.json**
```json
{
  "USER_MESSAGE": "ユーザー{userId:boolean}の残高は{balance:string}ポイント、ステータスは{isActive:number}です"
}
```

**Generated TypeScript code with warnings:**
```typescript
/**
 * Warning: Placeholder types do not match across locales
 * - userId: fallback.json: string, en.json: number, ja.json: boolean
 * - balance: fallback.json: number, en.json: number, ja.json: string
 * - isActive: fallback.json: boolean, en.json: boolean, ja.json: number
 */
USER_MESSAGE: {
  key: "USER_MESSAGE",
  fallback: "User {userId:number} has {balance:number} points and status {isActive:boolean}"
} as MessageItem<{ userId: number; balance: number; isActive: boolean }>
```

#### Type Resolution Rules

1. **All types match**: No warnings generated
2. **Implicit vs explicit types**: Explicit types (e.g., `:number`) take precedence over implicit `string` types
3. **Type conflicts**: Plugin uses the first explicit type found in priority order and generates warnings

#### Invalid JSON File Handling

When locale files contain invalid JSON syntax, the plugin will:

1. **Continue processing** other valid files
2. **Generate JSDoc warnings** listing invalid files
3. **Display console warnings** with error details

**Example with invalid files:**

**Generated TypeScript code:**
```typescript
/**
 * Warning: Failed to load the following locale files
 * - broken.json
 * - invalid-syntax.json
 * These files are not included in the generated code.
 */
export const messages = {
  // ... only messages from valid files
} as const;
```

This feature helps maintain type safety and consistency across your internationalization setup while providing clear feedback when issues are detected.

### Placeholder Order Independence

With the object-based parameter system, placeholders can appear in any order in different locale files:

**locale/en.json**
```json
{
  "USER_INFO": "Hello {firstName} {lastName}, you are {age:number} years old!"
}
```

**locale/ja.json**  
```json
{
  "USER_INFO": "こんにちは {lastName} {firstName}さん、あなたは{age:number}歳です！"
}
```

Both will work correctly with the same parameter object:

```tsx
<TypedMessage 
  message={messages.USER_INFO} 
  params={{ firstName: "太郎", lastName: "田中", age: 25 }} 
/>
```

Results:
- English: "Hello 太郎 田中, you are 25 years old!"
- Japanese: "こんにちは 田中 太郎さん、あなたは25歳です！"

### Missing Placeholder Handling

If a placeholder is missing from a locale file, it will be gracefully ignored:

**locale/en.json**
```json
{
  "PARTIAL_MESSAGE": "Hello {firstName}, welcome!"
}
```

```tsx
<TypedMessage 
  message={messages.PARTIAL_MESSAGE} 
  params={{ firstName: "John", lastName: "Doe", age: 30 }} 
/>
```

Result: "Hello John, welcome!" (unused parameters are ignored)

## License

MIT License. See [LICENSE](./LICENSE) for details.

