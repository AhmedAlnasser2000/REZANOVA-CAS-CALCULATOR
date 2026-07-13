import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { scanResultIntent } from './result-intent-ratchet-core.mjs';

function fixture(source) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calcwiz-result-intent-'));
  fs.mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  fs.writeFileSync(path.join(rootDir, 'src', 'fixture.ts'), source);
  return rootDir;
}

test('rejects an ambiguous direct solve summary', () => {
  const rootDir = fixture(`const outcome = { solveSummaryText: 'Solved.' };`);
  const report = scanResultIntent({ rootDir });
  assert.equal(report.summary.violationCount, 1);
  assert.match(report.violations[0].message, /forbidden/u);
});

test('rejects paired legacy fields and accepts typed helper spreads', () => {
  const rootDir = fixture(`
    const paired = { solveSummaryText: 'Solved.', solveSummaryParts: [[{ kind: 'text', text: 'Solved.' }]] };
    const spread = { ...proseSolveSummary('Solved.') };
  `);
  const report = scanResultIntent({ rootDir });
  assert.deepEqual(report.summary, {
    directSummaryAssignments: 1,
    violationCount: 1,
  });
});
