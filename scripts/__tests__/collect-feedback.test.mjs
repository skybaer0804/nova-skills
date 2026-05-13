import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FeedbackCollector } from '../collect-feedback.mjs';
import { MemoryClient } from '../memory-client.mjs';

describe('FeedbackCollector', () => {
  let client;
  let sessionId;

  beforeAll(async () => {
    client = new MemoryClient();
    await client.connect();
    sessionId = await client.createSession('feedback-test');
  });

  afterAll(async () => { if (client) await client.disconnect(); });

  it('validateInput throws on satisfaction out of range', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 6, archAligned: true })).toThrow('satisfaction must be 1-5');
    expect(() => fc.validateInput({ satisfaction: 0, archAligned: true })).toThrow('satisfaction must be 1-5');
  });

  it('validateInput throws on non-boolean archAligned', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 3, archAligned: 'yes' })).toThrow('archAligned must be boolean');
  });

  it('validateInput accepts valid input', () => {
    const fc = new FeedbackCollector(client);
    expect(() => fc.validateInput({ satisfaction: 5, archAligned: false })).not.toThrow();
  });

  it('save stores and getFeedback retrieves', async () => {
    const fc = new FeedbackCollector(client);
    await fc.save(sessionId, { satisfaction: 4, archAligned: true, comment: '잘 동작함' });
    const fb = await client.getFeedback(sessionId);
    expect(fb).toHaveLength(1);
    expect(fb[0].satisfaction).toBe(4);
    expect(fb[0].arch_aligned).toBe(1); // MySQL TINYINT stores boolean as 1/0
    expect(fb[0].comment).toBe('잘 동작함');
  });
});
