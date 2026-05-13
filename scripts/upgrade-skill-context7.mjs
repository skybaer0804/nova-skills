import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';
import path from 'path';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const SKILLS_DIR = './skills';
const CONTEXT7_BASE = 'https://context7.com/api/v1';

// ── 헬퍼: frontmatter 파싱 ──────────────────────────────────────────────────
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

function setFrontmatterField(content, key, value) {
  const parts = content.split('---', 3); // ['', frontmatter, rest]
  if (parts.length < 3) return content;
  const fm = parts[1];
  const regex = new RegExp(`^(${key}:).*$`, 'm');
  const updated = regex.test(fm)
    ? fm.replace(regex, `$1 ${value}`)
    : fm.trimEnd() + `\n${key}: ${value}`;
  return '---' + updated + '\n---' + parts[2];
}

// ── 헬퍼: context7 API ─────────────────────────────────────────────────────
async function context7Search(query) {
  try {
    const res = await fetch(`${CONTEXT7_BASE}/search?query=${encodeURIComponent(query)}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.[0]?.id ?? null;
  } catch { return null; }
}

async function context7Docs(libraryId, tokens = 8000) {
  try {
    const res = await fetch(`${CONTEXT7_BASE}/${libraryId}?tokens=${tokens}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data?.content ?? null;
  } catch { return null; }
}

// ── 스킬 목록 수집 + updated 날짜 기준 정렬 ─────────────────────────────────
const skills = fs.readdirSync(SKILLS_DIR)
  .filter(d => fs.existsSync(path.join(SKILLS_DIR, d, 'SKILL.md')))
  .map(d => {
    const filePath = path.join(SKILLS_DIR, d, 'SKILL.md');
    const content = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(content);
    return {
      name: d,
      filePath,
      content,
      updated: fm.updated ?? '1970-01-01',
      created: fm.created ?? '1970-01-01',
    };
  })
  // updated 날짜 오름차순 → 가장 오래된 것이 첫 번째
  .sort((a, b) => a.updated.localeCompare(b.updated));

if (skills.length === 0) { console.error('No skills'); process.exit(1); }

const target = skills[0];
console.log(`Target: ${target.name}  (last updated: ${target.updated})`);

// ── 스킬에서 라이브러리/기술 키워드 추출 (name 기반) ──────────────────────────
// name 패턴: nextjs-*, nestjs-*, r3f-*, three-*, agent-*, docker-*, github-*, pnpm
const libraryMap = {
  'nextjs':    'next.js',
  'nestjs':    'nestjs',
  'r3f':       '@react-three/fiber',
  'three':     'three.js',
  'agent':     null,        // 프로토콜 기반 — 별도 처리
  'docker':    'docker compose',
  'github':    'github actions',
  'pnpm':      'pnpm',
};

const prefix = target.name.split('-')[0];
const libraryQuery = libraryMap[prefix] ?? target.name.replace(/-/g, ' ');

// ── context7에서 문서 가져오기 ────────────────────────────────────────────────
let context7Content = '';
if (libraryQuery) {
  console.log(`Searching context7: "${libraryQuery}"`);
  const libraryId = await context7Search(libraryQuery);
  if (libraryId) {
    console.log(`Found library ID: ${libraryId}`);
    const docs = await context7Docs(libraryId);
    if (docs) {
      context7Content = `\n\n## context7 최신 문서 (${libraryQuery})\n${docs.slice(0, 6000)}`;
      console.log(`Loaded ${docs.length} chars from context7`);
    }
  } else {
    console.log('context7: library not found, proceeding without docs');
  }
}

// ── Claude API 호출 ───────────────────────────────────────────────────────────
const today = new Date().toISOString().slice(0, 10);

const response = await client.messages.create({
  model: 'claude-opus-4-7',
  max_tokens: 4096,
  messages: [{
    role: 'user',
    content: `You are upgrading a skill file for a Claude Code skills repository (nova-skills).
Domain: Next.js frontend, NestJS backend, React Three Fiber, AI agent protocols.

## Skill to Upgrade: ${target.name}
Created: ${target.created} | Last Updated: ${target.updated}

## Current Content
\`\`\`markdown
${target.content}
\`\`\`
${context7Content}

## Task
Using the context7 documentation above, identify ONE concrete improvement:
- New/changed API, deprecated pattern, or updated best practice
- New common mistake developers encounter
- Improved or corrected code example

Make the minimal targeted change. Do NOT rewrite the skill.

## Rules
- Frontmatter fields (name, description, created, updated) — do NOT change these; the script handles dates
- Description must start with "Use when..." — triggering conditions only
- Body content in Korean
- No version notes (e.g., "> v1.x: ...") in the body
- One focused change only

Return ONLY the complete updated SKILL.md content with no explanation or fences.`
  }]
});

const updatedBody = response.content
  .filter(b => b.type === 'text')
  .map(b => b.text)
  .join('')
  .trim();

if (!updatedBody || updatedBody === target.content.trim()) {
  console.log('No changes — skipping PR');
  fs.appendFileSync(process.env.GITHUB_OUTPUT ?? '/dev/null', 'changed=false\n');
  process.exit(0);
}

// updated 날짜를 오늘로 갱신
const finalContent = setFrontmatterField(updatedBody, 'updated', today) + '\n';
fs.writeFileSync(target.filePath, finalContent);
console.log(`Updated: ${target.filePath}  updated=${today}`);

// PR 본문
const prBody = `## Thursday Skill Upgrade

**Skill:** \`${target.name}\`
**Previous update:** ${target.updated} → **Today:** ${today}
**Source:** context7 (${libraryQuery || 'general'})

Upgraded with latest API changes and best practices from context7 documentation.

---
*Generated by [thursday-skill-upgrade workflow](../.github/workflows/thursday-skill-upgrade.yml)*`;

fs.writeFileSync('/tmp/pr-body.md', prBody);

const out = process.env.GITHUB_OUTPUT ?? '/dev/null';
fs.appendFileSync(out, `changed=true\n`);
fs.appendFileSync(out, `skill_name=${target.name}\n`);
