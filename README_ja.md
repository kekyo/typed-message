# typed-message

TypeScript+React+Viteでタイプセーフな国際化メッセージを提供するライブラリです。

![typed-message](images/typed-message-120-c.png)

[![Project Status: Active – The project has reached a stable, usable state and is being actively developed.](https://www.repostatus.org/badges/latest/active.svg)](https://www.repostatus.org/#active)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![npm version](https://img.shields.io/npm/v/typed-message.svg)](https://github.com/kekyo/typed-message)

----

[(English language is here.)](./README.md)

## これは何？

Reactで、国際化されるメッセージの生成や出力を行う時に、厳密に型指定されたパラメータを指定できたら良いなと考えたことはありますか？

メッセージ文字列の整形時にInterpolation Stringを使うことは出来ますが、これを使用するとメッセージの国際化が難しいので使えず、
かと言って通常の文字列フォーマット関数では、与える引数と型のチェックが行えません。

このパッケージを使用すると、国際化されたメッセージをJSONファイルで管理しつつ、そこに指定されたパラメータ群をタイプセーフな定義に基づいた形式で指定させることが出来ます。例えば、以下のようなメッセージファイルを用意しておき:

```json
{
  "WELCOME_USER": "Welcome {firstName} {lastName}! Age: {age:number}",
}
```

Reactコンポーネントを使って、このメッセージを表示できます:

```tsx
{/* The provider */}
<TypedMessageProvider messages={localeMessages[locale]}> 
  {/* Place the component that formatted string */}
  <TypedMessage 
    message={messages.WELCOME_USER} 
    params={{ firstName: "John ", lastName: "Doe", age: 25 }} /> 
</TypedMessageProvider> 
```

しかも、`params`に指定するフォーマットパラメータオブジェクトは、TypeScriptによって型付けされているので、パラメータ名や型で迷ったり誤った型を指定することがありません。

もちろん、Reactコンポーネントではなくフック関数として使用することも出来ます:

```tsx
// Use message getter function
const getMessage = useTypedMessage();

// To format with the parameters
const formatted = getMessage(
  messages.WELCOME_USER,
  { firstName: "Jane", lastName: "Smith", age: 30 });
```

そして、ロケールによってパラメータ順序が変化しても、コードに変更を加える必要はありません。
パラメータ型の抽出は、Viteプラグインによって自動的に行われます。つまり、あなたはロケール毎のメッセージファイルを編集するだけで良いのです！

### 主な機能

- 完全にタイプセーフ - TypeScriptでコンパイル時にメッセージキーのバリデーション
- ホットリロード対応 - 開発時にロケールファイルの変更を自動検知
- フォールバックメッセージの自動集約 - メッセージが見つからない場合のフォールバックメッセージを指定可能
- パラメータ付きメッセージ - プレースホルダーを使った動的メッセージフォーマット（型安全）
- Vite最適化 - Viteプラグインによる自動コード生成
- JSDocコメント - 生成されたすべてのメッセージにフォールバックテキストを含むJSDocコメントを付与（IDE支援向上）

### 環境

- Node.js: 18.0.0 or higher
- Vite: 5.x or 6.x (Note: Vite 7.x requires Node.js 20.19.0+)

----

## インストール

```bash
npm install typed-message
```

## 基本的な使用方法

### Viteプラグインの有効化

`vite.config.ts`に`typedMessage()`を追加して下さい:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import typedMessage from 'typed-message/vite'

export default defineConfig({
  plugins: [
    react(),
    typedMessage({
      localeDir: 'locale',  // JSONファイルのディレクトリ
      outputPath: 'src/generated/messages.ts'  // 生成ファイルのパス
    })
  ]
})
```

### ロケールファイルの作成

プロジェクトルートに`locale`ディレクトリを作成し、JSONファイルを配置します。

* JSONファイルは、実際には[JSON5形式](https://json5.org/)なので、コメントなどを入れることが出来ます。
* JSONファイルの拡張子は `.json5`, `.jsonc`, `.json` のいずれでもOKです。複数存在する場合は `.json5`, `.jsonc`, `.json` の順に優先されます。
* `fallback.json`は、その他のロケールファイルからメッセージが特定できない場合に参照されます。

#### 基本メッセージ

言語名に基づいたメッセージファイルを準備します。以下に、英語と日本語の例を示します:

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

フォールバックロケールは任意ですが、これを用意しておくと、メッセージファイルが提供されなかった場合でも、ハードコーディングされた安全なメッセージとして使用できます:

**locale/fallback.json**
```json
{
  "WELCOME_MESSAGE": "Welcome",
  "BUTTON_SUBMIT": "Submit"
}
```

#### パラメータ付きメッセージ

プレースホルダー構文 `{変数名}` および型指定 `{変数名:型}` を使用できます。以下に例を示します:

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

**locale/fallback.json**
```json
{
  "WELCOME_USER": "Hello {firstName} {lastName}, you are {age:number} years old!",
  "ITEM_COUNT": "You have {count:number} {itemType}",
  "FORMATTED_DATE": "Today is {date:date}, temperature is {temp:number}°C"
}
```

サポートされる型：
- `string` - 文字列（デフォルト、型指定省略可）
- `number` - 数値
- `boolean` - 真偽値
- `date` - 日付オブジェクト

### Reactアプリケーションでの使用

手動ビルドを行っている場合は、ビルドして下さい。
Viteプラグインの導入が正しければ、メッセージファイルを編集するだけで、`src/generated/messages.ts`ファイルが自動生成されるはずです!

生成されたモジュールは `messages` マップと `locales` 配列の両方をエクスポートします。`locales` は検出されたロケール識別子（拡張子を除いたファイル名）からフォールバックロケールを除いて列挙しているので、そのままロケール選択 UI やデバッグ用途に利用できます。

これで準備は整ったので、後はメッセージを使うだけです。

#### TypedMessageコンポーネント（推奨）

Reactのコンポーネントを使用して、エレメントに直接メッセージを埋め込みます。
`TypedMessage`コンポーネントより前に、`TypedMessageProvider`プロバイダーが必要です。
このプロバイダーは外部からメッセージ辞書を受け取って、メッセージ変換を実現させます。

以下の例は、言語切り替えUIで、日本語と英語のメッセージ切り替えを実現します:

```tsx
import React, { useState } from 'react';
import { TypedMessageProvider, TypedMessage } from 'typed-message';
import messages from './generated/messages';

// ロケール辞書をインポート
import enMessages from '../locale/en.json';
import jaMessages from '../locale/ja.json';

const App = () => {
  const [locale, setLocale] = useState('en');

  const localeMessages = {
    en: enMessages,
    ja: jaMessages
  };

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
  );
};

export default App;
```

`TypedMessageProvider`へのメッセージ辞書の供給方法は自由に決定できます。上記の例ではTypeScriptの`import`を使用して、直接ソースコード上にJSON辞書を挿入しましたが、外部サーバーからダウンロードして設定するなど、様々な手法が考えられます。

`messages`内のフィールド名は、基本的にメッセージファイルに指定したシンボル名でそのまま定義されます。
しかし、TypeScriptで無効な識別子（例: `HELLO-WORLD`）が使用されていた場合は、安全なフィールド名へサニタイズされます（`messages.HELLO_WORLD`）。

#### useTypedMessageフックを直接使用する場合

```tsx
import React, { useState } from 'react';
import { TypedMessageProvider, useTypedMessage } from 'typed-message';
import messages from './generated/messages';

// ロケール辞書をインポート
import enMessages from '../locale/en.json';
import jaMessages from '../locale/ja.json';

const MyComponent = () => {
  const getMessage = useTypedMessage();

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
  );
};

const App = () => {
  const [locale, setLocale] = useState('en');

  const localeMessages = {
    en: enMessages,
    ja: jaMessages
  };

  return (
    <TypedMessageProvider messages={localeMessages[locale]}>
      <MyComponent />
      
      {/* 言語切り替えボタン */}
      <select onChange={(e) => setLocale(e.target.value)}>
        <option value="en">English</option>
        <option value="ja">日本語</option>
      </select>
    </TypedMessageProvider>
  );
};

export default App;
```

#### ロケール切り替え用フック

サーバーからオンデマンドでロケール辞書を読み込みたい場合は、 `useLocaleController()` フックを利用し、戻り値のコントローラーをプロバイダーに渡します。配下のコンポーネントでは `useLocale()` を使って現在のロケール情報や切り替え操作を行えます。

```tsx
import {
  TypedMessageProvider,
  TypedMessage,
  useLocale,
  useLocaleController,
} from 'typed-message';
import { messages, locales } from './generated/messages';

// ロケールを変更するツールバーのコンポーネント
const LocaleToolbar = () => {
  // ツリー内の任意の場所で現在のロケールと切り替え関数を取得
  const { locale, status, setLocale } = useLocale();

  return (
    <div>
      {/* 次のロケール取得中は簡易的なロード表示を出す */}
      {status === 'loading' && <p>{locale} を読み込み中…</p>}
      {/* ユーザー操作でロケールが変わったことをコントローラーへ通知 */}
      <select value={locale} onChange={(event) => setLocale(event.target.value)}>
        {generatedLocales.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
};

// 引数で指定されたロケールの辞書ファイルを読み取る
const loadLocale = async (locale: string) => {
  const response = await fetch(`/locale/${locale}.json`);
  if (!response.ok) {
    throw new Error(`ロケール ${locale} の取得に失敗しました`);
  }
  return (await response.json()) as Record<string, string>;
};

export const App = () => {
  // 辞書の読み込み・キャッシュ・永続化をまとめて扱うコントローラーを生成
  const controller = useLocaleController({
    loadLocale,
    fallbackLocale: 'fallback',
    locales,
    initialLocale: navigator.language.split('-')[0],
    storageKey: 'saved-locale', // 指定しなければ永続化は行われません
  });

  return (
    // Provider にコントローラーを渡し、配下で useLocale が使えるようにする
    <TypedMessageProvider messages={controller}>
      <LocaleToolbar />
      <p>
        <TypedMessage message={messages.WELCOME_MESSAGE} />
      </p>
    </TypedMessageProvider>
  );
};
```

`useLocaleController` が辞書の取得・キャッシュ・永続化を担当し、`useLocale` は任意のコンポーネントから `locale` / `status` / `setLocale` の操作だけを取り出せます。辞書が空の場合でも、プロバイダー側で自動的にフォールバックメッセージが利用されます。

----

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
import typedMessage from 'typed-message/vite';

typedMessage({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // 優先順序: ja.json, en.json, fallback.jsonの順にメッセージを検索する
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
});
```

#### フォールバック優先順序の制御

`fallbackPriorityOrder`オプションで、フォールバックメッセージの優先順序を制御できます：

```typescript
import typedMessage from 'typed-message/vite';

typedMessage({
  localeDir: 'locale',
  outputPath: 'src/generated/messages.ts',
  // 優先順序: ja.json, en.json, fallback.jsonの順にメッセージを検索する
  fallbackPriorityOrder: ['ja', 'en', 'fallback']
});
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
  fallback: string;
}
```

- `key`: ロケール辞書で検索するキー
- `fallback`: プレースホルダー構文を含むフォールバックメッセージテンプレート

### useTypedMessage

TypedMessageProviderからメッセージ取得関数を取得するフックです。この関数はメッセージアイテムを受け取り、辞書からメッセージを検索して、見つからない場合はfallbackテンプレートを使用します。

```typescript
const getMessage = useTypedMessage();

// 引数なしメッセージ取得
const simpleResult = getMessage(simpleMessage);

// パラメータ付きメッセージ取得（オブジェクト形式）
const paramResult = getMessage(paramMessage, { name: "太郎", age: 30 });
```

## タイプセーフ機能

### プレースホルダ型検証

Viteプラグインは異なるロケールファイル間でプレースホルダ型を自動的に検証し、不整合が検出された場合に警告を提供します。

#### 型整合性チェック

同じプレースホルダ名がロケールファイル間で異なる型で使用されている場合、プラグインは以下を行います：

1. **生成されたTypeScriptコードにJSDoc警告を挿入**
2. **ビルド時にコンソール警告を表示**
3. **明示的な型を暗黙の`string`型より優先**

**型競合の例：**

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

**生成されたTypeScriptコード：**
```typescript
/**
 * Messgae: "User {userId:number} has {balance:number} points and status {isActive:boolean}"
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

#### 型解決ルール

1. **すべての型が一致**: 警告なし
2. **暗黙 vs 明示的型**: 明示的型（例：`:number`）が暗黙の`string`型より優先される
3. **型競合**: プラグインは優先順序で最初に見つかった明示的型を使用し、警告を生成

#### 無効なJSONファイルの処理

ロケールファイルに無効なJSON構文が含まれている場合、プラグインは以下を行います：

1. **他の有効なファイルの処理を継続**
2. **無効なファイルをリストしたJSDoc警告を生成**
3. **エラー詳細とともにコンソール警告を表示**

**無効なファイルがある場合の例：**

**生成されたTypeScriptコード：**
```typescript
/**
 * Warning: Failed to load the following locale files
 * - broken.json
 * - invalid-syntax.json
 * These files are not included in the generated code.
 */
export const messages = {
  // ... 有効なファイルからのメッセージのみ
} as const;
```

この機能は、国際化設定の型安全性と一貫性を維持しながら、問題が検出された際に明確なフィードバックを提供します。

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

-----

## 高度な機能

### useTypedMessageDynamic

注意: このフックは高度な使用目的に向けて設計されていて、型安全性が失われます。
キーを動的に解決しなければならない場合にのみ使用して下さい。

この関数は、コンパイル時にキーが特定できない場合に利用するフックです。文字列キーと任意のプレースホルダーパラメータを受け取る `getMessageDynamic` と `tryGetMessageDynamic` を返します。

```typescript
const { getMessageDynamic, tryGetMessageDynamic } = useTypedMessageDynamic();

const resolved = getMessageDynamic(runtimeKey, { name: '太郎' });
// キーが見つからない場合は `MESSAGE_NOT_FOUND: ${runtimeKey}` が返ります

const optionalValue = tryGetMessageDynamic(runtimeKey, { name: '太郎' });
// キーが見つからない場合は undefined を返すので、呼び出し側で自由に扱えます
```

`getMessageDynamic` はキー未存在時に明示的な文字列を表示したい場合に利用します。`tryGetMessageDynamic` はキー未存在時に `undefined` を返し、UIを非表示にするなどの判断を利用者側に委ねられます。

### TypedMessageDynamic

注意: このコンポーネントは高度な使用目的に向けて設計されていて、型安全性が失われます。
キーを動的に解決しなければならない場合にのみ使用して下さい。

JSX から `getMessageDynamic` と同じ動作でメッセージを解決するコンポーネントです。キーが見つからない場合は常に `MESSAGE_NOT_FOUND: {key}` を描画します。

#### Props

| プロパティ | 型 | 説明 |
|------------|-----|------|
| `messageKey` | `string` | 辞書を検索する実行時キー |
| `params` | `Record<string, unknown>` (任意) | プレースホルダに渡す値 |

#### 使用例

```tsx
<TypedMessageDynamic messageKey={runtimeKey} params={{ name: '太郎' }} />
```

----

## ディスカッションとPR

ディスカッションは、 [GitHubのディスカッションページ](https://github.com/kekyo/typed-message/discussions) を参照して下さい。現在はissueベースのディスカッションを取りやめています。

PRはWelcomeです。`develop`ブランチからの差分で送って下さい。送信する前に、あなたの変更をsquashしておいて下さい。

## ライセンス

Under MIT.
