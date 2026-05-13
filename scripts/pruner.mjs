import fs from 'fs';
import path from 'path';

function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const result = {};
  for (const line of match[1].split('\n')) {
    const [key, ...rest] = line.split(':');
    if (key && rest.length) result[key.trim()] = rest.join(':').trim();
  }
  return result;
}

export class Pruner {
  #skillsDir;

  constructor(skillsDir) {
    this.#skillsDir = skillsDir;
  }

  async scanSkills() {
    return fs.readdirSync(this.#skillsDir)
      .filter(d => fs.existsSync(path.join(this.#skillsDir, d, 'SKILL.md')))
      .map(d => {
        const content = fs.readFileSync(path.join(this.#skillsDir, d, 'SKILL.md'), 'utf-8');
        const fm = parseFrontmatter(content);
        return {
          name: d,
          updated: fm.updated ?? '1970-01-01',
          created: fm.created ?? '1970-01-01',
        };
      });
  }

  async findStale(thresholdDays = 180) {
    const skills = await this.scanSkills();
    const now = new Date();
    return skills
      .map(s => ({
        ...s,
        daysSince: Math.floor((now - new Date(s.updated)) / 86_400_000),
      }))
      .filter(s => s.daysSince >= thresholdDays)
      .sort((a, b) => b.daysSince - a.daysSince);
  }

  generateReport(stale) {
    const today = new Date().toISOString().slice(0, 10);
    if (stale.length === 0) {
      return `## Pruning Report — ${today}\n\nNo stale skills found (threshold met).`;
    }
    const lines = stale.map(s =>
      `- \`${s.name}\` — last updated ${s.updated} (${s.daysSince} days ago)`
    );
    return `## Pruning Report — ${today}\n\n${lines.join('\n')}\n\n**Action:** Review and update or remove these skills.`;
  }
}

// CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  const skillsDir = process.argv[2] ?? './skills';
  const days = parseInt(process.argv[3] ?? '180', 10);
  const pruner = new Pruner(skillsDir);
  const stale = await pruner.findStale(days);
  const report = pruner.generateReport(stale);
  console.log(report);

  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, report + '\n');
  }
}
