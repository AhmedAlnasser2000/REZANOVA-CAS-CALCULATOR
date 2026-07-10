import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import {
  buildWorkspaceFreshnessReport,
  formatWorkspaceFreshnessHuman,
  parseWorkspaceFreshnessArgs,
  scanWorkspaceSessionEvidence,
  WORKSPACE_FRESHNESS_WORKSPACES,
} from './workspace-freshness-core.mjs';

function makeRoot(sessions) {
  const root = mkdtempSync(join(tmpdir(), 'calcwiz-freshness-'));
  for (const { date, slug } of sessions) {
    mkdirSync(join(root, '.memory', 'sessions', date.slice(0, 7), date, slug), { recursive: true });
  }
  return root;
}

test('shared aliases and fourteen-day boundary produce deterministic status', () => {
  const root = makeRoot([
    { date: '2026-06-25', slug: '2026-06-25__anti-regression-program' },
    { date: '2026-06-26', slug: '2026-06-26__matrix-profile1' },
    { date: '2026-07-01', slug: '2026-07-01__linear-algebra-audit0' },
    { date: '2026-07-12', slug: '2026-07-12__statistics-future1' },
  ]);
  const report = buildWorkspaceFreshnessReport(root, '2026-07-10');
  assert.equal(report.results.length, 9);
  assert.deepEqual(report.results.find((entry) => entry.workspace === 'calculate'), {
    workspace: 'calculate', status: 'stale', latestDate: '2026-06-25',
    latestSession: '2026-06-25__anti-regression-program', ageDays: 15,
  });
  assert.equal(report.results.find((entry) => entry.workspace === 'matrix').status, 'fresh');
  assert.equal(report.results.find((entry) => entry.workspace === 'vector').latestDate, '2026-07-01');
  assert.equal(report.results.find((entry) => entry.workspace === 'statistics').latestDate, '2026-06-25');
});

test('missing evidence is warning-only report data', () => {
  const root = makeRoot([{ date: '2026-07-10', slug: '2026-07-10__equation-only1' }]);
  const report = buildWorkspaceFreshnessReport(root, '2026-07-10');
  assert.equal(report.results.find((entry) => entry.workspace === 'equation').status, 'fresh');
  assert.equal(report.results.filter((entry) => entry.status === 'missing').length, 8);
  assert.match(formatWorkspaceFreshnessHuman(report), /Warnings: 8; freshness is operational evidence/u);
});

test('human and JSON report ordering is stable', () => {
  const root = makeRoot([{ date: '2026-07-09', slug: '2026-07-09__workspace-canary-suite1' }]);
  const report = buildWorkspaceFreshnessReport(root, '2026-07-10');
  assert.deepEqual(report.results.map((entry) => entry.workspace), WORKSPACE_FRESHNESS_WORKSPACES);
  assert.equal(JSON.stringify(report), JSON.stringify(buildWorkspaceFreshnessReport(root, '2026-07-10')));
  assert.match(formatWorkspaceFreshnessHuman(report), /^Workspace Freshness Report\nAs of: 2026-07-10/u);
});

test('invalid arguments and unreadable repository state fail', () => {
  assert.throws(() => parseWorkspaceFreshnessArgs([]), /--as-of/u);
  assert.throws(() => parseWorkspaceFreshnessArgs(['--as-of', '2026-02-30']), /real calendar date/u);
  assert.throws(() => parseWorkspaceFreshnessArgs(['--wat']), /Unknown argument/u);
  assert.deepEqual(parseWorkspaceFreshnessArgs(['--json', '--as-of', '2026-07-10']), {
    asOf: '2026-07-10', json: true,
  });
  const root = mkdtempSync(join(tmpdir(), 'calcwiz-freshness-missing-'));
  assert.throws(() => scanWorkspaceSessionEvidence(root), /Unreadable session repository/u);
});

test('weekly workflow runs real canaries and publishes both reports without commits', () => {
  const workflow = readFileSync(resolve('.github/workflows/weekly-anti-regression.yml'), 'utf8');
  assert.match(workflow, /cron: '17 3 \* \* 1'/u);
  assert.match(workflow, /workflow_dispatch:/u);
  assert.match(workflow, /playwright install --with-deps chromium/u);
  assert.match(workflow, /npm run build/u);
  assert.match(workflow, /npm run test:canaries:browser/u);
  assert.match(workflow, /npm run test:history-replay/u);
  assert.match(workflow, /npm run test:history-replay:browser/u);
  assert.match(workflow, /history-replay\.txt/u);
  assert.match(workflow, /history-replay\.json/u);
  assert.match(workflow, /workspace-freshness\.txt/u);
  assert.match(workflow, /workspace-freshness\.json/u);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/u);
  assert.match(workflow, /actions\/upload-artifact@v4/u);
  assert.doesNotMatch(workflow, /git (?:add|commit|push)/u);
});
