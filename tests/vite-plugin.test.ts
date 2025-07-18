import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { typedMessagePlugin } from '../src/vite-plugin';

// Temporary directory for testing
const testDir = join(process.cwd(), 'test-temp');
const localeDir = join(testDir, 'locale');
const outputDir = join(testDir, 'src/generated');
const outputFile = join(outputDir, 'messages.ts');

// Helper for safely executing plugin methods
function callPluginHook(hook: any, ...args: any[]) {
  if (typeof hook === 'function') {
    return hook(...args);
  } else if (hook && typeof hook.handler === 'function') {
    return hook.handler(...args);
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
    const plugin = typedMessagePlugin();
    expect(plugin.name).toBe('typed-message');
    expect(plugin.configResolved).toBeTypeOf('function');
    expect(plugin.buildStart).toBeTypeOf('function');
    expect(plugin.handleHotUpdate).toBeTypeOf('function');
  });

  it('default options are set correctly', () => {
    const plugin = typedMessagePlugin();
    
    // Mock config
    const mockConfig = { root: testDir };
    callPluginHook(plugin.configResolved, mockConfig);
    
    expect(plugin.name).toBe('typed-message');
  });

  it('custom options are applied correctly', () => {
    const customOptions = {
      localeDir: 'custom-locale',
      outputPath: 'custom-output/messages.ts'
    };
    
    const plugin = typedMessagePlugin(customOptions);
    expect(plugin.name).toBe('typed-message');
  });

  it('generates messages from single locale file', () => {
    // Create test data
    const localeData = {
      TITLE: 'Test Title',
      DESCRIPTION: 'Test Description'
    };
    
    writeFileSync(join(localeDir, 'en.json'), JSON.stringify(localeData, null, 2));
    
    // Execute plugin
    const plugin = typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    callPluginHook(plugin.configResolved, mockConfig);
    callPluginHook(plugin.buildStart);
    
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

  it('aggregates multiple locale files according to priority order', () => {
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
    const plugin = typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    callPluginHook(plugin.configResolved, mockConfig);
    callPluginHook(plugin.buildStart);
    
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

  it('fallbackPriorityOrder option works correctly', () => {
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
    const plugin = typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['fallback', 'en', 'ja']
    });
    
    const mockConfig = { root: testDir };
    callPluginHook(plugin.configResolved, mockConfig);
    callPluginHook(plugin.buildStart);
    
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

  it('files not in fallbackPriorityOrder are processed in alphabetical order', () => {
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
    const plugin = typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts',
      fallbackPriorityOrder: ['en']
    });
    
    const mockConfig = { root: testDir };
    callPluginHook(plugin.configResolved, mockConfig);
    callPluginHook(plugin.buildStart);
    
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

  it('locale directory does not exist without error', () => {
    // Remove locale directory
    rmSync(localeDir, { recursive: true });
    
    const plugin = typedMessagePlugin({
      localeDir: 'nonexistent-locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    
    // Ensure no error occurs
    expect(() => {
      callPluginHook(plugin.configResolved, mockConfig);
      callPluginHook(plugin.buildStart);
    }).not.toThrow();
    
    // Ensure output file is not created
    expect(existsSync(outputFile)).toBe(false);
  });

  it('generates messages from invalid JSON files without error', () => {
    // Create valid and invalid files
    const validData = { VALID_KEY: 'Valid Message' };
    writeFileSync(join(localeDir, 'valid.json'), JSON.stringify(validData, null, 2));
    writeFileSync(join(localeDir, 'invalid.json'), '{ invalid json }');
    
    const plugin = typedMessagePlugin({
      localeDir: 'locale',
      outputPath: 'src/generated/messages.ts'
    });
    
    const mockConfig = { root: testDir };
    
    // Ensure no error occurs
    expect(() => {
      callPluginHook(plugin.configResolved, mockConfig);
      callPluginHook(plugin.buildStart);
    }).not.toThrow();
    
    // Ensure messages are generated from valid file
    const generatedCode = readFileSync(outputFile, 'utf-8');
    expect(generatedCode).toContain('key: "VALID_KEY"');
    expect(generatedCode).toContain('fallback: "Valid Message"');
  });
}); 