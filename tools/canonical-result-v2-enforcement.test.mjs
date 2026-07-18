import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ENFORCEMENT_BASELINE_PATH,
  compareEnforcementBaselines,
  readBaselineAtGitRef,
  readProducerVersionPolicyAtGitRef,
  sha256,
  validateCurrentRepository,
} from './canonical-result-v2-enforcement-core.mjs';

const ROUTE = 'calculate.arithmetic';

function fixtureRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'canonical-result-v2-enforcement-'));
  const frozenRouteIds = Array.from(
    { length: 57 },
    (_, index) => index === 0 ? ROUTE : `route.${index}`,
  );
  const routeLiterals = frozenRouteIds.map((routeId) => `'${routeId}'`).join(',\n  ');
  const files = {
    'src/lib/modes/calculate/result-document.ts': 'buildCanonicalResultDocumentFromProducer({});\n',
    'src/lib/result-contract/producer.ts': 'export function buildCanonicalResultDocumentFromProducer() {}\n',
    'src/lib/result-contract/producer-version-registry.ts': `
export const FROZEN_V1_PRODUCER_ROUTE_IDS = ([
  ${routeLiterals}
] as const);
export const CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES = ([]);
const defaultVersion = v2DefaultRoutes.has(routeId) || !frozenV1Routes.has(routeId) ? 2 : 1;
`,
    'src/lib/result-contract/mathjson-route-registry.ts': `
export const MATHJSON_ROUTE_REGISTRY = {
  ${frozenRouteIds.map((routeId) => `'${routeId}': route('calculate')`).join(',\n  ')},
} as const satisfies Record<string, unknown>;
export const MATHJSON_COVERAGE_EXEMPTIONS: readonly never[] = [];
`,
  };
  for (const [repoPath, content] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(root, repoPath)), { recursive: true });
    writeFileSync(path.join(root, repoPath), content);
  }
  const producerPath = 'src/lib/modes/calculate/result-document.ts';
  const baseline = {
    version: 1,
    bootstrapMilestone: 'CANONICAL-RESULT-V2-ENFORCEMENT1',
    reason: 'test fixture',
    frozenRouteIds,
    files: [{
      path: producerPath,
      sha256: sha256(files[producerPath]),
      routeIds: frozenRouteIds,
    }],
  };
  mkdirSync(path.dirname(path.join(root, ENFORCEMENT_BASELINE_PATH)), { recursive: true });
  writeFileSync(path.join(root, ENFORCEMENT_BASELINE_PATH), JSON.stringify(baseline, null, 2));
  return { root, baseline, producerPath };
}

test('accepts the committed frozen producer snapshot', () => {
  const { root, baseline } = fixtureRoot();
  const result = validateCurrentRepository(root, baseline);
  assert.deepEqual(result.errors, []);
});

test('rejects a frozen adapter edit even when the current baseline digest is rewritten', () => {
  const { root, baseline, producerPath } = fixtureRoot();
  const changed = 'buildCanonicalResultDocumentFromProducer({ changed: true });\n';
  writeFileSync(path.join(root, producerPath), changed);
  const rewritten = structuredClone(baseline);
  rewritten.files[0].sha256 = sha256(changed);
  const errors = compareEnforcementBaselines(rewritten, baseline, []);
  assert.match(errors.join('\n'), /digest changes are forbidden/u);
});

test('rejects baseline additions', () => {
  const { baseline } = fixtureRoot();
  const current = structuredClone(baseline);
  current.files.push({ path: 'src/lib/new.ts', sha256: 'a'.repeat(64), routeIds: [ROUTE] });
  assert.match(compareEnforcementBaselines(current, baseline, []).join('\n'), /additions are forbidden/u);
});

test('rejects premature removal and permits removal after all owned routes default to V2', () => {
  const { baseline } = fixtureRoot();
  const current = { ...structuredClone(baseline), files: [] };
  assert.match(compareEnforcementBaselines(current, baseline, []).join('\n'), /before all owned routes/u);
  assert.deepEqual(compareEnforcementBaselines(current, baseline, baseline.frozenRouteIds), []);
});

test('rejects new V1 builders and runtime outcomes while permitting a new V2-only producer', () => {
  const { root, baseline } = fixtureRoot();
  const newPath = path.join(root, 'src/lib/new-producer.ts');
  writeFileSync(newPath, 'buildCanonicalResultDocumentFromProducer({});\n');
  assert.match(validateCurrentRepository(root, baseline).errors.join('\n'), /Unfrozen production source/u);
  writeFileSync(newPath, 'export const outcome = { canonicalResult: { version: 1 } };\n');
  assert.match(validateCurrentRepository(root, baseline).errors.join('\n'), /Unfrozen production source/u);
  writeFileSync(newPath, 'buildCanonicalResultDocumentV2({});\n');
  assert.doesNotMatch(validateCurrentRepository(root, baseline).errors.join('\n'), /Unfrozen production source/u);
});

test('reads the immutable base baseline from a synthetic Git repository', () => {
  const { root, baseline } = fixtureRoot();
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'base'], { cwd: root, stdio: 'ignore' });
  const ref = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  assert.deepEqual(readBaselineAtGitRef(root, ref), baseline);
});

test('validates an immutable base baseline against its historical V2 defaults', () => {
  const { root, baseline } = fixtureRoot();
  const historical = structuredClone(baseline);
  historical.files[0].routeIds = historical.files[0].routeIds.filter((routeId) => routeId !== ROUTE);
  writeFileSync(
    path.join(root, ENFORCEMENT_BASELINE_PATH),
    JSON.stringify(historical, null, 2),
  );
  const registryPath = path.join(root, 'src/lib/result-contract/producer-version-registry.ts');
  writeFileSync(
    registryPath,
    readFileSync(registryPath, 'utf8').replace(
      'CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES = ([]);',
      `CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES = (['${ROUTE}']);`,
    ),
  );
  execFileSync('git', ['init'], { cwd: root, stdio: 'ignore' });
  execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: root });
  execFileSync('git', ['config', 'user.name', 'Test'], { cwd: root });
  execFileSync('git', ['add', '.'], { cwd: root });
  execFileSync('git', ['commit', '-m', 'base with migrated route'], { cwd: root, stdio: 'ignore' });
  const ref = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
  const basePolicy = readProducerVersionPolicyAtGitRef(root, ref);

  assert.deepEqual(basePolicy?.explicitV2DefaultRouteIds, [ROUTE]);
  assert.deepEqual(validateCurrentRepository(
    root,
    historical,
    readBaselineAtGitRef(root, ref),
    basePolicy?.explicitV2DefaultRouteIds,
  ).errors, []);
});
