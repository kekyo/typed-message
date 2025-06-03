# typed-message

TypeScriptとReactでタイプセーフな国際化メッセージを提供するライブラリです。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://badge.fury.io/js/typed-message.svg)](https://badge.fury.io/js/typed-message)

[(English language is here.)](./README.md)

## 特徴

- 🔒 **完全にタイプセーフ** - TypeScriptでコンパイル時にメッセージキーのバリデーション
- 🔄 **ホットリロード対応** - 開発時にロケールファイルの変更を自動検知
- 📦 **フォールバックメッセージの自動集約** - メッセージが見つからない場合のフォールバックメッセージを指定可能
- 🎯 **パラメータ付きメッセージ** - プレースホルダーを使った動的メッセージフォーマット（型安全）
- 🎨 **統合されたAPI** - 引数なしとパラメータ付きメッセージの両方を同一コンポーネントで処理
- ⚡ **軽量** - 最小限の依存関係とバンドルサイズ
- 🎯 **Vite最適化** - Viteプラグインによる自動コード生成

## インストール

```bash
npm install typed-message
```

## 基本的な使用方法

### 1. Viteプラグインの設定

`vite.config.ts`にプラグインを追加:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import { typedMessagePlugin } from 'typed-message'

export default defineConfig({
  plugins: [
    react(),
    typedMessagePlugin({
      localeDir: 'locale',  // JSONファイルのディレクトリ
      outputPath: 'src/generated/messages.ts'  // 生成ファイルのパス
    })
  ]
})
```

### 2. ロケールファイルの作成

プロジェクトルートに`locale`ディレクトリを作成し、JSONファイルを配置します。
`fallback.json`は、その他のロケールファイルからメッセージが特定できない場合に参照されます。

#### 基本メッセージ

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

#### パラメータ付きメッセージ

プレースホルダー構文 `{変数名}` および型指定 `{変数名:型}` を使用できます：

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

サポートされる型：
- `string` - 文字列（デフォルト、型指定省略可）
- `number` - 数値
- `boolean` - 真偽値
- `date` - 日付オブジェクト

### 3. Reactアプリケーションでの使用

#### TypedMessageコンポーネント（推奨）

```tsx
import React, { useState } from 'react'
import { TypedMessageProvider, TypedMessage } from 'typed-message'
import { messages } from './generated/messages'

// ロケール辞書をインポート
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
        {/* 引数なしメッセージ */}
        <h1>
          <TypedMessage message={messages.WELCOME_MESSAGE} />
        </h1>
        <button>
          <TypedMessage message={messages.BUTTON_SUBMIT} />
        </button>
        
        {/* パラメータ付きメッセージ - TypeScriptで型チェックされる！ */}
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
        
        {/* 言語切り替えボタン */}
        <select onChange={(e) => setLocale(e.target.value)}>
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </TypedMessageProvider>
  )
}

export default App
```

#### useTypedMessageフックを直接使用する場合

```tsx
import React, { useState } from 'react'
import { TypedMessageProvider, useTypedMessage } from 'typed-message'
import { messages } from './generated/messages'

// ロケール辞書をインポート
import enMessages from '../locale/en.json'
import jaMessages from '../locale/ja.json'

const MyComponent = () => {
  const getMessage = useTypedMessage()

  return (
    <div>
      {/* 引数なしメッセージ */}
      <h1>{getMessage(messages.WELCOME_MESSAGE)}</h1>
      <button>{getMessage(messages.BUTTON_SUBMIT)}</button>
      
      {/* パラメータ付きメッセージ - タプル形式で型安全 */}
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
      
      {/* 言語切り替えボタン */}
      <select onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </TypedMessageProvider>
  )
}

export default App
```

## API リファレンス

### TypedMessageProvider

メッセージ辞書を提供するReactコンテキストプロバイダ。内部でメッセージ取得関数を作成し、フォールバック処理を管理します。

#### Props

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `messages` | `Record<string, string>` (optional) | メッセージ辞書。省略時は空オブジェクト |
| `children` | `React.ReactNode` | 子要素 |

#### 使用例

```tsx
<TypedMessageProvider messages={{ HELLO: "こんにちは" }}>
  {/* 子コンポーネント */}
</TypedMessageProvider>
```

### TypedMessage

メッセージを表示するReactコンポーネント。TypeScriptのオーバーロードにより、引数なしメッセージとパラメータ付きメッセージの両方を型安全に処理します。

#### Props（引数なしメッセージ）

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `message` | `SimpleMessageItem` | 表示するメッセージアイテム |

#### Props（パラメータ付きメッセージ）

| プロパティ | 型 | 説明 |
|-----------|----|----|
| `message` | `MessageItem<T>` | 表示するメッセージアイテム |
| `params` | `T` | メッセージに渡すパラメータ（タプル形式） |

#### 使用例

```tsx
{/* 引数なしメッセージ */}
<TypedMessage message={messages.WELCOME_MESSAGE} />

{/* パラメータ付きメッセージ */}
<TypedMessage 
  message={messages.WELCOME_USER} 
  params={["John", "Doe", 25]} 
/>
```

#### 型安全性

TypeScriptが自動的に`params`の必要性と型を推論します：

```typescript
// ✅ 正しい使用法
<TypedMessage message={simpleMessage} />
<TypedMessage message={paramMessage} params={["value1", 42]} />

// ❌ コンパイルエラー
<TypedMessage message={simpleMessage} params={["invalid"]} />
<TypedMessage message={paramMessage} />  // paramsが必要
<TypedMessage message={paramMessage} params={["wrong", "types"]} />
```

### typedMessagePlugin

ViteプラグインでJSONからTypeScriptコードを生成します。プレースホルダーを検出してパラメータ付きメッセージの型を自動生成します。

#### オプション

| プロパティ | 型 | デフォルト | 説明 |
|-----------|----|-----------|----|
| `localeDir` | `string` | `'locale'` | JSONファイルのディレクトリ |
| `outputPath` | `string` | `'src/generated/messages.ts'` | 生成ファイルのパス |
| `fallbackPriorityOrder` | `string[]` | `['en', 'fallback']` | フォールバック値の優先順序（配列の後方にフォールバックする） |

#### 使用例

```typescript
typedMessagePlugin({
  localeDir: 'locales',
  outputPath: 'src/messages.ts'
})
```

#### フォールバック優先順序の制御

`fallbackPriorityOrder`オプションで、フォールバックメッセージの優先順序を制御できます：

```typescript
typedMessagePlugin({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // 優先順序: ja.json, en.json, fallback.jsonの順にメッセージを検索する
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
})
```

- 配列の**最後の要素に向かって**フォールバックメッセージが検索されます
- 配列に含まれないファイルは、アルファベット順で処理されます
- 同じキーが複数のファイルに存在する場合、優先度の高いファイルの値がフォールバックメッセージとして使用されます

### MessageItem / SimpleMessageItem

生成されるメッセージアイテムの型。

#### SimpleMessageItem（引数なし）

```typescript
interface SimpleMessageItem {
  key: string;
  formatter: () => string;
  fallback: string;
}
```

#### MessageItem（パラメータ付き）

```typescript
interface MessageItem<T extends readonly [any, ...any[]]> {
  key: string;
  formatter: (...args: T) => string;
  fallback: string;
}
```

- `key`: ロケール辞書で検索するキー
- `formatter`: パラメータを受け取ってフォーマットされた文字列を返す関数
- `fallback`: メッセージが見つからない場合のフォールバック値（Viteプラグインによってビルド時に特定されます）

### useTypedMessage

TypedMessageProviderからメッセージ取得関数を取得するフック。この関数はメッセージアイテムを受け取り、辞書からメッセージを検索して、見つからない場合はformatter関数を使用します。

```typescript
const getMessage = useTypedMessage()

// 引数なしメッセージ取得
const text = getMessage(messages.WELCOME_MESSAGE)

// パラメータ付きメッセージ取得（タプル形式）
const userText = getMessage(messages.WELCOME_USER, ["John", "Doe", 25])
```

#### 戻り値

オーバーロードされた関数:
- `(message: SimpleMessageItem) => string` - 引数なしメッセージ用
- `(message: MessageItem<T>, args: T) => string` - パラメータ付きメッセージ用

#### 使用例

```typescript
const MyComponent = () => {
  const getMessage = useTypedMessage()
  
  return (
    <div>
      <h1>{getMessage(messages.TITLE)}</h1>
      <p>{getMessage(messages.WELCOME_USER, ["太郎", "田中", 30])}</p>
    </div>
  )
}
```

**注意**: この関数はコンテキスト内でフォールバック処理を自動で行います。辞書にキーが存在しない場合、formatter関数またはfallback値が使用されます。

## 生成されるコード例

```typescript
// src/generated/messages.ts (自動生成)
export interface SimpleMessageItem {
  key: string;
  formatter: () => string;
  fallback: string;
}

export interface MessageItem<T extends readonly [any, ...any[]]> {
  key: string;
  formatter: (...args: T) => string;
  fallback: string;
}

export const messages = {
  // 引数なしメッセージ
  WELCOME_MESSAGE: {
    key: "WELCOME_MESSAGE",
    formatter: () => "ようこそ",
    fallback: "ようこそ"
  } as SimpleMessageItem,
  
  BUTTON_SUBMIT: {
    key: "BUTTON_SUBMIT",
    formatter: () => "送信",
    fallback: "送信"
  } as SimpleMessageItem,

  // パラメータ付きメッセージ - TypeScriptで型推論される！
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

`fallback`値は`fallbackPriorityOrder`で指定した優先順位に基づいて決定されます。

プレースホルダーが検出されると、以下の処理が自動で行われます：
- プレースホルダーの型情報を解析（`{name:string}`, `{age:number}` など）
- TypeScriptの名前付きタプル型を生成
- テンプレートリテラルを使用したformatter関数を生成
- 引数の型安全性を保証

## 主な機能

### 統合されたコンポーネントAPI

一つの`TypedMessage`コンポーネントで、引数なしとパラメータ付きメッセージの両方を処理：

```tsx
// 同一コンポーネントで異なる使用法
<TypedMessage message={messages.SIMPLE_MESSAGE} />
<TypedMessage message={messages.PARAM_MESSAGE} params={[value1, value2]} />
```

### 型レベルでの制約

TypeScriptのオーバーロードとジェネリクスにより、不正な使用をコンパイル時に検出：

```typescript
// SimpleMessageItemには params を渡せない
<TypedMessage message={simpleMessage} params={[...]} />  // ❌ エラー

// MessageItemには params が必須
<TypedMessage message={paramMessage} />  // ❌ エラー

// 正しい型の引数が必要
<TypedMessage message={userMessage} params={["name", 42, "extra"]} />  // ❌ エラー
```

### 自動プレースホルダー解析

JSON内のプレースホルダーから自動で TypeScript 型を生成：

```json
{
  "USER_INFO": "Name: {name}, Age: {age:number}, Active: {isActive:boolean}"
}
```

↓ 自動生成

```typescript
MessageItem<readonly [name: string, age: number, isActive: boolean]>
```

## 開発とビルド

### デモページの起動

```bash
npm run dev
```

http://localhost:3000 でデモページが確認できます。

### テストの実行

```bash
npm test          # ユニットテスト
```

### ライブラリのビルド

```bash
npm run build
```

## 貢献

プルリクエストやイシューの報告を歓迎します。

## ライセンス

MIT License

## 関連プロジェクト

- [React](https://reactjs.org/)
- [Vite](https://vitejs.dev/)
- [TypeScript](https://www.typescriptlang.org/)

---

**注意**: このライブラリはVite環境での使用を想定しています。他のビルドツールでは動作しない可能性があります。
