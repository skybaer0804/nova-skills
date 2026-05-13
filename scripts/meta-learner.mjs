// scripts/meta-learner.mjs
import Anthropic from '@anthropic-ai/sdk';

export class MetaLearner {
  #client;
  #ai;

  constructor(memoryClient) {
    this.#client = memoryClient;
    this.#ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async analyzePatterns() {
    return this.#client.getRepeatingPatterns(3);
  }

  async generateImprovements() {
    const [badCases, rules] = await Promise.all([
      this.#client.getAllBadCases(90),
      this.#client.getActiveRules(['MEDIUM', 'LOW']),
    ]);

    if (badCases.length === 0) return [];

    const response = await this.#ai.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `You are analyzing bad cases from an AI agent loop system to improve MEDIUM/LOW rules only.

## Recent Bad Cases (last 90 days)
${badCases.map(c => `- [${c.role}] ${c.content} | impact: ${c.impact ?? 'N/A'} | task: ${c.task_description}`).join('\n')}

## Current MEDIUM/LOW Rules
${rules.map(r => `- [${r.level}] ${r.rule_name}: ${r.content}`).join('\n')}

Identify patterns and propose concrete improvements. DO NOT suggest CRITICAL or HIGH rule changes.

Return JSON array only (no explanation):
[{"rule_name": "existing_rule_name", "level": "MEDIUM|LOW", "new_content": "...", "reason": "..."}]
Return [] if no improvements are needed.`,
      }],
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];

    const proposals = JSON.parse(match[0]);
    return proposals.filter(p => ['MEDIUM', 'LOW'].includes(p.level));
  }

  async applyImprovements(proposals) {
    const applied = [];
    for (const p of proposals) {
      await this.#client.updateRule(p.rule_name, {
        content: p.new_content,
        modifiedReason: p.reason,
      });
      applied.push(p.rule_name);
    }
    return applied;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { MemoryClient } = await import('./memory-client.mjs');
  const client = new MemoryClient();
  await client.connect();
  const learner = new MetaLearner(client);

  const proposals = await learner.generateImprovements();
  if (proposals.length === 0) {
    console.log('개선 제안 없음');
  } else {
    const applied = await learner.applyImprovements(proposals);
    console.log(`적용된 규칙: ${applied.join(', ')}`);
    proposals.forEach(p => console.log(`  [${p.level}] ${p.rule_name}: ${p.new_content}`));
  }

  await client.disconnect();
}
