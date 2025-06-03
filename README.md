# typed-message

A TypeScript and React library for providing type-safe internationalization messages.

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
            params={["John", "Doe", 25]} 
          />
        </p>
        <p>
          <TypedMessage 
            message={messages.ITEM_COUNT} 
            params={[3, "books"]} 
          />
        </p>
        <p>
          <TypedMessage 
            message={messages.FORMATTED_DATE} 
            params={[new Date(), 23]} 
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
      
      {/* Parameterized messages - Type-safe tuple format */}
      <p>{getMessage(messages.WELCOME_USER, ["Jane", "Smith", 30])}</p>
      <p>{getMessage(messages.ITEM_COUNT, [5, "apples"])}</p>
      <p>{getMessage(messages.FORMATTED_DATE, [new Date(), 18])}</p>
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
| `params` | `T` | Parameters to pass to the message (tuple format) |

#### Example

```tsx
{/* Non-parameterized message */}
<TypedMessage message={messages.WELCOME_MESSAGE} />

{/* Parameterized message */}
<TypedMessage 
  message={messages.WELCOME_USER} 
  params={["John", "Doe", 25]} 
/>
```

#### Type Safety

TypeScript automatically infers the necessity and types of `params`:

```typescript
// ✅ Correct usage
<TypedMessage message={simpleMessage} />
<TypedMessage message={paramMessage} params={["value1", 42]} />

// ❌ Compile errors
<TypedMessage message={simpleMessage} params={["invalid"]} />
<TypedMessage message={paramMessage} />  // params required
<TypedMessage message={paramMessage} params={["wrong", "types"]} />
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
  formatter: () => string;
  fallback: string;
}
```

#### MessageItem (Parameterized)

```typescript
interface MessageItem<T extends readonly [any, ...any[]]> {
  key: string;
  formatter: (...args: T) => string;
  fallback: string;
}
```

- `key`: Key to search in the locale dictionary
- `formatter`: Function that takes parameters and returns a formatted string
- `fallback`: Fallback value when message is not found (determined at build time by Vite plugin)

### useTypedMessage

A hook to get the message retrieval function from TypedMessageProvider. This function takes message items, searches for messages in the dictionary, and uses the formatter function when not found.

```typescript
const getMessage = useTypedMessage()

// Get non-parameterized message
const text = getMessage(messages.WELCOME_MESSAGE)

// Get parameterized message (tuple format)
const userText = getMessage(messages.WELCOME_USER, ["John", "Doe", 25])
```

#### Return Value

Overloaded function:
- `(message: SimpleMessageItem) => string` - For non-parameterized messages
- `(message: MessageItem<T>, args: T) => string` - For parameterized messages

#### Example

```typescript
const MyComponent = () => {
  const getMessage = useTypedMessage()
  
  return (
    <div>
      <h1>{getMessage(messages.TITLE)}</h1>
      <p>{getMessage(messages.WELCOME_USER, ["Taro", "Tanaka", 30])}</p>
    </div>
  )
}
```

**Note**: This function automatically handles fallback processing within the context. When a key doesn't exist in the dictionary, the formatter function or fallback value is used.

## Generated Code Example

`src/generated/messages.ts` (auto-generated):

```typescript
// This file is auto-generated by typed-message plugin
// Do not edit manually

import type { MessageItem, SimpleMessageItem } from 'typed-message';

export const messages = {
  // Non-parameterized messages
  WELCOME_MESSAGE: {
    key: "WELCOME_MESSAGE",
    formatter: () => "Welcome",
    fallback: "Welcome"
  } as SimpleMessageItem,
  
  BUTTON_SUBMIT: {
    key: "BUTTON_SUBMIT",
    formatter: () => "Submit",
    fallback: "Submit"
  } as SimpleMessageItem,

  // Parameterized messages - Type-inferred by TypeScript!
  WELCOME_USER: {
    key: "WELCOME_USER",
    formatter: (firstName: string, lastName: string, age: number) => 
      `Hello ${firstName} ${lastName}, you are ${age} years old!`,
    fallback: "Hello {firstName} {lastName}, you are {age:number} years old!"
  } as MessageItem<readonly [firstName: string, lastName: string, age: number]>,
  
  ITEM_COUNT: {
    key: "ITEM_COUNT",
    formatter: (count: number, itemType: string) => 
      `You have ${count} ${itemType}`,
    fallback: "You have {count:number} {itemType}"
  } as MessageItem<readonly [count: number, itemType: string]>,
  
  FORMATTED_DATE: {
    key: "FORMATTED_DATE",
    formatter: (date: Date, temp: number) => 
      `Today is ${date.toLocaleDateString()}, temperature is ${temp}°C`,
    fallback: "Today is {date:date}, temperature is {temp:number}°C"
  } as MessageItem<readonly [date: Date, temp: number]>
};
```

The `fallback` value is determined based on the priority specified in `fallbackPriorityOrder`.

When placeholders are detected, the following processing is automatically performed:
- Parse type information of placeholders (`{name:string}`, `{age:number}`, etc.)
- Generate TypeScript named tuple types
- Generate formatter functions using template literals
- Ensure type safety of arguments

## Key Features

### Unified Component API

Handle both non-parameterized and parameterized messages with a single `TypedMessage` component:

```tsx
// Same component for different usage patterns
<TypedMessage message={messages.SIMPLE_MESSAGE} />
<TypedMessage message={messages.PARAM_MESSAGE} params={[value1, value2]} />
```

### Type-level Constraints

Using TypeScript overloads and generics to detect improper usage at compile time:

```typescript
// Cannot pass params to SimpleMessageItem
<TypedMessage message={simpleMessage} params={[...]} />  // ❌ Error

// params required for MessageItem
<TypedMessage message={paramMessage} />  // ❌ Error

// Correct type arguments required
<TypedMessage message={userMessage} params={["name", 42, "extra"]} />  // ❌ Error
```

### Automatic Placeholder Analysis

Automatically generate TypeScript types from placeholders in JSON:

```json
{
  "USER_INFO": "Name: {name}, Age: {age:number}, Active: {isActive:boolean}"
}
```

↓ Auto-generated

```typescript
MessageItem<readonly [name: string, age: number, isActive: boolean]>
```

## Development and Build

### Starting the Demo Page

```bash
npm run dev
```

The demo page can be viewed at http://localhost:3000.

### Running Tests

```bash
npm test          # Unit tests
```

### Building the Library

```bash
npm run build
```

## Contributing

Pull requests and issue reports are welcome.

## License

MIT License

## Related Projects

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

**Note**: This library is designed for use in Vite environments. It may not work with other build tools.
