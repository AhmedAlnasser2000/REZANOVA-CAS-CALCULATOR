import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const ENFORCEMENT_BASELINE_PATH = 'tools/canonical-result-v2-enforcement-baseline.json';
export const PRODUCER_VERSION_REGISTRY_PATH = 'src/lib/result-contract/producer-version-registry.ts';
export const MATHJSON_ROUTE_REGISTRY_PATH = 'src/lib/result-contract/mathjson-route-registry.ts';

const V1_PRODUCER_MARKERS = [
  'buildCanonicalResultDocumentFromProducer',
  'attachCanonicalResultToProducerDraft',
];

const PERMANENT_V1_BOUNDARY_PATHS = new Set([
  'src/lib/app-state/schemas.ts',
  'src/lib/app-state/tauri.ts',
  'src/lib/result-contract/normalized-result.ts',
  'src/lib/result-contract/producer.ts',
  'src/lib/result-contract/runtime-outcome-versioned.ts',
  'src/lib/result-contract/runtime-outcome.ts',
  'src/lib/result-contract/validation-router.ts',
  'src/lib/result-contract/validation.ts',
]);

const DIRECT_V1_RUNTIME_OUTCOME = /canonicalResult\s*:\s*\{\s*version\s*:\s*1\b/su;

function normalizePath(value) {
  return value.replaceAll('\\', '/').replace(/^\.\//u, '');
}

export function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

export function readEnforcementBaseline(root) {
  return JSON.parse(readFileSync(path.join(root, ENFORCEMENT_BASELINE_PATH), 'utf8'));
}

function exportedLiteralBlock(source, name) {
  const start = source.indexOf(`export const ${name}`);
  if (start < 0) throw new Error(`Missing export ${name}.`);
  const end = source.indexOf(');', start);
  if (end < 0) throw new Error(`Could not read export ${name}.`);
  return source.slice(start, end + 2);
}

function quotedValues(source) {
  return [...source.matchAll(/'([^']+)'/gu)].map((match) => match[1]);
}

function producerVersionPolicyFromSource(source) {
  const frozenRouteIds = quotedValues(exportedLiteralBlock(
    source,
    'FROZEN_V1_PRODUCER_ROUTE_IDS',
  ));
  const explicitV2DefaultRouteIds = quotedValues(exportedLiteralBlock(
    source,
    'CANONICAL_RESULT_V2_DEFAULT_PRODUCER_ROUTES',
  ));
  return {
    source,
    frozenRouteIds,
    explicitV2DefaultRouteIds,
  };
}

export function readProducerVersionPolicy(root) {
  const source = readFileSync(path.join(root, PRODUCER_VERSION_REGISTRY_PATH), 'utf8');
  return producerVersionPolicyFromSource(source);
}

export function readMathJsonRouteIds(root) {
  const source = readFileSync(path.join(root, MATHJSON_ROUTE_REGISTRY_PATH), 'utf8');
  const start = source.indexOf('export const MATHJSON_ROUTE_REGISTRY = {');
  const end = source.indexOf('} as const satisfies', start);
  if (start < 0 || end < 0) throw new Error('Could not read MATHJSON_ROUTE_REGISTRY.');
  return [...source.slice(start, end).matchAll(/^\s*'([^']+)':\s*route\(/gmu)]
    .map((match) => match[1]);
}

function listSourceFiles(directory) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory).flatMap((entry) => {
    const absolute = path.join(directory, entry);
    return statSync(absolute).isDirectory() ? listSourceFiles(absolute) : [absolute];
  });
}

function isProductionTypeScript(repoPath) {
  return /\.(?:ts|tsx)$/u.test(repoPath)
    && !/\.(?:test|spec|ui\.test)\.(?:ts|tsx)$/u.test(repoPath)
    && !repoPath.startsWith('src/test-utils/');
}

export function findUnfrozenV1ProducerPaths(root, baseline) {
  const frozenPaths = new Set(baseline.files.map((entry) => normalizePath(entry.path)));
  return listSourceFiles(path.join(root, 'src'))
    .map((absolute) => ({
      absolute,
      repoPath: normalizePath(path.relative(root, absolute)),
    }))
    .filter(({ repoPath }) => isProductionTypeScript(repoPath))
    .filter(({ repoPath }) => !frozenPaths.has(repoPath))
    .filter(({ repoPath }) => !PERMANENT_V1_BOUNDARY_PATHS.has(repoPath))
    .filter(({ absolute }) => {
      const source = readFileSync(absolute, 'utf8');
      return V1_PRODUCER_MARKERS.some((marker) => source.includes(marker))
        || DIRECT_V1_RUNTIME_OUTCOME.test(source);
    })
    .map(({ repoPath }) => repoPath)
    .sort();
}

function sameOrderedValues(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function validateBaselineShape(baseline, v2DefaultRouteIds = []) {
  const errors = [];
  if (baseline.version !== 1) errors.push('Enforcement baseline version must be 1.');
  if (baseline.bootstrapMilestone !== 'CANONICAL-RESULT-V2-ENFORCEMENT1') {
    errors.push('Enforcement baseline bootstrap milestone is invalid.');
  }
  if (!Array.isArray(baseline.frozenRouteIds) || baseline.frozenRouteIds.length !== 57) {
    errors.push('Frozen V1 route inventory must contain exactly 57 routes.');
  } else if (new Set(baseline.frozenRouteIds).size !== baseline.frozenRouteIds.length) {
    errors.push('Frozen V1 route inventory must not contain duplicates.');
  }
  if (!Array.isArray(baseline.files) || baseline.files.length === 0) {
    errors.push('Enforcement baseline must contain frozen producer files.');
    return errors;
  }
  const paths = new Set();
  const ownedRoutes = new Set();
  for (const entry of baseline.files) {
    const repoPath = normalizePath(entry.path ?? '');
    if (!repoPath.startsWith('src/lib/')) errors.push(`Invalid frozen producer path: ${repoPath}.`);
    if (paths.has(repoPath)) errors.push(`Duplicate frozen producer path: ${repoPath}.`);
    paths.add(repoPath);
    if (!/^[a-f0-9]{64}$/u.test(entry.sha256 ?? '')) {
      errors.push(`Invalid SHA-256 for ${repoPath}.`);
    }
    if (!Array.isArray(entry.routeIds) || entry.routeIds.length === 0) {
      errors.push(`Frozen producer ${repoPath} has no owned routes.`);
    } else if (new Set(entry.routeIds).size !== entry.routeIds.length) {
      errors.push(`Frozen producer ${repoPath} contains duplicate route ownership.`);
    } else {
      for (const routeId of entry.routeIds) {
        ownedRoutes.add(routeId);
        if (!baseline.frozenRouteIds.includes(routeId)) {
          errors.push(`Frozen producer ${repoPath} owns non-frozen route ${routeId}.`);
        }
      }
    }
  }
  const v2Defaults = new Set(v2DefaultRouteIds);
  for (const routeId of baseline.frozenRouteIds) {
    if (!ownedRoutes.has(routeId) && !v2Defaults.has(routeId)) {
      errors.push(`Frozen V1 route has no owning producer file: ${routeId}.`);
    }
  }
  return errors;
}

export function compareEnforcementBaselines(current, base, v2DefaultRouteIds) {
  const errors = [];
  if (!sameOrderedValues(current.frozenRouteIds, base.frozenRouteIds)) {
    errors.push('Frozen V1 route inventory changed; it is immutable.');
  }
  const currentFiles = new Map(current.files.map((entry) => [normalizePath(entry.path), entry]));
  const baseFiles = new Map(base.files.map((entry) => [normalizePath(entry.path), entry]));
  for (const [repoPath, entry] of currentFiles) {
    const previous = baseFiles.get(repoPath);
    if (!previous) {
      errors.push(`Frozen V1 producer additions are forbidden: ${repoPath}.`);
      continue;
    }
    if (entry.sha256 !== previous.sha256) {
      errors.push(`Frozen V1 producer digest changes are forbidden: ${repoPath}.`);
    }
    if (!sameOrderedValues(entry.routeIds, previous.routeIds)) {
      errors.push(`Frozen V1 producer route ownership changed: ${repoPath}.`);
    }
  }
  const defaults = new Set(v2DefaultRouteIds);
  for (const [repoPath, previous] of baseFiles) {
    if (currentFiles.has(repoPath)) continue;
    const remainingV1 = previous.routeIds.filter((routeId) => !defaults.has(routeId));
    if (remainingV1.length > 0) {
      errors.push(
        `Frozen V1 producer ${repoPath} was removed before all owned routes defaulted to V2: ${remainingV1.join(', ')}.`,
      );
    }
  }
  return errors;
}

export function validateCurrentRepository(
  root,
  baseline,
  baseBaseline,
  baseV2DefaultRouteIds = [],
) {
  const policy = readProducerVersionPolicy(root);
  const errors = [...validateBaselineShape(baseline, policy.explicitV2DefaultRouteIds)];
  const routeIds = readMathJsonRouteIds(root);
  if (!sameOrderedValues(policy.frozenRouteIds, baseline.frozenRouteIds)) {
    errors.push('Producer-version registry no longer matches the immutable 57-route V1 inventory.');
  }
  if (!policy.source.includes('|| !frozenV1Routes.has(routeId)')) {
    errors.push('New producer routes no longer default to V2.');
  }
  const routeIdSet = new Set(routeIds);
  for (const routeId of baseline.frozenRouteIds) {
    if (!routeIdSet.has(routeId)) errors.push(`Frozen route is missing from MathJSON registry: ${routeId}.`);
  }
  for (const entry of baseline.files) {
    const repoPath = normalizePath(entry.path);
    const absolute = path.join(root, repoPath);
    if (!existsSync(absolute)) {
      errors.push(`Frozen V1 producer file is missing: ${repoPath}.`);
      continue;
    }
    const actual = sha256(readFileSync(absolute));
    if (actual !== entry.sha256) {
      errors.push(`Frozen V1 producer changed and must fully migrate to V2: ${repoPath}.`);
    }
    for (const routeId of entry.routeIds) {
      if (!routeIdSet.has(routeId)) errors.push(`${repoPath} owns unknown route ${routeId}.`);
    }
  }
  const routeRegistrySource = readFileSync(path.join(root, MATHJSON_ROUTE_REGISTRY_PATH), 'utf8');
  if (!/MATHJSON_COVERAGE_EXEMPTIONS:\s*readonly never\[\]\s*=\s*\[\]/u.test(routeRegistrySource)) {
    errors.push('MathJSON coverage exemptions must remain an empty readonly never array.');
  }
  for (const repoPath of findUnfrozenV1ProducerPaths(root, baseline)) {
    errors.push(`Unfrozen production source uses a V1 producer builder: ${repoPath}.`);
  }
  if (baseBaseline) {
    errors.push(...validateBaselineShape(
      baseBaseline,
      baseV2DefaultRouteIds,
    ).map((error) => `Base baseline: ${error}`));
    errors.push(...compareEnforcementBaselines(
      baseline,
      baseBaseline,
      policy.explicitV2DefaultRouteIds,
    ));
  }
  return { ok: errors.length === 0, errors };
}

function readTextFileAtGitRef(root, ref, repoPath) {
  execFileSync(
    'git',
    ['cat-file', '-e', `${ref}^{commit}`],
    { cwd: root, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  try {
    const value = execFileSync(
      'git',
      ['show', `${ref}:${repoPath}`],
      { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
    );
    return value;
  } catch (error) {
    const stderr = String(error?.stderr ?? '');
    if (stderr.includes('does not exist in')) return undefined;
    if (stderr.includes('exists on disk, but not in')) return undefined;
    if (stderr.includes('path ')) return undefined;
    throw error;
  }
}

export function readBaselineAtGitRef(root, ref) {
  const value = readTextFileAtGitRef(root, ref, ENFORCEMENT_BASELINE_PATH);
  return value === undefined ? undefined : JSON.parse(value);
}

export function readProducerVersionPolicyAtGitRef(root, ref) {
  const source = readTextFileAtGitRef(root, ref, PRODUCER_VERSION_REGISTRY_PATH);
  return source === undefined ? undefined : producerVersionPolicyFromSource(source);
}

export function baseRefFromGitHubEvent(event) {
  return event?.pull_request?.base?.sha
    ?? (event?.before && !/^0+$/u.test(event.before) ? event.before : undefined);
}
