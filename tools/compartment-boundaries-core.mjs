import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { validateOoeBoundaries } from './ooe-boundaries-core.mjs';

const SOURCE_DIR = 'src';
const COMPARTMENT_MANIFEST_PATH = 'src/lib/compartments/manifest.ts';

const EXPECTED_COMPARTMENT_IDS = [
  'app-shell',
  'app-runtime',
  'app-state-history-variables',
  'ooe',
  'display',
  'calculate',
  'equation',
  'calculus',
  'trigonometry',
  'statistics',
  'geometry',
  'linear-algebra',
  'table',
  'algebra',
  'symbolic-engine',
  'engine',
  'guide',
  'navigation-input-kernel',
  'labs',
  'playground',
  'reference-mirrors',
];

const COMPARTMENT_PATH_MAPPINGS = [
  {
    id: 'app-shell',
    targets: [
      'src/App.tsx',
      'src/AppMain.tsx',
      'src/App.css',
      'src/app/shell/',
      'src/app/workspaces/',
      'src/components/',
      'src/styles/app/',
    ],
  },
  {
    id: 'app-runtime',
    targets: [
      'src/app/runtime/',
      'src/app/logic/',
    ],
  },
  {
    id: 'app-state-history-variables',
    targets: [
      'src/lib/app-state/',
      'src/lib/algebra/variable-memory.ts',
      'src/lib/algebra/variable-memory/',
      'src/lib/algebra/variable-memory-store.ts',
      'src/lib/algebra/variable-hints.ts',
      'src/lib/algebra/named-variable.ts',
    ],
  },
  {
    id: 'ooe',
    targets: [
      'src/lib/ooe/',
      'src-tauri/src/ooe/',
    ],
  },
  {
    id: 'display',
    targets: [
      'src/lib/display/',
    ],
  },
  {
    id: 'calculate',
    targets: [
      'src/lib/modes/calculate.ts',
      'src/lib/modes/calculate/',
    ],
  },
  {
    id: 'equation',
    targets: [
      'src/lib/equation/',
      'src/lib/modes/equation.ts',
      'src/lib/modes/equation/',
    ],
  },
  {
    id: 'calculus',
    targets: [
      'src/lib/calculus/',
      'src/lib/modes/calculus.ts',
    ],
  },
  {
    id: 'trigonometry',
    targets: [
      'src/lib/trigonometry/',
      'src/lib/modes/trigonometry.ts',
    ],
  },
  {
    id: 'statistics',
    targets: [
      'src/lib/statistics/',
      'src/lib/modes/statistics.ts',
    ],
  },
  {
    id: 'geometry',
    targets: [
      'src/lib/geometry/',
      'src/lib/modes/geometry.ts',
    ],
  },
  {
    id: 'linear-algebra',
    targets: [
      'src/lib/linear-algebra/',
      'src/lib/modes/matrix.ts',
      'src/lib/modes/vector.ts',
    ],
  },
  {
    id: 'table',
    targets: [
      'src/lib/modes/table.ts',
      'src/lib/modes/table-core.ts',
    ],
  },
  {
    id: 'algebra',
    targets: [
      'src/lib/algebra/',
    ],
  },
  {
    id: 'symbolic-engine',
    targets: [
      'src/lib/symbolic-engine/',
    ],
  },
  {
    id: 'engine',
    targets: [
      'src/lib/engine/',
    ],
  },
  {
    id: 'guide',
    targets: [
      'src/lib/guide/',
    ],
  },
  {
    id: 'navigation-input-kernel',
    targets: [
      'src/lib/navigation/',
      'src/lib/input/',
      'src/lib/kernel/',
      'src/lib/editor/',
      'src/lib/numeric/',
      'src/lib/virtual-keyboard/',
    ],
  },
  {
    id: 'labs',
    targets: [
      'src/lib/labs/',
    ],
  },
  {
    id: 'playground',
    targets: [
      'playground/',
    ],
  },
  {
    id: 'reference-mirrors',
    targets: [
      'playground/sources/mirrors/',
    ],
  },
];

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

function readCompartmentManifestSource(rootDir) {
  const rootManifest = path.join(rootDir, COMPARTMENT_MANIFEST_PATH);
  const fallbackManifest = path.join(process.cwd(), COMPARTMENT_MANIFEST_PATH);
  const manifestPath = existsSync(rootManifest) ? rootManifest : fallbackManifest;
  return readFileSync(manifestPath, 'utf8');
}

function parseCompartmentManifest(rootDir) {
  const text = readCompartmentManifestSource(rootDir);
  const entries = [];
  const entryPattern =
    /\{\s*id: '([^']+)',\s*label: '([^']+)',\s*diagnosticsLabel: '([^']+)',\s*stateSurface: '([^']+)',([\s\S]*?)\n  \}/gu;

  for (const match of text.matchAll(entryPattern)) {
    entries.push({
      id: match[1],
      label: match[2],
      diagnosticsLabel: match[3],
      stateSurface: match[4],
      hasOoeFacts: /\booeFacts:\s*\{/u.test(match[5]),
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
  const manifestIdSet = new Set(manifestIds);

  for (const id of manifestIds) {
    if (manifestIds.indexOf(id) !== manifestIds.lastIndexOf(id)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} duplicates compartment id "${id}"`);
    }
  }

  for (const expectedId of EXPECTED_COMPARTMENT_IDS) {
    if (!manifestIdSet.has(expectedId)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} is missing stable compartment id "${expectedId}"`);
    }
  }

  for (const entry of manifestEntries) {
    if (!EXPECTED_COMPARTMENT_IDS.includes(entry.id)) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} declares unknown compartment id "${entry.id}"`);
    }
    if (entry.stateSurface === 'ooe' && !entry.hasOoeFacts) {
      throw new Error(`${COMPARTMENT_MANIFEST_PATH} OOE-backed compartment "${entry.id}" has no OOE fact mapping`);
    }
  }

  const mappedIds = new Set(COMPARTMENT_PATH_MAPPINGS.map((mapping) => mapping.id));
  for (const expectedId of EXPECTED_COMPARTMENT_IDS) {
    if (!mappedIds.has(expectedId)) {
      throw new Error(`compartment path mapping is missing stable compartment id "${expectedId}"`);
    }
  }
  for (const mappedId of mappedIds) {
    if (!manifestIdSet.has(mappedId)) {
      throw new Error(`compartment path mapping invents unknown compartment id "${mappedId}"`);
    }
  }

  return manifestEntries;
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
  const mapping = COMPARTMENT_PATH_MAPPINGS.find((candidate) =>
    candidate.targets.some((target) => pathMatchesTarget(repoPath, target)));
  if (!mapping) {
    return undefined;
  }
  return manifestEntries.find((entry) => entry.id === mapping.id);
}

function sourceLabel(repoPath, manifestEntries) {
  const compartment = compartmentForPath(repoPath, manifestEntries);
  return compartment ? `${repoPath} [${compartment.label}]` : repoPath;
}

function findMatchedTarget(resolvedTarget, targets) {
  return targets.find((target) => targetMatches(resolvedTarget, target));
}

function assertNoSourceMirrorReferences(repoPath, text, manifestEntries) {
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

  const forbidden = APP_FORBIDDEN_PRIVATE_SOLVER_PREFIXES.find(
    (prefix) => resolvedTarget.startsWith(prefix),
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

function isAppSurface(repoPath) {
  return APP_SURFACE_FILES.has(repoPath) || startsWithAny(repoPath, APP_SURFACE_PREFIXES);
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

  assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
}

function assertCompartmentSourceFile(rootDir, repoPath, manifestEntries) {
  const text = readRepoFile(rootDir, repoPath);
  assertNoSourceMirrorReferences(repoPath, text, manifestEntries);

  for (const specifier of extractTsImports(text)) {
    const resolvedTarget = resolveTsImport(repoPath, specifier);
    assertNoSourceMirrorImport(repoPath, resolvedTarget, manifestEntries);

    if (startsWithAny(repoPath, SHARED_COMPUTE_PREFIXES)) {
      assertSharedComputeImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (startsWithAny(repoPath, LIBRARY_NO_APP_UI_PREFIXES)) {
      assertNoAppUiImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (repoPath.startsWith('src/lib/display/')) {
      assertDisplayImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (startsWithAny(repoPath, GUIDE_LABS_PREFIXES)) {
      assertNoPrivateSolverDistrictImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (startsWithAny(repoPath, APP_RUNTIME_PREFIXES)) {
      assertAppRuntimeImport(repoPath, specifier, resolvedTarget, manifestEntries);
    }

    if (isAppSurface(repoPath)) {
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
