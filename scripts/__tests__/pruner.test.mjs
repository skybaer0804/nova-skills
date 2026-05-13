import { describe, it, expect } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pruner } from '../pruner.mjs';

const SKILLS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../skills');

describe('Pruner', () => {
  it('scanSkills returns array with name and updated fields', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const skills = await pruner.scanSkills();
    expect(skills.length).toBeGreaterThan(0);
    expect(skills[0]).toHaveProperty('name');
    expect(skills[0]).toHaveProperty('updated');
    expect(skills[0]).toHaveProperty('created');
  });

  it('findStale with threshold 0 returns all skills', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(0);
    const skills = await pruner.scanSkills();
    expect(stale).toHaveLength(skills.length);
    expect(stale[0]).toHaveProperty('daysSince');
    expect(stale[0].daysSince).toBeGreaterThanOrEqual(0);
  });

  it('findStale returns empty for far-future threshold', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(99999);
    expect(stale).toHaveLength(0);
  });

  it('generateReport includes skill names when stale found', async () => {
    const pruner = new Pruner(SKILLS_DIR);
    const stale = await pruner.findStale(0);
    const report = pruner.generateReport(stale);
    expect(report).toContain('Pruning Report');
    if (stale.length > 0) {
      expect(report).toContain(stale[0].name);
    }
  });
});
