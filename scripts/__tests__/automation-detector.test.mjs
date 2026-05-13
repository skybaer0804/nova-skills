// scripts/__tests__/automation-detector.test.mjs
import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import { AutomationDetector } from '../automation-detector.mjs';
import { MemoryClient } from '../memory-client.mjs';

// Mock Anthropic so generateSuggestions doesn't need an API key
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[{"pattern":"test","suggestion":"add pre-check","automation_type":"pre-check","priority":"HIGH"}]' }],
      }),
    };
  },
}));

describe('AutomationDetector', () => {
  let client;
  let detector;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    detector = new AutomationDetector(client);

    // Insert 4 identical BAD cases
    for (let i = 0; i < 4; i++) {
      const sid = await client.createSession('autodetect-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'ARCHITECT',
        content: 'research_done 확인 없이 설계 진행', impact: '잘못된 API 사용',
      });
    }
  });
  afterAll(async () => { if (client) await client.disconnect(); });

  it('detect returns patterns with cnt >= 3', async () => {
    const patterns = await detector.detect();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.every(p => p.cnt >= 3)).toBe(true);
  });

  it('generateSuggestions returns array for non-empty patterns', async () => {
    const patterns = await detector.detect();
    const suggestions = await detector.generateSuggestions(patterns);
    expect(Array.isArray(suggestions)).toBe(true);
    expect(suggestions.length).toBeGreaterThan(0);
  });

  it('generateSuggestions returns [] for empty patterns', async () => {
    const suggestions = await detector.generateSuggestions([]);
    expect(suggestions).toEqual([]);
  });
});
