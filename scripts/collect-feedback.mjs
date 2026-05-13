export class FeedbackCollector {
  #client;

  constructor(memoryClient) {
    this.#client = memoryClient;
  }

  validateInput({ satisfaction, archAligned }) {
    if (typeof satisfaction !== 'number' || satisfaction < 1 || satisfaction > 5) {
      throw new Error('satisfaction must be 1-5');
    }
    if (typeof archAligned !== 'boolean') {
      throw new Error('archAligned must be boolean');
    }
  }

  async save(sessionId, { satisfaction, archAligned, comment, ruleChangesRequested }) {
    this.validateInput({ satisfaction, archAligned });
    await this.#client.saveFeedback(sessionId, {
      satisfaction,
      archAligned,
      comment: comment ?? null,
      ruleChangesRequested: ruleChangesRequested ?? null,
    });
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { createInterface } = await import('readline');
  const { MemoryClient } = await import('./memory-client.mjs');

  const sessionId = process.argv[2];
  if (!sessionId) {
    console.error('Usage: node collect-feedback.mjs <session-id>');
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const ask = (q) => new Promise(resolve => rl.question(q, resolve));

  const satStr  = await ask('만족도 (1-5): ');
  const archStr = await ask('아키텍처가 의도에 맞았나요? (y/n): ');
  const comment = await ask('코멘트 (없으면 Enter): ');
  const ruleReq = await ask('수정 요청할 규칙 (없으면 Enter): ');
  rl.close();

  const client = new MemoryClient();
  await client.connect();
  const fc = new FeedbackCollector(client);
  await fc.save(sessionId, {
    satisfaction: parseInt(satStr, 10),
    archAligned: archStr.trim().toLowerCase() === 'y',
    comment: comment.trim() || null,
    ruleChangesRequested: ruleReq.trim() || null,
  });
  await client.disconnect();
  console.log('피드백 저장 완료');
}
