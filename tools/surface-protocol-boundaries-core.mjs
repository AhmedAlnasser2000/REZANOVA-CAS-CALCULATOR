import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SURFACE_PROTOCOL_DIR = 'src/lib/surface-protocol';

const IMPORT_SPECIFIER_RE =
  /\bimport\s+(?:type\s+)?(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]|\bexport\s+(?:type\s+)?[^'"]*?\s+from\s+['"]([^'"]+)['"]/g;

const FORBIDDEN_TEXT_PATTERNS = [
  { pattern: /\bReact\b|['"]react['"]/u, reason: 'React must not cross the Surface boundary' },
  { pattern: /\bHTMLElement\b|\bDocument\b|\bWindow\b|\blocalStorage\b|\bsessionStorage\b/u, reason: 'DOM objects must not cross the Surface boundary' },
  { pattern: /DisplayBlock|DisplayDetailSection/u, reason: 'Display block trees must not cross the Surface boundary' },
  { pattern: /MathJSON|MathJson/u, reason: 'MathJSON trees must not cross the Surface boundary' },
  { pattern: /app-state|schemas\.ts|HistoryEntry|VariableMemory/u, reason: 'app-state schemas must not cross the Surface boundary' },
  { pattern: /\/home\/|[A-Za-z]:\\/u, reason: 'local filesystem paths must not cross the Surface boundary' },
  { pattern: /\bhostCommand\b|\bhostCommands\b|\brunHostCommand\b|\brunCommand\b/u, reason: 'host commands must not cross the Surface boundary' },
];

function toRepoPath(rootDir, fullPath) {
  return path.relative(rootDir, fullPath).split(path.sep).join('/');
}

function listProductionSurfaceFiles(rootDir) {
  const surfaceDir = path.join(rootDir, SURFACE_PROTOCOL_DIR);
  if (!existsSync(surfaceDir)) {
    return [];
  }

  const files = [];
  const visit = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        visit(fullPath);
        continue;
      }
      if (!entry.isFile() || !entry.name.endsWith('.ts') || entry.name.endsWith('.test.ts')) {
        continue;
      }
      files.push(fullPath);
    }
  };
  visit(surfaceDir);
  return files.sort();
}

function isAllowedRelativeImport(repoPath, specifier) {
  if (specifier.startsWith('./')) {
    const normalized = path.posix.normalize(path.posix.join(path.posix.dirname(repoPath), specifier));
    return normalized.startsWith(`${SURFACE_PROTOCOL_DIR}/`);
  }

  if (specifier === '../../types/calculator') {
    return true;
  }

  if (
    repoPath === `${SURFACE_PROTOCOL_DIR}/events.ts`
    && specifier === '../ooe/events/event-outbox'
  ) {
    return true;
  }

  return false;
}

function assertAllowedImports(repoPath, text) {
  for (const match of text.matchAll(IMPORT_SPECIFIER_RE)) {
    const specifier = match[1] ?? match[2];
    if (specifier.startsWith('.')) {
      if (!isAllowedRelativeImport(repoPath, specifier)) {
        throw new Error(`${repoPath} imports forbidden Surface dependency "${specifier}"`);
      }
      continue;
    }

    throw new Error(`${repoPath} imports forbidden package dependency "${specifier}"`);
  }
}

function assertNoForbiddenText(repoPath, text) {
  if (repoPath === `${SURFACE_PROTOCOL_DIR}/policy.ts`) {
    return;
  }

  for (const { pattern, reason } of FORBIDDEN_TEXT_PATTERNS) {
    if (pattern.test(text)) {
      throw new Error(`${repoPath} references forbidden Surface boundary text: ${reason}`);
    }
  }
}

export function validateSurfaceProtocolBoundaries(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const files = options.files
    ? options.files.map((repoPath) => path.join(rootDir, repoPath))
    : listProductionSurfaceFiles(rootDir);

  for (const fullPath of files) {
    const repoPath = toRepoPath(rootDir, fullPath);
    const text = readFileSync(fullPath, 'utf8');
    assertAllowedImports(repoPath, text);
    assertNoForbiddenText(repoPath, text);
  }

  return {
    files: files.length,
  };
}
