import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_MAX_LINES = 900;
export const BASELINE_REPO_PATH = 'tools/file-size-baseline.json';

const SCAN_ROOT = 'src';
const SCAN_EXTENSIONS = /\.(?:ts|tsx)$/u;

const EXCLUDED_PATH_SEGMENTS = [
  'src/lib/__golden__/',
];

const EXCLUDED_FILES = new Set([
  'src/lib/labs/generated-catalog.ts',
]);

function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/g, '/').replace(/^\.\//u, '');
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

function isExcluded(repoPath) {
  if (EXCLUDED_FILES.has(repoPath)) {
    return true;
  }

  return EXCLUDED_PATH_SEGMENTS.some((segment) => repoPath.includes(segment));
}

export function listSourceFiles(rootDir = process.cwd()) {
  return walkFiles(
    path.join(rootDir, SCAN_ROOT),
    (filePath) => SCAN_EXTENSIONS.test(filePath),
    rootDir,
  )
    .filter((repoPath) => !isExcluded(repoPath))
    .sort();
}

export function countFileLines(rootDir, repoPath) {
  const text = readFileSync(path.join(rootDir, repoPath), 'utf8');
  if (text.length === 0) {
    return 0;
  }

  const lines = text.split('\n').length;
  return text.endsWith('\n') ? lines - 1 : lines;
}

export function loadBaseline(rootDir = process.cwd()) {
  const baselinePath = path.join(rootDir, BASELINE_REPO_PATH);
  if (!existsSync(baselinePath)) {
    return {};
  }

  const parsed = JSON.parse(readFileSync(baselinePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${BASELINE_REPO_PATH} must contain a JSON object of repo paths to line caps`);
  }

  for (const [repoPath, cap] of Object.entries(parsed)) {
    if (!Number.isInteger(cap) || cap <= DEFAULT_MAX_LINES) {
      throw new Error(
        `${BASELINE_REPO_PATH} entry "${repoPath}" must be an integer above the default cap of ${DEFAULT_MAX_LINES}`,
      );
    }
  }

  return parsed;
}

export function baselineCapForLines(lines) {
  return lines;
}

export function validateFileSizes(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const baseline = options.baseline ?? loadBaseline(rootDir);
  const files = listSourceFiles(rootDir);
  const fileSet = new Set(files);
  const errors = [];

  for (const repoPath of Object.keys(baseline)) {
    if (!fileSet.has(repoPath)) {
      errors.push(
        `${BASELINE_REPO_PATH} lists "${repoPath}" but that file does not exist; remove the stale entry`,
      );
    }
  }

  for (const repoPath of files) {
    const lines = countFileLines(rootDir, repoPath);
    const cap = baseline[repoPath] ?? DEFAULT_MAX_LINES;
    if (lines > cap) {
      errors.push(
        `${repoPath} has ${lines} lines, exceeding its cap of ${cap}; `
        + 'extract a module instead of appending (see .memory/research/roadmaps/appmain-slim-roadmap.md). '
        + `Raising a cap requires a deliberate, reviewed edit to ${BASELINE_REPO_PATH}.`,
      );
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return {
    files: files.length,
    baselineEntries: Object.keys(baseline).length,
  };
}

export function buildBaseline(rootDir = process.cwd()) {
  const baseline = {};
  for (const repoPath of listSourceFiles(rootDir)) {
    const lines = countFileLines(rootDir, repoPath);
    if (lines > DEFAULT_MAX_LINES) {
      baseline[repoPath] = baselineCapForLines(lines);
    }
  }

  return baseline;
}

export function updateBaseline(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const previous = options.baseline ?? loadBaseline(rootDir);
  const fileSet = new Set(listSourceFiles(rootDir));
  const next = {};
  let lowered = 0;
  let removed = 0;

  for (const [repoPath, previousCap] of Object.entries(previous)) {
    if (!fileSet.has(repoPath)) {
      removed += 1;
      continue;
    }

    const lines = countFileLines(rootDir, repoPath);
    if (lines <= DEFAULT_MAX_LINES) {
      removed += 1;
      continue;
    }

    const candidate = baselineCapForLines(lines);
    const nextCap = Math.min(previousCap, candidate);
    if (nextCap < previousCap) {
      lowered += 1;
    }

    next[repoPath] = nextCap;
  }

  if (options.write !== false) {
    writeBaseline(rootDir, next);
  }

  return { baseline: next, lowered, removed };
}

export function writeBaseline(rootDir, baseline) {
  const sorted = Object.fromEntries(
    Object.entries(baseline).sort(([a], [b]) => a.localeCompare(b)),
  );
  writeFileSync(
    path.join(rootDir, BASELINE_REPO_PATH),
    `${JSON.stringify(sorted, null, 2)}\n`,
  );
}
