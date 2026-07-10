import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve, sep } from 'node:path';

const ALLOWED_MODES = new Set([
  'calculate', 'equation', 'calculus', 'matrix', 'vector',
  'table', 'trigonometry', 'statistics', 'geometry',
]);
const ALLOWED_FIELDS = [
  'mode', 'inputLatex', 'calculateScreen', 'calculateSeed', 'calculusScreen',
  'calculusSeed', 'geometryScreen', 'geometrySeed', 'trigScreen', 'trigSeed',
  'statisticsScreen', 'statisticsSeed', 'matrixSeed', 'vectorSeed',
  'equationScreen', 'equationSeed', 'equationSolveTarget', 'equationAnswerMode',
  'equationDomainIntent', 'complexExactForm', 'replaySnapshot',
];
const SNAPSHOT_FIELDS = [
  'version', 'ansLatex', 'angleUnit', 'outputStyle', 'equationAnswerMode',
  'equationDomainIntent', 'complexExactForm', 'mathNotationDisplay',
  'historyInspectorNotationMode', 'historyPageNotationMode', 'symbolicDisplayMode',
  'flattenNestedRootsWhenSafe', 'approxDigits', 'numericNotationMode',
  'scientificNotationStyle', 'detailedFactsEnabled',
];

function sanitizeJson(value, depth = 0) {
  if (depth > 8) return undefined;
  if (typeof value === 'string') return value.slice(0, 2_000).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu, '');
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'boolean' || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 200).map((item) => sanitizeJson(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).slice(0, 100).flatMap(([key, item]) => {
      const sanitized = sanitizeJson(item, depth + 1);
      return sanitized === undefined ? [] : [[key.slice(0, 80), sanitized]];
    }));
  }
  return undefined;
}

function sanitizeEntry(entry, index) {
  if (!entry || typeof entry !== 'object' || !ALLOWED_MODES.has(entry.mode)) return null;
  if (typeof entry.inputLatex !== 'string' || entry.inputLatex.length === 0) return null;
  const candidate = { candidateId: `candidate-${String(index + 1).padStart(4, '0')}` };
  for (const field of ALLOWED_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(entry, field)) {
      const value = field === 'replaySnapshot' && entry[field] && typeof entry[field] === 'object'
        ? Object.fromEntries(SNAPSHOT_FIELDS.flatMap((snapshotField) => {
            const sanitized = sanitizeJson(entry[field][snapshotField]);
            return sanitized === undefined ? [] : [[snapshotField, sanitized]];
          }))
        : sanitizeJson(entry[field]);
      if (value !== undefined) candidate[field] = value;
    }
  }
  return candidate;
}

const args = process.argv.slice(2);
const inputIndex = args.indexOf('--input');
const input = inputIndex >= 0 ? args[inputIndex + 1] : undefined;
if (!input || args.length !== 2) {
  throw new Error('Usage: npm run import:history-replay -- --input <history-export.json>');
}

const parsed = JSON.parse(await readFile(resolve(input), 'utf8'));
const entries = Array.isArray(parsed) ? parsed : parsed?.history;
if (!Array.isArray(entries)) throw new Error('History export must be an array or an object with a history array.');
const candidates = entries.map(sanitizeEntry).filter(Boolean);
const output = resolve('.task_tmp/history-replay-import/candidates.json');
const allowedRoot = `${resolve('.task_tmp/history-replay-import')}${sep}`;
if (!output.startsWith(allowedRoot)) throw new Error('Importer output escaped the ignored candidate directory.');
await mkdir(dirname(output), { recursive: true });
await writeFile(output, `${JSON.stringify({ version: 1, candidates }, null, 2)}\n`, 'utf8');
process.stdout.write(`Wrote ${candidates.length} sanitized candidate(s) to ${output}.\n`);
