import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const TS_OOE_DIR = 'src/lib/ooe';
const RUST_OOE_DIR = 'src-tauri/src/ooe';

const TS_CORE_FILES = new Set([
  'active-job-registry.ts',
  'compartment-state.ts',
  'diagnostics-buffer.ts',
  'diagnostics-inspector.ts',
  'compartment-labels.ts',
  'event-outbox.ts',
  'host-adapter.ts',
  'job-contract.ts',
  'launch-tickets.ts',
  'ooe-bridge.ts',
  'panel-surface.ts',
  'runtime-coordinator.ts',
  'runtime-envelope.ts',
  'runtime-shell-contract.ts',
  'trace.ts',
]);

const TS_PILOT_FILES = new Set([
  'calculate-pilot.ts',
  'calculus-pilot.ts',
  'equation-pilot.ts',
  'expression-pilot.ts',
  'geometry-pilot.ts',
  'linear-algebra-pilot.ts',
  'provenance-summary.ts',
  'statistics-pilot.ts',
  'table-pilot.ts',
  'trigonometry-pilot.ts',
  'workspace-pilot.ts',
]);

const TS_FORBIDDEN_IMPORT_PATTERNS = [
  /^react$/u,
  /^react\//u,
  /^node:/u,
  /^fs$/u,
  /^path$/u,
  /^child_process$/u,
  /^vite$/u,
  /^vitest$/u,
];

const TS_FORBIDDEN_RESOLVED_SEGMENTS = [
  '/src/app/',
  '/src/components/',
  '/src/workspaces/',
  '/src/lib/labs/',
  '/src/lib/navigation/',
  '/src/lib/display/',
  '/src/lib/symbolic-engine/',
  '/src/lib/algebra/',
  '/playground/',
  '/tools/',
  '/.memory/',
];

const FORBIDDEN_TEXT_SNIPPETS = [
  '.memory',
  'playground/sources',
  'source-mirrors',
  'source mirrors',
  'labs-runner',
  'labs runner',
];

const TS_CORE_ALLOWED_EXTERNALS = new Set([
  '@tauri-apps/api/core',
  'zod',
]);

const TS_CORE_ALLOWED_TARGETS = new Set([
  'src/lib/compartments/manifest',
  'src/lib/compartments/ui-boundary-records',
]);

const TS_PILOT_ALLOWED_TARGETS = new Set([
  'src/lib/equation/equation-direct-symbolic-worker-client',
  'src/lib/equation/guarded-solve',
  'src/lib/equation/shared-solve',
  'src/lib/modes/table-core',
]);

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

function extractTsImports(text) {
  const imports = [];
  const patterns = [
    /import\s+(?:type\s+)?[\s\S]*?\s+from\s+['"]([^'"]+)['"]/gu,
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

function tsFileTier(repoPath) {
  const fileName = path.basename(repoPath);
  if (TS_CORE_FILES.has(fileName)) {
    return 'core';
  }
  if (TS_PILOT_FILES.has(fileName)) {
    return 'pilot';
  }
  throw new Error(`${repoPath} is not assigned to an OOE TypeScript boundary tier`);
}

function isSharedTypeTarget(resolvedTarget) {
  return resolvedTarget === 'src/types/calculator' || resolvedTarget.startsWith('src/types/calculator/');
}

function isLocalOoeTarget(resolvedTarget) {
  return resolvedTarget.startsWith(`${TS_OOE_DIR}/`);
}

function assertNoForbiddenText(repoPath, text) {
  const lowerText = text.toLowerCase();
  const found = FORBIDDEN_TEXT_SNIPPETS.filter((snippet) => lowerText.includes(snippet));
  if (found.length > 0) {
    throw new Error(`${repoPath} references forbidden OOE boundary text: ${found.join(', ')}`);
  }
}

function assertNoForbiddenTsImport(repoPath, specifier, resolvedTarget) {
  if (TS_FORBIDDEN_IMPORT_PATTERNS.some((pattern) => pattern.test(specifier))) {
    throw new Error(`${repoPath} imports forbidden OOE dependency "${specifier}"`);
  }

  if (!resolvedTarget) {
    return;
  }

  const wrapped = `/${resolvedTarget}`;
  const forbidden = TS_FORBIDDEN_RESOLVED_SEGMENTS.find((segment) => wrapped.includes(segment));
  if (forbidden) {
    throw new Error(`${repoPath} imports forbidden OOE boundary target "${specifier}"`);
  }
}

function assertAllowedTsCoreImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    if (!TS_CORE_ALLOWED_EXTERNALS.has(specifier)) {
      throw new Error(`${repoPath} imports unsupported OOE core dependency "${specifier}"`);
    }
    return;
  }

  if (
    !isLocalOoeTarget(resolvedTarget)
    && !isSharedTypeTarget(resolvedTarget)
    && !TS_CORE_ALLOWED_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${repoPath} imports unsupported OOE core target "${specifier}"`);
  }
}

function assertAllowedTsPilotImport(repoPath, specifier, resolvedTarget) {
  if (!resolvedTarget) {
    throw new Error(`${repoPath} imports unsupported OOE pilot dependency "${specifier}"`);
  }

  if (
    !isLocalOoeTarget(resolvedTarget)
    && !isSharedTypeTarget(resolvedTarget)
    && !TS_PILOT_ALLOWED_TARGETS.has(resolvedTarget)
  ) {
    throw new Error(`${repoPath} imports unsupported OOE pilot target "${specifier}"`);
  }
}

function assertTsOoeFile(rootDir, repoPath) {
  const text = readRepoFile(rootDir, repoPath);
  const tier = tsFileTier(repoPath);

  assertNoForbiddenText(repoPath, text);

  for (const specifier of extractTsImports(text)) {
    const resolvedTarget = resolveTsImport(repoPath, specifier);
    assertNoForbiddenTsImport(repoPath, specifier, resolvedTarget);

    if (tier === 'core') {
      assertAllowedTsCoreImport(repoPath, specifier, resolvedTarget);
    } else {
      assertAllowedTsPilotImport(repoPath, specifier, resolvedTarget);
    }
  }
}

function stripRustTests(text) {
  const testModuleIndex = text.indexOf('#[cfg(test)]');
  return testModuleIndex >= 0 ? text.slice(0, testModuleIndex) : text;
}

function extractRustUsePaths(text) {
  const paths = [];
  for (const match of text.matchAll(/^\s*use\s+([^;]+);/gmu)) {
    paths.push(match[1].trim());
  }
  return paths;
}

function assertRustOoeUse(repoPath, usePath) {
  if (
    usePath.startsWith('super::')
    || usePath.startsWith('serde::')
    || usePath.startsWith('std::')
  ) {
    return;
  }

  throw new Error(`${repoPath} imports unsupported Rust OOE dependency "${usePath}"`);
}

function assertRustOoeFile(rootDir, repoPath) {
  const text = readRepoFile(rootDir, repoPath);
  const productionText = stripRustTests(text);

  assertNoForbiddenText(repoPath, productionText);

  for (const usePath of extractRustUsePaths(productionText)) {
    assertRustOoeUse(repoPath, usePath);
  }
}

export function listProductionTsOoeFiles(rootDir = process.cwd()) {
  return walkFiles(
    path.join(rootDir, TS_OOE_DIR),
    (filePath) => filePath.endsWith('.ts') && !filePath.endsWith('.test.ts'),
    rootDir,
  ).sort();
}

export function listRustOoeFiles(rootDir = process.cwd()) {
  return walkFiles(
    path.join(rootDir, RUST_OOE_DIR),
    (filePath) => filePath.endsWith('.rs'),
    rootDir,
  ).sort();
}

export function validateOoeBoundaries(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const tsFiles = options.tsFiles ?? listProductionTsOoeFiles(rootDir);
  const rustFiles = options.rustFiles ?? listRustOoeFiles(rootDir);

  for (const repoPath of tsFiles) {
    assertTsOoeFile(rootDir, repoPath);
  }

  for (const repoPath of rustFiles) {
    assertRustOoeFile(rootDir, repoPath);
  }

  return {
    tsFiles: tsFiles.length,
    rustFiles: rustFiles.length,
  };
}
