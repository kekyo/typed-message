// typed-message - Type-safe internationalization library for React and TypeScript
// Copyright (c) Kouji Matsui (@kekyo@mi.kekyo.net)
// Under MIT
// https://github.com/kekyo/typed-message

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { existsSync, writeFileSync, readFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import typedMessage from '../src/vite-plugin';

describe('Placeholder Type Validation', () => {
  const testDir = join(tmpdir(), 'test-temp-validation', randomUUID());
  const localeDir = join(testDir, 'locale');
  const outputFile = join(testDir, 'src', 'generated', 'messages.ts');

  // Helper function to call plugin hook
  async function callPluginHook(hook: any, ...args: any[]) {
    if (typeof hook === 'function') {
      return await hook(...args);
    }
  }

  beforeEach(() => {
    // Clean up and recreate test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(localeDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('should detect placeholder type conflicts between locales', async () => {
    // Create test locale files with type conflicts
    const fallbackData = {
      WELCOME_USER:
        'Hello {firstName} {lastName}, you are {age:number} years old!',
      MIXED_TYPES:
        'User {userId} has {balance:number} points and status {isActive:boolean}',
      TYPE_CONFLICT: 'Value: {value:string}, Count: {count:number}',
    };

    const enData = {
      WELCOME_USER: 'Welcome {firstName} {lastName}! Age: {age:number}',
      MIXED_TYPES:
        'User {userId:number} has {balance:number} points and status {isActive:boolean}',
      TYPE_CONFLICT: 'Value: {value:number}, Count: {count:boolean}',
    };

    const jaData = {
      WELCOME_USER:
        'こんにちは {firstName} {lastName}さん、{age:number}歳ですね',
      MIXED_TYPES:
        'ユーザー{userId:boolean}の残高は{balance:string}ポイント、ステータスは{isActive:number}です',
      TYPE_CONFLICT: 'Value: {value:boolean}, Count: {count:date}',
    };

    writeFileSync(
      join(localeDir, 'fallback.json'),
      JSON.stringify(fallbackData, null, 2)
    );
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));
    writeFileSync(join(localeDir, 'ja.json'), JSON.stringify(jaData, null, 2));

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['fallback', 'en', 'ja'],
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    // Check that the file was generated
    expect(existsSync(outputFile)).toBe(true);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Check for type conflict warnings in JSDoc
    expect(generatedCode).toContain(
      'Warning: Placeholder types do not match across locales'
    );
    expect(generatedCode).toContain(
      'userId: fallback.json: string, en.json: number, ja.json: boolean'
    );
    expect(generatedCode).toContain(
      'value: fallback.json: string, en.json: number, ja.json: boolean'
    );
    expect(generatedCode).toContain(
      'count: fallback.json: number, en.json: boolean, ja.json: date'
    );
  });

  it('should handle implicit types correctly', async () => {
    // Create test files with implicit vs explicit types
    const fallbackData = {
      IMPLICIT_TEST: 'Order {orderId} for {amount} dollars is {status}', // all implicit (string)
    };

    const enData = {
      IMPLICIT_TEST:
        'Order {orderId:number} for {amount:number} dollars is {status}', // explicit types
    };

    writeFileSync(
      join(localeDir, 'fallback.json'),
      JSON.stringify(fallbackData, null, 2)
    );
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['fallback', 'en'],
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Should use explicit types from en.json
    expect(generatedCode).toContain('orderId: number');
    expect(generatedCode).toContain('amount: number');
    expect(generatedCode).toContain('status: string');

    // Should now generate warnings for implicit vs explicit type conflicts
    expect(generatedCode).toContain(
      'Warning: Placeholder types do not match across locales'
    );
    expect(generatedCode).toContain(
      'orderId: fallback.json: string, en.json: number'
    );
    expect(generatedCode).toContain(
      'amount: fallback.json: string, en.json: number'
    );
  });

  it('should handle invalid JSON files and generate warnings', async () => {
    // Create valid and invalid JSON files
    const validData = {
      VALID_KEY: 'Valid message {param:number}',
    };

    writeFileSync(
      join(localeDir, 'valid.json'),
      JSON.stringify(validData, null, 2)
    );
    writeFileSync(join(localeDir, 'invalid.json'), '{ invalid: json syntax }');
    writeFileSync(join(localeDir, 'broken.json'), '{ "unclosed": quote');

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    expect(existsSync(outputFile)).toBe(true);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Should contain warning about invalid files
    expect(generatedCode).toContain(
      'Warning: Failed to load the following locale files'
    );
    expect(generatedCode).toContain('invalid.json');
    expect(generatedCode).toContain('broken.json');
    expect(generatedCode).toContain(
      'These files are not included in the generated code'
    );

    // Should still contain messages from valid files
    expect(generatedCode).toContain('VALID_KEY');
  });

  it('should not generate warnings when all types are consistent', async () => {
    // Create test files with consistent types
    const fallbackData = {
      CONSISTENT_MESSAGE: 'User {userId:number} has {balance:number} points',
    };

    const enData = {
      CONSISTENT_MESSAGE:
        'User {userId:number} balance: {balance:number} points',
    };

    writeFileSync(
      join(localeDir, 'fallback.json'),
      JSON.stringify(fallbackData, null, 2)
    );
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Should not contain any warnings
    expect(generatedCode).not.toContain('Warning:');
    expect(generatedCode).toContain('CONSISTENT_MESSAGE');
  });

  it('should detect conflicts between implicit string and explicit types', async () => {
    // Create test files with string vs explicit type conflicts
    const fallbackData = {
      DATE_MESSAGE: 'Today is {date} and temperature is {temp:number}°C', // date is implicit string
      MIXED_PARAMS: 'User {userId} has {balance:number} points', // userId is implicit string
    };

    const enData = {
      DATE_MESSAGE: 'Today: {date:date}, Temperature: {temp:number}°C', // date is explicit date type
      MIXED_PARAMS: 'User {userId:boolean} balance: {balance:number}', // userId is explicit boolean
    };

    writeFileSync(
      join(localeDir, 'fallback.json'),
      JSON.stringify(fallbackData, null, 2)
    );
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['fallback', 'en'],
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    expect(existsSync(outputFile)).toBe(true);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Should detect type conflicts for both date and userId parameters
    expect(generatedCode).toContain(
      'Warning: Placeholder types do not match across locales'
    );
    expect(generatedCode).toContain(
      'date: fallback.json: string, en.json: date'
    );
    expect(generatedCode).toContain(
      'userId: fallback.json: string, en.json: boolean'
    );

    // Should use explicit types (date, boolean) over implicit string types
    expect(generatedCode).toContain('date: Date');
    expect(generatedCode).toContain('userId: boolean');
  });

  it('should reproduce and fix the demo FORMATTED_DATE issue', async () => {
    // Reproduce the exact issue found in demo: ja.json uses string, others use date
    const fallbackData = {
      FORMATTED_DATE:
        'FB:Today is {date:date} and the temperature is {temperature:number}°C',
    };

    const enData = {
      FORMATTED_DATE:
        'Today is {date:date} and the temperature is {temperature:number}°C',
    };

    const jaData = {
      FORMATTED_DATE: '今日は{date:string}で、気温は{temperature:number}°Cです', // string instead of date
    };

    writeFileSync(
      join(localeDir, 'fallback.json'),
      JSON.stringify(fallbackData, null, 2)
    );
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));
    writeFileSync(join(localeDir, 'ja.json'), JSON.stringify(jaData, null, 2));

    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['ja', 'en', 'fallback'],
    });

    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);

    expect(existsSync(outputFile)).toBe(true);

    const generatedCode = readFileSync(outputFile, 'utf-8');

    // Should detect the specific conflict found in demo
    expect(generatedCode).toContain(
      'Warning: Placeholder types do not match across locales'
    );
    expect(generatedCode).toContain(
      'date: ja.json: string, en.json: date, fallback.json: date'
    );

    // Should prioritize explicit date type over string type in the final generated code
    expect(generatedCode).toContain('date: Date');
    expect(generatedCode).toContain('temperature: number');
  });
});
