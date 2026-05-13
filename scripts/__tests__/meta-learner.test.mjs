// scripts/__tests__/meta-learner.test.mjs
import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { MetaLearner } from '../meta-learner.mjs';
import { MemoryClient } from '../memory-client.mjs';

// Mock Anthropic SDK so tests run without ANTHROPIC_API_KEY
vi.mock('@anthropic-ai/sdk', () => {
  const MockAnthropic = vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: '[]' }],
      }),
    },
  }));
  return { default: MockAnthropic };
});

describe('MetaLearner', () => {
  let client;
  let learner;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    learner = new MetaLearner(client);

    // Insert 3 identical BAD cases so analyzePatterns detects them
    for (let i = 0; i < 3; i++) {
      const sid = await client.createSession('learner-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'IMPLEMENTER',
        level: 'MEDIUM', content: 'E2E를 unit 테스트 전 실행함', impact: '실패 원인 가려짐',
      });
    }
  });
  afterAll(async () => { if (client) await client.disconnect(); });

  it('analyzePatterns returns patterns with cnt >= 3', async () => {
    const patterns = await learner.analyzePatterns();
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0].cnt).toBeGreaterThanOrEqual(3);
  });

  it('generateImprovements returns only MEDIUM/LOW proposals', async () => {
    const proposals = await learner.generateImprovements();
    expect(Array.isArray(proposals)).toBe(true);
    for (const p of proposals) {
      expect(['MEDIUM', 'LOW']).toContain(p.level);
    }
  });

  it('applyImprovements updates a rule version in DB', async () => {
    const rules = await client.getActiveRules(['MEDIUM']);
    if (rules.length === 0) return;

    const proposals = [{
      rule_name: rules[0].rule_name,
      level: 'MEDIUM',
      new_content: '업데이트된 규칙 내용 테스트',
      reason: '테스트 이유',
    }];
    const applied = await learner.applyImprovements(proposals);
    expect(applied).toContain(rules[0].rule_name);

    const updated = await client.getActiveRules(['MEDIUM']);
    const target = updated.find(r => r.rule_name === rules[0].rule_name);
    expect(target.version).toBeGreaterThan(1);
  });
});
