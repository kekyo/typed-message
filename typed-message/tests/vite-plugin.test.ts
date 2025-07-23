import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import typedMessage from '../src/vite-plugin';

// Temporary directory for testing
const testDir = join(tmpdir(), 'test-temp', randomUUID());
const localeDir = join(testDir, 'locale');
const outputDir = join(testDir, 'src/generated');
const outputFile = join(outputDir, 'messages.ts');

// Helper for safely executing plugin methods
async function callPluginHook(hook: any, ...args: any[]) {
  if (typeof hook === 'function') {
    return await hook(...args);
  } else if (hook && typeof hook.handler === 'function') {
    return await hook.handler(...args);
  }
}

describe('typedMessagePlugin', () => {
  beforeEach(() => {
    // Create test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
    mkdirSync(testDir, { recursive: true });
    mkdirSync(localeDir, { recursive: true });
  });

  afterEach(() => {
    // Remove test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  });

  it('plugin initializes correctly', () => {
    const plugin = typedMessage();
    expect(plugin.name).toBe('typed-message');
    expect(plugin.configResolved).toBeTypeOf('function');
    expect(plugin.buildStart).toBeTypeOf('function');
    expect(plugin.handleHotUpdate).toBeTypeOf('function');
  });

  it('default options are set correctly', async () => {
    const plugin = typedMessage();
    
    // Mock config
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    
    expect(plugin.name).toBe('typed-message');
  });

  it('custom options are applied correctly', () => {
    const customOptions = {
      localeDir: 'custom-locale',
      outputPath: 'custom-output/messages.ts'
    };
    
    const plugin = typedMessage(customOptions);
    expect(plugin.name).toBe('typed-message');
  });

  it('generates messages from single locale file', async () => {
    // Create test data
    const localeData = {
      TITLE: 'Test Title',
      DESCRIPTION: 'Test Description'
    };
    
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(localeData, null, 2));
    
    // Execute plugin
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    expect(existsSync(outputFile)).toBe(true);
    
    const generatedCode = readFileSync(outputFile, 'utf-8');
    expect(generatedCode).toContain('import type { MessageItem, SimpleMessageItem }');
    expect(generatedCode).toContain('export const messages');
    expect(generatedCode).toContain('TITLE: { ');
    expect(generatedCode).toContain('key: "TITLE"');
    expect(generatedCode).toContain('fallback: "Test Title"');
    expect(generatedCode).toContain('as SimpleMessageItem');
    expect(generatedCode).toContain('DESCRIPTION: { ');
    expect(generatedCode).toContain('key: "DESCRIPTION"');
    expect(generatedCode).toContain('fallback: "Test Description"');
    expect(generatedCode).toContain('as SimpleMessageItem');
  });

  it('aggregates multiple locale files according to priority order', async () => {
    // Create test data
    const defaultData = {
      TITLE: 'Default Title',
      SHARED_KEY: 'Default Shared'
    };
    
    const enData = {
      TITLE: 'English Title',
      EN_ONLY: 'English Only'
    };
    
    const jaData = {
      TITLE: 'Japanese Title',
      JA_ONLY: 'Japanese Only'
    };
    
    writeFileSync(join(localeDir, 'fallback.json'), JSON.stringify(defaultData, null, 2));
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));
    writeFileSync(join(localeDir, 'ja.json'), JSON.stringify(jaData, null, 2));
    
    // Execute plugin (default priority order: ['en', 'fallback'])
    // ja.json is not in priorityOrder, so it's processed last in alphabetical order
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    // Processing order: en.json -> fallback.json -> ja.json (alphabetical)
    // Last ja.json has highest priority, so TITLE becomes "Japanese Title"
    expect(generatedCode).toContain('key: "TITLE"');
    expect(generatedCode).toContain('fallback: "Japanese Title"');
    expect(generatedCode).toContain('key: "SHARED_KEY"');
    expect(generatedCode).toContain('fallback: "Default Shared"');
    expect(generatedCode).toContain('key: "EN_ONLY"');
    expect(generatedCode).toContain('fallback: "English Only"');
    expect(generatedCode).toContain('key: "JA_ONLY"');
    expect(generatedCode).toContain('fallback: "Japanese Only"');
  });

  it('fallbackPriorityOrder option works correctly', async () => {
    // Create test data
    const fallbackData = {
      TITLE: 'Fallback Title',
      SHARED_KEY: 'Fallback Shared'
    };
    
    const enData = {
      TITLE: 'English Title',
      EN_ONLY: 'English Only'
    };
    
    const jaData = {
      TITLE: 'Japanese Title',
      JA_ONLY: 'Japanese Only'
    };
    
    writeFileSync(join(localeDir, 'fallback.json'), JSON.stringify(fallbackData, null, 2));
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));
    writeFileSync(join(localeDir, 'ja.json'), JSON.stringify(jaData, null, 2));
    
    // Specify custom priority order: ja has highest priority
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['fallback', 'en', 'ja']
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    // ja.json has highest priority, so TITLE should be "Japanese Title"
    expect(generatedCode).toContain('key: "TITLE"');
    expect(generatedCode).toContain('fallback: "Japanese Title"');
    expect(generatedCode).toContain('key: "SHARED_KEY"');
    expect(generatedCode).toContain('fallback: "Fallback Shared"');
    expect(generatedCode).toContain('key: "EN_ONLY"');
    expect(generatedCode).toContain('fallback: "English Only"');
    expect(generatedCode).toContain('key: "JA_ONLY"');
    expect(generatedCode).toContain('fallback: "Japanese Only"');
  });

  it('files not in fallbackPriorityOrder are processed in alphabetical order', async () => {
    // Create test data
    const aData = { A_KEY: 'A Value' };
    const bData = { B_KEY: 'B Value' };
    const cData = { C_KEY: 'C Value' };
    const enData = { EN_KEY: 'EN Value' };
    
    writeFileSync(join(localeDir, 'a.json'), JSON.stringify(aData, null, 2));
    writeFileSync(join(localeDir, 'c.json'), JSON.stringify(cData, null, 2));
    writeFileSync(join(localeDir, 'b.json'), JSON.stringify(bData, null, 2));
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enData, null, 2));
    
    // en only specified in priorityOrder
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['en']
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    expect(generatedCode).toContain('key: "A_KEY"');
    expect(generatedCode).toContain('fallback: "A Value"');
    expect(generatedCode).toContain('key: "B_KEY"');
    expect(generatedCode).toContain('fallback: "B Value"');
    expect(generatedCode).toContain('key: "C_KEY"');
    expect(generatedCode).toContain('fallback: "C Value"');
    expect(generatedCode).toContain('key: "EN_KEY"');
    expect(generatedCode).toContain('fallback: "EN Value"');
  });

  it('locale directory does not exist without error', async () => {
    // Remove locale directory
    rmSync(localeDir, { recursive: true });
    
    const plugin = typedMessage({
      localeDir: 'nonexistent-locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    
    // Ensure no error occurs
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Ensure output file is not created
    expect(existsSync(outputFile)).toBe(false);
  });

  it('generates messages from invalid JSON files without error', async () => {
    // Create valid and invalid files
    const validData = { VALID_KEY: 'Valid Message' };
    writeFileSync(join(localeDir, 'valid.json'), JSON.stringify(validData, null, 2));
    writeFileSync(join(localeDir, 'invalid.json'), '{ invalid json }');
    
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    
    // Ensure no error occurs
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Ensure messages are generated from valid file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    expect(generatedCode).toContain('key: "VALID_KEY"');
    expect(generatedCode).toContain('fallback: "Valid Message"');
  });

  it('parses JSON5 locale files with comments and trailing commas', async () => {
    // Create JSON5 file with comments and trailing commas
    const json5Content = `{
      // This is a comment
      "TITLE": "JSON5 Title",
      "DESCRIPTION": "JSON5 Description", // inline comment
      "COMMENTS": "Supports comments",
      "TRAILING_COMMA": "Supports trailing commas",
      'SINGLE_QUOTES': 'Also supports single quotes',
      "UNQUOTED": 'Unquoted keys work too',
    }`;
    
    writeFileSync(join(localeDir, 'en.json5'), json5Content);
    
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    expect(generatedCode).toContain('key: "TITLE"');
    expect(generatedCode).toContain('fallback: "JSON5 Title"');
    expect(generatedCode).toContain('key: "DESCRIPTION"');
    expect(generatedCode).toContain('fallback: "JSON5 Description"');
    expect(generatedCode).toContain('key: "COMMENTS"');
    expect(generatedCode).toContain('fallback: "Supports comments"');
    expect(generatedCode).toContain('key: "TRAILING_COMMA"');
    expect(generatedCode).toContain('fallback: "Supports trailing commas"');
    expect(generatedCode).toContain('key: "SINGLE_QUOTES"');
    expect(generatedCode).toContain('fallback: "Also supports single quotes"');
    expect(generatedCode).toContain('key: "UNQUOTED"');
    expect(generatedCode).toContain('fallback: "Unquoted keys work too"');
  });

  it.each(['json5', 'jsonc'])('prioritizes JSON5/JSONC files over JSON files with same base name', async ext => {
    // Create both JSON and JSON5 files with same base name
    const jsonData = {
      TITLE: 'JSON Title',
      JSON_ONLY: 'Only in JSON'
    };
    
    const json5Content = `{
      // JSON5 version takes priority
      "TITLE": "JSON5 Title",
      "JSON5_ONLY": "Only in JSON5",
    }`;
    
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(jsonData, null, 2));
    writeFileSync(join(localeDir, `en.${ext}`), json5Content);
    
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    // JSON5 should take priority, so we should see JSON5 content
    expect(generatedCode).toContain('key: "TITLE"');
    expect(generatedCode).toContain('fallback: "JSON5 Title"');
    expect(generatedCode).toContain('key: "JSON5_ONLY"');
    expect(generatedCode).toContain('fallback: "Only in JSON5"');
    
    // JSON-only content should not appear
    expect(generatedCode).not.toContain('fallback: "JSON Title"');
    expect(generatedCode).not.toContain('key: "JSON_ONLY"');
  });

  it.each(['json5', 'jsonc'])('handles mixed JSON and JSON5/JSONC files correctly', async ext => {
    // Create mix of JSON and JSON5 files
    const enJsonData = {
      EN_KEY: 'English JSON'
    };
    
    const jaJson5Content = `{
      // Japanese locale in JSON5 format
      "JA_KEY": "Japanese JSON5",
    }`;
    
    const frJsonData = {
      FR_KEY: 'French JSON'
    };
    
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(enJsonData, null, 2));
    writeFileSync(join(localeDir, `ja.${ext}`), jaJson5Content);
    writeFileSync(join(localeDir, 'fr.json'), JSON.stringify(frJsonData, null, 2));
    
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    // All keys should be present
    expect(generatedCode).toContain('key: "EN_KEY"');
    expect(generatedCode).toContain('fallback: "English JSON"');
    expect(generatedCode).toContain('key: "JA_KEY"');
    expect(generatedCode).toContain('fallback: "Japanese JSON5"');
    expect(generatedCode).toContain('key: "FR_KEY"');
    expect(generatedCode).toContain('fallback: "French JSON"');
  });

  it('generates both named and default exports', async () => {
    // Create test data
    const localeData = {
      TITLE: 'Test Title',
      DESCRIPTION: 'Test Description'
    };
    
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(localeData, null, 2));
    
    // Execute plugin
    const plugin = typedMessage({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    await callPluginHook(plugin.configResolved, mockConfig);
    await callPluginHook(plugin.buildStart);
    
    // Check output file contains both exports
    expect(existsSync(outputFile)).toBe(true);
    
    const generatedCode = readFileSync(outputFile, 'utf-8');
    
    // Check for named export
    expect(generatedCode).toContain('export const messages');
    
    // Check for default export
    expect(generatedCode).toContain('export default messages');
    
    // Verify the default export comes after the named export
    const namedExportIndex = generatedCode.indexOf('export const messages');
    const defaultExportIndex = generatedCode.indexOf('export default messages');
    expect(defaultExportIndex).toBeGreaterThan(namedExportIndex);
  });
});
