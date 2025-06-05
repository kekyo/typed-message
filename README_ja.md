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
import { typedMessagePlugin } from 'typed-message/vite'

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

**注記**: Viteプラグインは`typed-message/vite`サブパスからインポートされ、メインライブラリを軽量に保ち、ランタイム使用時に不要なVite依存関係を避けます。

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
      
      {/* パラメータ付きメッセージ - 型安全なオブジェクト形式 */}
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
| `params` | `T` | メッセージに渡すパラメータ（オブジェクト形式） |

#### 使用例

```tsx
{/* 引数なしメッセージ */}
<TypedMessage message={messages.WELCOME_MESSAGE} />

{/* パラメータ付きメッセージ */}
<TypedMessage 
  message={messages.WELCOME_USER} 
  params={{ firstName: "太郎", lastName: "田中", age: 25 }} 
/>
```

#### 型安全性

TypeScriptが自動的に`params`の必要性と型を推論します：

```typescript
// ✅ 正しい使用法
<TypedMessage message={simpleMessage} />
<TypedMessage message={paramMessage} params={{ name: "値1", count: 42 }} />

// ❌ コンパイルエラー
<TypedMessage message={simpleMessage} params={{ invalid: "param" }} />
<TypedMessage message={paramMessage} />  // paramsが必要
<TypedMessage message={paramMessage} params={{ wrong: "types" }} />
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
import { typedMessagePlugin } from 'typed-message/vite'

typedMessagePlugin({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // 優先順序: ja.json, en.json, fallback.jsonの順にメッセージを検索する
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
})
```

#### フォールバック優先順序の制御

`fallbackPriorityOrder`オプションで、フォールバックメッセージの優先順序を制御できます：

```typescript
import { typedMessagePlugin } from 'typed-message/vite'

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
  fallback: string;
}
```

#### MessageItem（パラメータ付き）

```typescript
interface MessageItem<T extends Record<string, any>> {
  key: string;
  fallback: (params: T) => string;
}
```

- `key`: ロケール辞書で検索するキー
- `fallback`: パラメータオブジェクトを受け取ってフォーマット済み文字列を返す関数

### useTypedMessage

TypedMessageProviderからメッセージ取得関数を取得するフック。この関数はメッセージアイテムを受け取り、辞書からメッセージを検索して、見つからない場合はfallback関数を使用します。

```typescript
const getMessage = useTypedMessage()

// 引数なしメッセージ取得
const simpleResult = getMessage(simpleMessage)

// パラメータ付きメッセージ取得（オブジェクト形式）
const paramResult = getMessage(paramMessage, { name: "太郎", age: 30 })
```

## 高度な機能

### プレースホルダーの順序非依存

オブジェクトベースのパラメータシステムにより、異なるロケールファイルでプレースホルダーが任意の順序で表示できます：

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

両方とも同じパラメータオブジェクトで正しく動作します：

```tsx
<TypedMessage 
  message={messages.USER_INFO} 
  params={{ firstName: "太郎", lastName: "田中", age: 25 }} 
/>
```

結果:
- 英語: "Hello 太郎 田中, you are 25 years old!"
- 日本語: "こんにちは 田中 太郎さん、あなたは25歳です！"

### 欠損プレースホルダーの処理

ロケールファイルでプレースホルダーが欠落している場合、単に無視されます：

**locale/en.json**
```json
{
  "PARTIAL_MESSAGE": "Hello {firstName}, welcome!"
}
```

```tsx
<TypedMessage 
  message={messages.PARTIAL_MESSAGE} 
  params={{ firstName: "太郎", lastName: "田中", age: 30 }} 
/>
```

結果: "Hello 太郎, welcome!" （未使用パラメータは無視されます）

## ライセンス

MIT License。詳細は[LICENSE](./LICENSE)をご覧ください。
