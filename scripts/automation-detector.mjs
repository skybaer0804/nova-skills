// scripts/automation-detector.mjs
import Anthropic from '@anthropic-ai/sdk';

export class AutomationDetector {
  #client;
  #ai;

  constructor(memoryClient) {
    this.#client = memoryClient;
    this.#ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async detect() {
    return this.#client.getRepeatingPatterns(3);
  }

  async generateSuggestions(patterns) {
    if (patterns.length === 0) return [];

    const response = await this.#ai.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `Analyze repeated failure patterns from an AI agent loop and suggest ONE concrete automation per pattern.

## Repeated Bad Patterns (each >= 3 occurrences)
${patterns.map(p => `- [${p.role}] "${p.pattern}" (count: ${p.cnt})`).join('\n')}

Suggest a script, pre-check, or GitHub Action that would prevent each pattern.

Return JSON array only:
[{"pattern":"...","suggestion":"...","automation_type":"script|pre-check|github-action","priority":"HIGH|MEDIUM|LOW"}]`,
      }],
    });

    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('');
    const match = text.match(/\[[\s\S]*\]/);
    return match ? JSON.parse(match[0]) : [];
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const { MemoryClient } = await import('./memory-client.mjs');
  const client = new MemoryClient();
  await client.connect();
  const detector = new AutomationDetector(client);

  const patterns = await detector.detect();
  if (patterns.length === 0) {
    console.log('반복 패턴 없음 — 자동화 제안 없음');
  } else {
    const suggestions = await detector.generateSuggestions(patterns);
    console.log('## 자동화 제안\n');
    suggestions.forEach(s => console.log(`[${s.priority}] ${s.automation_type}: ${s.suggestion}`));
  }

  await client.disconnect();
}
