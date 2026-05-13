import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MemoryClient } from '../memory-client.mjs';

describe('MemoryClient', () => {
  let client;
  let sessionId;

  beforeAll(async () => { client = new MemoryClient(); await client.connect(); });
  afterAll(async () => { if (client) await client.disconnect(); });
  beforeEach(async () => {
    sessionId = await client.createSession('test task ' + Date.now());
  });

  it('createSession returns UUID', () => {
    expect(sessionId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });

  it('addIteration and getLatestIteration', async () => {
    await client.addIteration(sessionId, {
      iterationNumber: 1, status: 'FAIL', nextAction: 'IMPLEMENT',
    });
    const iter = await client.getLatestIteration(sessionId);
    expect(iter.iteration_number).toBe(1);
    expect(iter.status).toBe('FAIL');
  });

  it('addMetaCase and getMetaCases', async () => {
    await client.addMetaCase(sessionId, {
      iterationNumber: 1, caseType: 'BAD', role: 'IMPLEMENTER',
      level: 'CRITICAL', content: 'TDD 순서 위반',
    });
    const cases = await client.getMetaCases(sessionId);
    expect(cases).toHaveLength(1);
    expect(cases[0].content).toBe('TDD 순서 위반');
  });

  it('getActiveRules returns MEDIUM/LOW seeded rules only', async () => {
    const rules = await client.getActiveRules(['MEDIUM', 'LOW']);
    expect(rules.length).toBeGreaterThan(0);
    expect(rules.every(r => ['MEDIUM', 'LOW'].includes(r.level))).toBe(true);
  });

  it('completeSession updates final_status', async () => {
    await client.completeSession(sessionId, 'DONE');
    const session = await client.getSession(sessionId);
    expect(session.final_status).toBe('DONE');
    expect(session.completed_at).not.toBeNull();
  });

  it('saveFeedback and getFeedback round-trip', async () => {
    await client.saveFeedback(sessionId, {
      satisfaction: 4, archAligned: true, comment: '잘 동작함',
    });
    const fb = await client.getFeedback(sessionId);
    expect(fb).toHaveLength(1);
    expect(fb[0].satisfaction).toBe(4);
  });

  it('getRepeatingPatterns detects patterns with cnt >= threshold', async () => {
    for (let i = 0; i < 3; i++) {
      const sid = await client.createSession('pattern-test-' + i);
      await client.addMetaCase(sid, {
        iterationNumber: 1, caseType: 'BAD', role: 'ARCHITECT',
        content: '반복되는 테스트 패턴 XYZ',
      });
    }
    const patterns = await client.getRepeatingPatterns(3);
    expect(patterns.some(p => p.cnt >= 3)).toBe(true);
  });
});
