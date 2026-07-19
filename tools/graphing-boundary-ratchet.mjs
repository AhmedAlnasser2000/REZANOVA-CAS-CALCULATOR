import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const GRAPH_ROOT = 'src/lib/graphing';
const PUBLIC_CONTRACT_ROOT = `${GRAPH_ROOT}/contracts`;
const THREE_ROOT = `${GRAPH_ROOT}/renderers/three`;
const OOE_ROOT = `${GRAPH_ROOT}/ooe`;
const STRUCTURED_RUNTIME_ROOTS = [
  `${GRAPH_ROOT}/evaluator/`,
  `${GRAPH_ROOT}/headless/`,
  `${GRAPH_ROOT}/sampling/`,
  `${GRAPH_ROOT}/scene/`,
];
const STRUCTURED_CLASSIFIER_FILES = new Set([
  `${GRAPH_ROOT}/parser/classifier.ts`,
  `${GRAPH_ROOT}/parser/conditions.ts`,
]);
const FORBIDDEN_SOLVER_ROOTS = [
  'src/lib/calculus/',
  'src/lib/equation/',
  'src/lib/geometry/',
  'src/lib/linear-algebra/',
  'src/lib/modes/',
  'src/lib/statistics/',
  'src/lib/symbolic-engine/',
  'src/lib/trigonometry/',
];

function normalize(value) {
  return value.split(path.sep).join('/');
}

function sourceFiles(rootDir, repoPath = GRAPH_ROOT) {
  const absolute = path.join(rootDir, repoPath);
  if (!existsSync(absolute)) return [];
  const output = [];
  for (const entry of readdirSync(absolute)) {
    const child = `${repoPath}/${entry}`;
    const childAbsolute = path.join(rootDir, child);
    if (statSync(childAbsolute).isDirectory()) output.push(...sourceFiles(rootDir, child));
    else if (/\.tsx?$/u.test(entry) && !/\.(?:test|spec)\.tsx?$/u.test(entry)) output.push(child);
  }
  return output;
}

function importsFrom(text) {
  const imports = [];
  const pattern = /(?:from\s*|import\s*\(|require\s*\()\s*['"]([^'"]+)['"]/gu;
  for (const match of text.matchAll(pattern)) imports.push(match[1]);
  return imports;
}

function resolveImport(repoPath, specifier) {
  if (!specifier.startsWith('.')) return specifier;
  return normalize(path.normalize(path.join(path.dirname(repoPath), specifier)));
}

export function validateGraphingBoundaries({ rootDir = process.cwd(), files } = {}) {
  const graphFiles = files ?? sourceFiles(rootDir);
  const failures = [];

  for (const repoPath of graphFiles) {
    const text = readFileSync(path.join(rootDir, repoPath), 'utf8');
    if (/\bexactLatex\b/u.test(text)) {
      failures.push(`${repoPath} declares forbidden exactLatex authority.`);
    }
    if (STRUCTURED_CLASSIFIER_FILES.has(repoPath) && /\bsourceLatex\b/u.test(text)) {
      failures.push(`${repoPath} reads authored LaTeX inside the structured classifier.`);
    }
    if (STRUCTURED_RUNTIME_ROOTS.some((root) => repoPath.startsWith(root))
      && /\bsourceLatex\b/u.test(text)) {
      failures.push(`${repoPath} reads authored LaTeX after GraphRelationIR classification.`);
    }
    for (const specifier of importsFrom(text)) {
      const resolved = resolveImport(repoPath, specifier);
      if (STRUCTURED_RUNTIME_ROOTS.some((root) => repoPath.startsWith(root))
        && (specifier === 'mathlive' || specifier === '@cortex-js/compute-engine')) {
        failures.push(`${repoPath} reparses authoring source after GraphRelationIR classification.`);
      }
      if ((specifier === 'three' || specifier.startsWith('three/')) && !repoPath.startsWith(`${THREE_ROOT}/`)) {
        failures.push(`${repoPath} imports Three.js outside ${THREE_ROOT}/.`);
      }
      if (resolved.startsWith('src/App')
        || resolved.startsWith('src/app/') || resolved.startsWith('src/components/')
        || resolved.startsWith('src/styles/')) {
        failures.push(`${repoPath} imports app UI state from ${specifier}.`);
      }
      if (FORBIDDEN_SOLVER_ROOTS.some((root) => resolved.startsWith(root))) {
        failures.push(`${repoPath} imports private solver ownership from ${specifier}.`);
      }
      if (resolved.startsWith('src/lib/ooe/') && !repoPath.startsWith(`${OOE_ROOT}/`)) {
        failures.push(`${repoPath} imports OOE outside the Graph-owned OOE district.`);
      }
      if (repoPath.startsWith(`${PUBLIC_CONTRACT_ROOT}/`)
        && (specifier === 'react' || specifier === 'mathlive' || specifier === 'three'
          || resolved.startsWith(`${GRAPH_ROOT}/renderers/`)
          || resolved.startsWith('src/lib/ooe/'))) {
        failures.push(`${repoPath} leaks runtime or renderer ownership into public contracts via ${specifier}.`);
      }
    }
  }

  if (failures.length > 0) throw new Error(`Graphing boundary validation failed:\n- ${failures.join('\n- ')}`);
  return { graphFiles: graphFiles.length, failures: 0 };
}

const isDirectRun = process.argv[1]
  && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);

if (isDirectRun) {
  const result = validateGraphingBoundaries();
  console.log(`Graphing boundary validation passed for ${result.graphFiles} production files.`);
}
