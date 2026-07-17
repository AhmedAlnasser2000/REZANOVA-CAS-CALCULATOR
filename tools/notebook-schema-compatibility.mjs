import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));

function read(relativePath) {
  return readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');
}

function numberConstant(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${label}.`);
  }
  return Number(match[1]);
}

function numberList(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    throw new Error(`Could not find ${label}.`);
  }
  return match[1]
    .split(',')
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${label} mismatch: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}.`);
  }
}

const typesSource = read('src/lib/notebook/document/types.ts');
const compatibilitySource = read('src/lib/notebook/document/compatibility.ts');
const modelSource = read('src/lib/notebook/document/model.ts');
const rustModelSource = read('src-tauri/src/notebook_storage/model.rs');
const fixtureSource = read('src/lib/notebook/document/schema-compatibility.fixtures.json');

const tsCurrent = numberConstant(
  typesSource,
  /NOTEBOOK_RICH_DOCUMENT_VERSION\s*=\s*(\d+)\s+as const/,
  'TypeScript current schema',
);
const rustCurrent = numberConstant(
  rustModelSource,
  /CURRENT_DOCUMENT_SCHEMA:\s*u64\s*=\s*(\d+);/,
  'Rust current schema',
);
const tsMinimum = numberConstant(
  compatibilitySource,
  /minimumDurableSchema:\s*(\d+)/,
  'TypeScript minimum durable schema',
);
const rustMinimum = numberConstant(
  rustModelSource,
  /MINIMUM_DURABLE_DOCUMENT_SCHEMA:\s*u64\s*=\s*(\d+);/,
  'Rust minimum durable schema',
);
const durableSchemas = numberList(
  compatibilitySource,
  /supportedDurableSchemas:\s*\[([^\]]+)\]/,
  'TypeScript durable schema list',
);
const bestEffortSchemas = numberList(
  compatibilitySource,
  /bestEffortRecoverySchemas:\s*\[([^\]]+)\]/,
  'TypeScript best-effort recovery schema list',
);
const fixtureSchemas = JSON.parse(fixtureSource).fixtures.map((fixture) => fixture.schema);

assertEqual(tsCurrent, 14, 'TypeScript current schema');
assertEqual(rustCurrent, tsCurrent, 'Rust current schema');
assertEqual(tsMinimum, 6, 'TypeScript minimum durable schema');
assertEqual(rustMinimum, tsMinimum, 'Rust minimum durable schema');
assertEqual(durableSchemas, [6, 7, 8, 9, 10, 11, 12, 13, 14], 'Durable schema list');
assertEqual(bestEffortSchemas, [1, 2, 3, 4, 5], 'Best-effort recovery schema list');
assertEqual(fixtureSchemas, durableSchemas, 'Shared fixture schemas');

if (/export\s+type\s+NotebookRichDocumentV\d/.test(typesSource)) {
  throw new Error('Current document types must not export historical NotebookRichDocumentV* aliases.');
}
if (/export\s+function\s+isNotebookRichDocumentV\d/.test(modelSource)) {
  throw new Error('Current document model must not export historical isNotebookRichDocumentV* guards.');
}

console.log(`Notebook schema compatibility ok (${root})`);
