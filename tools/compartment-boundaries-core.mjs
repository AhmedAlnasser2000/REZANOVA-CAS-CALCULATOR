import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateOoeBoundaries } from './ooe-boundaries-core.mjs';

const SOURCE_DIR = 'src';
const COMPARTMENT_MANIFEST_PATH = 'src/lib/compartments/manifest.ts';

const VALID_STATE_SURFACES = new Set(['ooe', 'static', 'future']);
const VALID_SURFACE_EXPOSURE_CANDIDATES = new Set([
  'none',
  'internal-diagnostics',
  'future-surface',
]);
const VALID_DEPENDENCY_POLICIES = new Set([
  'app-runtime-boundary',
  'app-surface-boundary',
  'display-no-ooe',
  'guide-labs-no-private-solvers',
  'library-no-app-ui',
  'no-source-mirrors',
  'private-solver-boundary',
  'shared-compute-isolated',
  'workspace-runtime-request-boundary',
]);

const SOURCE_MIRROR_TEXT_SNIPPETS = [
  'playground/sources',
  'source-mirrors',
  'source mirrors',
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

const APP_SURFACE_FILES = new Set([
  'src/App.tsx',
  'src/AppMain.tsx',
]);

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
  'src/lib/linear-algebra/editor-dispatch',
  'src/lib/linear-algebra/equation-handoff',
  'src/lib/linear-algebra/named-values',
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
  'src/lib/linear-algebra/editor-expression-format',
  'src/lib/linear-algebra/editor-parser',
  'src/lib/linear-algebra/exact-scalar',
  'src/lib/linear-algebra/matrix',
  'src/lib/linear-algebra/vector',
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

const APP_PERSISTENCE_FORBIDDEN_SURFACE_PREFIXES = [
  'src/app/shell/',
  'src/components/',
];

const APP_SURFACE_OOE_FORBIDDEN_PREFIXES = [
  'src/lib/ooe/runtime-control/',
  'src/lib/ooe/job-launch/',
  'src/lib/ooe/bridge-schema/',
  'src/lib/ooe/events/',
  'src/lib/ooe/diagnostics/',
];

const APP_SURFACE_ALLOWED_OOE_TARGETS_BY_IMPORTER = new Map([
  ['src/components/OoeDiagnosticsPanel.tsx', new Set([
    'src/lib/ooe/diagnostics/panel-surface',
  ])],
]);

const APP_SURFACE_ALLOWED_COMPARTMENT_TARGETS_BY_IMPORTER = new Map([
  ['src/app/shell/CompartmentErrorBoundary.tsx', new Set([
    'src/lib/compartments/ui-boundary',
  ])],
]);

const APP_SURFACE_FORBIDDEN_COMPARTMENT_PREFIXES = [
  'src/lib/compartments/ui-boundary-records',
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

function readCompartmentManifestSource(rootDir) {
  const rootManifest = path.join(rootDir, COMPARTMENT_MANIFEST_PATH);
  const fallbackManifest = path.join(process.cwd(), COMPARTMENT_MANIFEST_PATH);
  const manifestPath = existsSync(rootManifest) ? rootManifest : fallbackManifest;
  return readFileSync(manifestPath, 'utf8');
}

function parseStringProperty(body, propertyName) {
  const pattern = new RegExp(`${propertyName}: '([^']+)'`, 'u');
  return pattern.exec(body)?.[1];
}

function parseStringArrayProperty(body, propertyName) {
  const pattern = new RegExp(`${propertyName}: \\[([\\s\\S]*?)\\],`, 'u');
  const match = pattern.exec(body);
  if (!match) {
    return null;
  }
  return [...match[1].matchAll(/'([^']+)'/gu)].map((entry) => entry[1]);
}

function parseCompartmentManifest(rootDir) {
  const text = readCompartmentManifestSource(rootDir);
  const entries = [];
  const entryPattern = /\{\s*id: '([^']+)',([\s\S]*?)\n  \}/gu;

  for (const match of text.matchAll(entryPattern)) {
    const body = match[2];
    const label = parseStringProperty(body, 'label');
    const diagnosticsLabel = parseStringProperty(body, 'diagnosticsLabel');
    const stateSurface = parseStringProperty(body, 'stateSurface');
    const surfaceExposureCandidate = parseStringProperty(body, 'surfaceExposureCandidate');
    const ownedPaths = parseStringArrayProperty(body, 'ownedPaths');
    const publicSeams = parseStringArrayProperty(body, 'publicSeams');
    const privatePaths = parseStringArrayProperty(body, 'privatePaths');
    const dependencyPolicies = parseStringArrayProperty(body, 'dependencyPolicies');

    entries.push({
      id: match[1],
      label,
      diagnosticsLabel,
      stateSurface,
      surfaceExposureCandidate,
      ownedPaths,
      publicSeams,
      privatePaths,
      dependencyPolicies,
      hasOoeFacts: /\booeFacts:\s*\{/u.test(body),
    });
  }

  if (entries.length === 0) {
    throw new Error(`${COMPARTMENT_MANIFEST_PATH} declares no compartment manifest entries`);
  }

  return entries;
}

function validateCompartmentManifest(rootDir) {
  const manifestEntries = parseCompartmentManifest(rootDir);
  const manifestIds = manifestEntries.map((entry) => entry.id);

  for (const id of manifestIds) {
    if (manifestIds.indexOf(id) !== manifestIds.lastIndexOf(id)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} duplicates compartment id "${id}"`);
    }
  }

  for (const entry of manifestEntries) {
    for (const field of ['label', 'diagnosticsLabel', 'stateSurface', 'surfaceExposureCandidate']) {
      if (!entry[field]) {
        throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" is missing ${field}`);
      }
    }
    if (!VALID_STATE_SURFACES.has(entry.stateSurface)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" has unknown state surface "${entry.stateSurface}"`);
    }
    if (!VALID_SURFACE_EXPOSURE_CANDIDATES.has(entry.surfaceExposureCandidate)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" has unknown surface exposure candidate "${entry.surfaceExposureCandidate}"`);
    }
    for (const arrayField of ['ownedPaths', 'publicSeams', 'privatePaths', 'dependencyPolicies']) {
      if (!Array.isArray(entry[arrayField])) {
        throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" is missing ${arrayField}`);
      }
    }
    if (entry.ownedPaths.length === 0) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" has no owned paths`);
    }
    for (const policy of entry.dependencyPolicies) {
      if (!VALID_DEPENDENCY_POLICIES.has(policy)) {
        throw new Error(`${COMPARTMENT_MANIFEST_PATH} compartment "${entry.id}" declares unknown dependency policy "${policy}"`);
      }
    }
    if (entry.stateSurface === 'ooe' && !entry.hasOoeFacts) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} OOE-backed compartment "${entry.id}" has no OOE fact mapping`);
    }
  }

  return manifestEntries;
}

export function loadCompartmentManifestContract(rootDir = process.cwd()) {
  return validateCompartmentManifest(rootDir);
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

function pathMatchesTarget(repoPath, target) {
  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target;
}

function compartmentForPath(repoPath, manifestEntries) {
  let bestMatch;
  for (const entry of manifestEntries) {
    for (const target of entry.ownedPaths) {
      if (!pathMatchesTarget(repoPath, target)) {
        continue;
      }
      if (!bestMatch || target.length > bestMatch.target.length) {
        bestMatch = { entry, target };
      }
    }
  }
  return bestMatch?.entry;
}

function sourceLabel(repoPath, manifestEntries) {
  const compartment = compartmentForPath(repoPath, manifestEntries);
  return compartment ? `${repoPath} [${compartment.label}]` : repoPath;
}

function sourceHasPolicy(repoPath, manifestEntries, policy) {
  return Boolean(compartmentForPath(repoPath, manifestEntries)?.dependencyPolicies.includes(policy));
}

function manifestPathsForPolicy(manifestEntries, policy, field = 'ownedPaths') {
  return manifestEntries
    .filter((entry) => entry.dependencyPolicies.includes(policy))
    .flatMap((entry) => entry[field]);
}

function findMatchedTarget(resolvedTarget, targets) {
  return targets.find((target) => targetMatches(resolvedTarget, target));
}

function assertNoSourceMirrorReferences(repoPath, text, manifestEntries) {
  if (repoPath === COMPARTMENT_MANIFEST_PATH) {
    return;
  }
  const lowerText = text.toLowerCase();
  const found = SOURCE_MIRROR_TEXT_SNIPPETS.filter((snippet) => lowerText.includes(snippet));
  if (found.length > 0) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} references forbidden source-mirror text: ${found.join(', ')}`);
  }
}

function assertNoSourceMirrorImport(repoPath, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  if (resolvedTarget.startsWith('playground/sources/mirrors/')) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden source mirror target "${resolvedTarget}"`);
  }
}

function assertSharedComputeImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (SHARED_COMPUTE_FORBIDDEN_EXTERNAL_IMPORTS.some((pattern) => pattern.test(specifier))) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden shared-compute dependency "${specifier}"`);
  }

  if (!resolvedTarget) {
    return;
  }

  const forbidden = SHARED_COMPUTE_FORBIDDEN_TARGET_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden shared-compute target "${specifier}"`);
  }
}

function assertNoAppUiImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = LIBRARY_FORBIDDEN_APP_UI_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app UI target "${specifier}"`);
  }
}

function assertDisplayImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = DISPLAY_FORBIDDEN_TARGET_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbidden) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden Display boundary target "${specifier}"`);
  }
}

function assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  const forbidden = findMatchedTarget(
    resolvedTarget,
    manifestPathsForPolicy(manifestEntries, 'private-solver-boundary', 'privatePaths'),
  );
  if (forbidden) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports private solver district "${specifier}"`);
  }
}

function assertAppRuntimeImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  const forbiddenUi = APP_RUNTIME_FORBIDDEN_UI_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (forbiddenUi) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime UI target "${specifier}"`);
  }

  const forbiddenWorkerPrefix = APP_RUNTIME_FORBIDDEN_WORKER_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
  );
  if (
    forbiddenWorkerPrefix
    || APP_RUNTIME_FORBIDDEN_WORKER_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime worker target "${specifier}"`);
  }

  if (
    resolvedTarget.startsWith('src/lib/ooe/')
    && !APP_RUNTIME_ALLOWED_OOE_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime OOE target "${specifier}"`);
  }

  if (
    resolvedTarget.startsWith('src/lib/app-state/')
    && !APP_RUNTIME_ALLOWED_APP_STATE_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime app-state target "${specifier}"`);
  }

  const forbiddenVariableTarget = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_VARIABLE_TARGETS,
  );
  if (forbiddenVariableTarget) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime variable-memory target "${specifier}"`);
  }

  const forbiddenWorkspaceRequest = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_WORKSPACE_REQUEST_TARGETS,
  );
  if (forbiddenWorkspaceRequest) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime workspace request target "${specifier}"`);
  }

  const forbiddenWorkspaceInternal = findMatchedTarget(
    resolvedTarget,
    APP_RUNTIME_FORBIDDEN_WORKSPACE_INTERNAL_TARGETS,
  );
  if (forbiddenWorkspaceInternal) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-runtime workspace internal target "${specifier}"`);
  }

  assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
}

function isAppSurface(repoPath, manifestEntries) {
  return APP_SURFACE_FILES.has(repoPath)
    || sourceHasPolicy(repoPath, manifestEntries, 'app-surface-boundary');
}

function isAllowedTargetForImporter(allowedTargetsByImporter, repoPath, resolvedTarget) {
  return Boolean(allowedTargetsByImporter.get(repoPath)?.has(resolvedTarget));
}

function assertAppSurfaceImport(repoPath, specifier, resolvedTarget, manifestEntries) {
  if (!resolvedTarget) {
    return;
  }

  const forbiddenAppMainBootstrapTarget = repoPath === 'src/AppMain.tsx'
    ? findMatchedTarget(resolvedTarget, APPMAIN_FORBIDDEN_BOOTSTRAP_TARGETS)
    : null;
  if (forbiddenAppMainBootstrapTarget) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden AppMain bootstrap target "${specifier}"`);
  }

  if (
    startsWithAny(repoPath, APP_PERSISTENCE_FORBIDDEN_SURFACE_PREFIXES)
    && resolvedTarget.startsWith('src/lib/app-state/')
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-surface persistence target "${specifier}"`);
  }

  if (sourceHasPolicy(repoPath, manifestEntries, 'app-runtime-boundary')) {
    assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
    return;
  }

  const forbiddenOoeTarget = findMatchedTarget(
    resolvedTarget,
    APP_SURFACE_OOE_FORBIDDEN_PREFIXES,
  );
  if (
    forbiddenOoeTarget
    && !isAllowedTargetForImporter(
      APP_SURFACE_ALLOWED_OOE_TARGETS_BY_IMPORTER,
      repoPath,
      resolvedTarget,
    )
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-surface OOE target "${specifier}"`);
  }

  const forbiddenCompartmentTarget = findMatchedTarget(
    resolvedTarget,
    APP_SURFACE_FORBIDDEN_COMPARTMENT_PREFIXES,
  );
  if (
    forbiddenCompartmentTarget
    && !isAllowedTargetForImporter(
      APP_SURFACE_ALLOWED_COMPARTMENT_TARGETS_BY_IMPORTER,
      repoPath,
      resolvedTarget,
    )
  ) {
    throw new Error(`${sourceLabel(repoPath, manifestEntries)} imports forbidden app-surface compartment target "${specifier}"`);
  }

  assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
}

function assertCompartmentSourceFile(rootDir, repoPath, manifestEntries) {
  const text = readRepoFile(rootDir, repoPath);
  assertNoSourceMirrorReferences(repoPath, text, manifestEntries);

  for (const specifier of extractTsImports(text)) {
    const resolvedTarget = resolveTsImport(repoPath, specifier);
    assertNoSourceMirrorImport(repoPath, resolvedTarget, manifestEntries);

    if (sourceHasPolicy(repoPath, manifestEntries, 'shared-compute-isolated')) {
      assertSharedComputeImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (sourceHasPolicy(repoPath, manifestEntries, 'library-no-app-ui')) {
      assertNoAppUiImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (sourceHasPolicy(repoPath, manifestEntries, 'display-no-ooe')) {
      assertDisplayImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (sourceHasPolicy(repoPath, manifestEntries, 'guide-labs-no-private-solvers')) {
      assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (sourceHasPolicy(repoPath, manifestEntries, 'app-runtime-boundary')) {
      assertAppRuntimeImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (isAppSurface(repoPath, manifestEntries)) {
      assertAppSurfaceImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }
  }
}

export function validateCompartmentBoundaries(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const sourceFiles = options.sourceFiles ?? listProductionSourceFiles(rootDir);
  const manifestEntries = validateCompartmentManifest(rootDir);

  for (const repoPath of sourceFiles) {
    assertCompartmentSourceFile(rootDir, repoPath, manifestEntries);
  }

  const ooe = validateOoeBoundaries({ rootDir });

  return {
    sourceFiles: sourceFiles.length,
    ooe,
  };
}
