import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateOoeBoundaries } from './ooe-boundaries-core.mjs';

const SOURCE_DIR = 'src';

const SOURCE_MIRROR_TEXT_SNIPPETS = [
  'playground/sources',
  'source-mirrors',
  'source mirrors',
];

const SHARED_COMPUTE_PREFIXES = [
  'src/lib/algebra/',
  'src/lib/symbolic-engine/',
  'src/lib/engine/',
];

const SHARED_COMPUTE_FORBIDDEN_EXTERNAL_IMPORTS = [
  /^react$/u,
  /^react\//u,
];

const SHARED_COMPUTE_FORBIDDEN_TARGET_PREFIXES = [
  'src/app/',
  'src/components/',
  'src/styles/',
  'src/lib/app-state/',
  'src/lib/ooe/runtime-control/',
  'src/lib/ooe/diagnostics/',
  'src/lib/ooe/events/',
  'playground/',
];

const LIBRARY_NO_APP_UI_PREFIXES = [
  'src/lib/modes/',
  'src/lib/guide/',
  'src/lib/display/',
  'src/lib/navigation/',
  'src/lib/input/',
  'src/lib/kernel/',
  'src/lib/editor/',
  'src/lib/numeric/',
  'src/lib/virtual-keyboard/',
  'src/lib/trigonometry/',
  'src/lib/geometry/',
  'src/lib/statistics/',
  'src/lib/linear-algebra/',
  'src/lib/calculus/',
  'src/lib/equation/',
];

const LIBRARY_FORBIDDEN_APP_UI_PREFIXES = [
  'src/app/',
  'src/components/',
  'src/styles/',
];

const DISPLAY_FORBIDDEN_TARGET_PREFIXES = [
  'src/app/runtime/',
  'src/lib/ooe/runtime-control/',
  'src/lib/ooe/diagnostics/',
  'src/lib/ooe/events/',
];

const GUIDE_LABS_PREFIXES = [
  'src/lib/guide/',
  'src/lib/labs/',
];

const APP_SURFACE_PREFIXES = [
  'src/app/',
  'src/components/',
];

const APP_SURFACE_FILES = new Set([
  'src/App.tsx',
  'src/AppMain.tsx',
]);

const APP_RUNTIME_PREFIXES = [
  'src/app/runtime/',
  'src/app/logic/',
];

const APP_RUNTIME_FORBIDDEN_UI_PREFIXES = [
  'src/app/shell/',
  'src/app/workspaces/',
  'src/components/',
  'src/styles/',
];

const APP_RUNTIME_FORBIDDEN_WORKER_PREFIXES = [
  'src/lib/modes/worker-entrypoints/',
  'src/lib/modes/worker-clients/',
];

const APP_RUNTIME_FORBIDDEN_WORKER_TARGETS = new Set([
  'src/lib/modes/worker-clients/runtime-config',
]);

const APP_RUNTIME_ALLOWED_APP_STATE_TARGETS = new Set([
  'src/lib/app-state/persistence',
]);

const APP_RUNTIME_FORBIDDEN_VARIABLE_TARGETS = [
  'src/lib/algebra/variable-memory-store',
  'src/lib/algebra/variable-memory/',
];

const APP_RUNTIME_ALLOWED_OOE_TARGETS = new Set([
  'src/lib/ooe/job-launch/job-contract',
  'src/lib/ooe/job-launch/launch-tickets',
  'src/lib/ooe/job-launch/active-job-registry',
  'src/lib/ooe/pilots/workspace-pilot',
  'src/lib/ooe/pilots/provenance-summary',
]);

const APP_RUNTIME_FORBIDDEN_WORKSPACE_REQUEST_TARGETS = [
  'src/lib/trigonometry/parser',
  'src/lib/trigonometry/runtime-input',
  'src/lib/trigonometry/serializer',
  'src/lib/statistics/parser',
  'src/lib/statistics/runtime-input',
  'src/lib/statistics/shared',
  'src/lib/geometry/parser',
  'src/lib/geometry/runtime-input',
  'src/lib/geometry/serializer',
];

const APP_RUNTIME_FORBIDDEN_WORKSPACE_INTERNAL_TARGETS = [
  'src/lib/trigonometry/angles',
  'src/lib/trigonometry/core',
  'src/lib/trigonometry/equation-match',
  'src/lib/trigonometry/equations',
  'src/lib/trigonometry/functions',
  'src/lib/trigonometry/identities',
  'src/lib/trigonometry/normalize',
  'src/lib/trigonometry/period-phase',
  'src/lib/trigonometry/rewrite-solve',
  'src/lib/trigonometry/triangles',
  'src/lib/trigonometry/rewrite/',
  'src/lib/statistics/core',
  'src/lib/statistics/engine',
  'src/lib/statistics/inference',
  'src/lib/geometry/circles',
  'src/lib/geometry/core',
  'src/lib/geometry/coordinate',
  'src/lib/geometry/shapes',
  'src/lib/geometry/triangles',
  'src/lib/geometry/shared',
  'src/lib/geometry/solve-missing/',
];

const APP_FORBIDDEN_PRIVATE_SOLVER_PREFIXES = [
  'src/lib/equation/guarded/',
  'src/lib/equation/complex/',
  'src/lib/equation/composition/',
  'src/lib/equation/inequality/',
  'src/lib/equation/isolation/',
  'src/lib/equation/numeric-interval/',
  'src/lib/equation/parameterized/',
  'src/lib/equation/polynomial/',
  'src/lib/equation/candidate/',
  'src/lib/equation/target/',
  'src/lib/equation/direct-symbolic-worker/',
  'src/lib/algebra/absolute-value/',
  'src/lib/algebra/domain-range/',
  'src/lib/algebra/inequality/',
  'src/lib/algebra/polynomial-core/',
  'src/lib/algebra/polynomial-elimination/',
  'src/lib/algebra/polynomial-factor/',
  'src/lib/algebra/radical/',
  'src/lib/algebra/rational-function/',
  'src/lib/algebra/transform-core/',
  'src/lib/algebra/variable-core/',
  'src/lib/algebra/variable-memory/',
  'src/lib/symbolic-engine/integration/',
  'src/lib/symbolic-engine/limits/',
  'src/lib/symbolic-engine/mixed-factor/',
  'src/lib/symbolic-engine/patterns/',
  'src/lib/symbolic-engine/power-log/',
  'src/lib/symbolic-engine/radical/',
  'src/lib/symbolic-engine/rational/',
  'src/lib/engine/math-engine/',
  'src/lib/engine/semantic-planner/',
];

const APP_PERSISTENCE_FORBIDDEN_SURFACE_PREFIXES = [
  'src/app/shell/',
  'src/components/',
];

const APPMAIN_FORBIDDEN_BOOTSTRAP_TARGETS = [
  'src/lib/app-state/',
  'src/lib/algebra/variable-memory-store',
];

function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//u, '');
}

function withoutExtension(filePath) {
  return filePath.replace(/\.(?:ts|tsx|js|jsx|mjs|rs)$/u, '');
}

function walkFiles(rootDir, predicate, baseDir = rootDir) {
  if (!existsSync(rootDir)) {
    return [];
  }

  const files = [];
  for (const dirent of readdirSync(rootDir, { withFileTypes: true })) {
    const fullPath = path.join(rootDir, dirent.name);
    if (dirent.isDirectory()) {
      files.push(...walkFiles(fullPath, predicate, baseDir));
    } else if (predicate(fullPath)) {
      files.push(normalizeRepoPath(path.relative(baseDir, fullPath)));
    }
  }

  return files;
}

function readRepoFile(rootDir, repoPath) {
  return readFileSync(path.join(rootDir, repoPath), 'utf8');
}

function isProductionSourceFile(filePath) {
  if (!/\.(?:ts|tsx)$/u.test(filePath)) {
    return false;
  }
  return !/(?:^|\.)(?:test|ui\.test)\.tsx?$/u.test(filePath);
}

export function listProductionSourceFiles(rootDir = process.cwd()) {
  return walkFiles(
    path.join(rootDir, SOURCE_DIR),
    isProductionSourceFile,
    rootDir,
  ).sort();
}

function extractTsImports(text) {
  const imports = [];
  const patterns = [
    /import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gu,
    /export\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gu,
    /import\s+['"]([^'"]+)['"]/gu,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/gu,
  ];

  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      imports.push(match[1]);
    }
  }

  return imports;
}

function resolveTsImport(repoPath, specifier) {
  if (!specifier.startsWith('.')) {
    return null;
  }

  return withoutExtension(normalizeRepoPath(path.join(path.dirname(repoPath), specifier)));
}

function startsWithAny(repoPath, prefixes) {
  return prefixes.some((prefix) => repoPath.startsWith(prefix));
}

function targetMatches(resolvedTarget, target) {
  if (target.endsWith('/')) {
    return resolvedTarget.startsWith(target);
  }

  return resolvedTarget === target || resolvedTarget.startsWith(`${target}/`);
}

function findMatchedTarget(resolvedTarget, targets) {
  return targets.find((target) => targetMatches(resolvedTarget, target));
}

function assertNoSourceMirrorReferences(repoPath, text) {
  const lowerText = text.toLowerCase();
  const found = SOURCE_MIRROR_TEXT_SNIPPETS.filter((snippet) => lowerText.includes(snippet));
  if (found.length > 0) {
    throw new Error(`${repoPath} references forbidden source-mirror text: ${found.join(', ')}`);
  }
}

function assertNoSourceMirrorImport(repoPath, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  if (resolvedTarget.startsWith('playground/sources/mirrors/')) {
    throw new Error(`${repoPath} imports forbidden source mirror target "${resolvedTarget}"`);
  }
}

function assertSharedComputeImport(repoPath, specifier, resolvedTarget) {
  if (SHARED_COMPUTE_FORBIDDEN_EXTERNAL_IMPORTS.some((pattern) => pattern.test(specifier))) {
    throw new Error(`${repoPath} imports forbidden shared-compute dependency "${specifier}"`);
  }

  if (!resolvedTarget) {
    return;
  }

  const forbidden = SHARED_COMPUTE_FORBIDDEN_TARGET_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${repoPath} imports forbidden shared-compute target "${specifier}"`);
  }
}

function assertNoAppUiImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = LIBRARY_FORBIDDEN_APP_UI_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${repoPath} imports forbidden app UI target "${specifier}"`);
  }
}

function assertDisplayImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = DISPLAY_FORBIDDEN_TARGET_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${repoPath} imports forbidden Display boundary target "${specifier}"`);
  }
}

function assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = APP_FORBIDDEN_PRIVATE_SOLVER_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${repoPath} imports private solver district "${specifier}"`);
  }
}

function assertAppRuntimeImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  const forbiddenUi = APP_RUNTIME_FORBIDDEN_UI_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbiddenUi) {
    throw new Error(`${repoPath} imports forbidden app-runtime UI target "${specifier}"`);
  }

  const forbiddenWorkerPrefix = APP_RUNTIME_FORBIDDEN_WORKER_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (
    forbiddenWorkerPrefix
    || APP_RUNTIME_FORBIDDEN_WORKER_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${repoPath} imports forbidden app-runtime worker target "${specifier}"`);
  }

  if (
    resolvedTarget.startsWith('src/lib/ooe/')
    && !APP_RUNTIME_ALLOWED_OOE_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${repoPath} imports forbidden app-runtime OOE target "${specifier}"`);
  }

  if (
    resolvedTarget.startsWith('src/lib/app-state/')
    && !APP_RUNTIME_ALLOWED_APP_STATE_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${repoPath} imports forbidden app-runtime app-state target "${specifier}"`);
  }

  const forbiddenVariableTarget = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_VARIABLE_TARGETS,
  );
  if (forbiddenVariableTarget) {
    throw new Error(`${repoPath} imports forbidden app-runtime variable-memory target "${specifier}"`);
  }

  const forbiddenWorkspaceRequest = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_WORKSPACE_REQUEST_TARGETS,
  );
  if (forbiddenWorkspaceRequest) {
    throw new Error(`${repoPath} imports forbidden app-runtime workspace request target "${specifier}"`);
  }

  const forbiddenWorkspaceInternal = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_WORKSPACE_INTERNAL_TARGETS,
  );
  if (forbiddenWorkspaceInternal) {
    throw new Error(`${repoPath} imports forbidden app-runtime workspace internal target "${specifier}"`);
  }

  assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget);
}

function isAppSurface(repoPath) {
  return APP_SURFACE_FILES.has(repoPath) || startsWithAny(repoPath, APP_SURFACE_PREFIXES);
}

function assertAppSurfaceImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    return;
  }

  const forbiddenAppMainBootstrapTarget = repoPath === 'src/AppMain.tsx'
    ? findMatchedTarget(resolvedTarget, APPMAIN_FORBIDDEN_BOOTSTRAP_TARGETS)
    : null;
  if (forbiddenAppMainBootstrapTarget) {
    throw new Error(`${repoPath} imports forbidden AppMain bootstrap target "${specifier}"`);
  }

  if (
    startsWithAny(repoPath, APP_PERSISTENCE_FORBIDDEN_SURFACE_PREFIXES)
    && resolvedTarget.startsWith('src/lib/app-state/')
  ) {
    throw new Error(`${repoPath} imports forbidden app-surface persistence target "${specifier}"`);
  }

  assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget);
}

function assertCompartmentSourceFile(rootDir, repoPath) {
  const text = readRepoFile(rootDir, repoPath);
  assertNoSourceMirrorReferences(repoPath, text);

  for (const specifier of extractTsImports(text)) {
    const resolvedTarget = resolveTsImport(repoPath, specifier);
    assertNoSourceMirrorImport(repoPath, resolvedTarget);

    if (startsWithAny(repoPath, SHARED_COMPUTE_PREFIXES)) {
      assertSharedComputeImport(repoPath, specifier, resolvedTarget);
    }

    if (startsWithAny(repoPath, LIBRARY_NO_APP_UI_PREFIXES)) {
      assertNoAppUiImport(repoPath, specifier, resolvedTarget);
    }

    if (repoPath.startsWith('src/lib/display/')) {
      assertDisplayImport(repoPath, specifier, resolvedTarget);
    }

    if (startsWithAny(repoPath, GUIDE_LABS_PREFIXES)) {
      assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget);
    }

    if (startsWithAny(repoPath, APP_RUNTIME_PREFIXES)) {
      assertAppRuntimeImport(repoPath, specifier, resolvedTarget);
    }

    if (isAppSurface(repoPath)) {
      assertAppSurfaceImport(repoPath, specifier, resolvedTarget);
    }
  }
}

export function validateCompartmentBoundaries(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const sourceFiles = options.sourceFiles ?? listProductionSourceFiles(rootDir);

  for (const repoPath of sourceFiles) {
    assertCompartmentSourceFile(rootDir, repoPath);
  }

  const ooe = validateOoeBoundaries({ rootDir });

  return {
    sourceFiles: sourceFiles.length,
    ooe,
  };
}
