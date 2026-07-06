import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_CORPUS_DIR = 'benchmarks/calculus-corpus/limits';

const REQUIRED_SOURCE_FIELDS = [
  'source_id',
  'title',
  'source_type',
  'access',
  'calculus_lane',
  'limits_relevance',
  'license',
  'locator_policy',
];

const REQUIRED_UNIQUE_CASE_FIELDS = [
  'case_id',
  'canonical_limit_latex',
  'variable',
  'target_kind',
  'direction',
  'domain',
  'family',
  'expected_result_kind',
  'route_expectation',
  'run_policy',
  'status',
  'source_id',
  'source_locator',
];

const REQUIRED_DUPLICATE_FIELDS = [
  'duplicate_id',
  'case_id',
  'source_id',
  'source_locator',
  'source_limit_latex',
  'duplicate_reason',
];

const REQUIRED_RUN_RESULT_FIELDS = [
  'run_id',
  'case_id',
  'runner',
  'run_status',
  'failure_kind',
  'visual_status',
];

const REQUIRED_SCAN_FINDING_FIELDS = ['finding_id', 'case_id', 'finding_kind', 'summary'];

const ALLOWED_SOURCE_TYPES = ['local-pdf', 'website'];
const ALLOWED_SOURCE_ACCESS = ['local', 'web'];
const ALLOWED_SOURCE_RELEVANCE = ['primary', 'secondary', 'reference', 'deferred'];
const ALLOWED_CALCULUS_LANES = ['limits'];
const ALLOWED_TARGET_KINDS = ['finite', 'positive-infinity', 'negative-infinity'];
const ALLOWED_DIRECTIONS = ['two-sided', 'left', 'right', 'not-applicable'];
const ALLOWED_DOMAINS = [
  'real',
  'complex',
  'real-with-conditions',
  'symbolic-conditions',
  'mixed-or-unspecified',
];
const ALLOWED_EXPECTED_RESULT_KINDS = [
  'finite',
  'infinite',
  'symbolic',
  'guarded-cases',
  'does-not-exist',
  'controlled-unsupported',
  'parser-boundary',
  'proof-boundary',
  'domain-boundary',
  'complex-principal',
];
const ALLOWED_ROUTE_KINDS = [
  'direct-substitution',
  'removable-rational',
  'local-equivalent',
  'finite-pole',
  'exact-local-algebra',
  'indeterminate-transform',
  'infinity-asymptotic',
  'lhospital-candidate',
  'taylor-series-candidate',
  'squeeze-oscillation',
  'piecewise',
  'abs-side-behavior',
  'mrv-lite',
  'gruntz',
  'unsupported',
  'malformed',
  'too-complex',
];
const ALLOWED_RUN_POLICIES = ['run-once-per-case-per-sweep'];
const ALLOWED_CASE_STATUSES = [
  'pending',
  'supported',
  'unsupported',
  'wrong-result',
  'needs-upgrade',
  'not-run',
  'boundary-deferred',
];
const ALLOWED_RUN_STATUSES = ['supported', 'unsupported', 'wrong-result', 'timeout-or-too-slow', 'not-run'];
const ALLOWED_FAILURE_KINDS = [
  'none',
  'missing-capability',
  'needs-upgrade',
  'readback-only-issue',
  'visual-output-issue',
  'parser-or-input-grammar-gap',
  'performance-concern',
  'unknown',
];
const ALLOWED_VISUAL_STATUSES = [
  'visually-verified',
  'visual-blocked',
  'not-run',
  'not-applicable-doc-only',
];
const ALLOWED_FINDING_KINDS = [
  'missing-capability',
  'needs-method-coverage',
  'needs-normalization',
  'needs-route-selection',
  'needs-proof-card',
  'needs-domain-handling',
  'needs-branch-handling',
  'wrong-result',
  'timeout-or-too-slow',
  'readback-only-issue',
  'visual-output-issue',
  'parser-or-input-grammar-gap',
  'duplicate-mapping-note',
  'source-scope-boundary',
];

function normalizeRepoPath(filePath) {
  return filePath.replace(/\\/gu, '/').replace(/^\.\//u, '');
}

function assertExists(filePath, label) {
  if (!existsSync(filePath)) {
    throw new Error(`Missing ${label}: ${normalizeRepoPath(filePath)}`);
  }
}

function assertPlainObject(value, context) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be a JSON object`);
  }
}

function assertRequiredFields(record, requiredFields, context) {
  for (const field of requiredFields) {
    if (record[field] === undefined || record[field] === null || record[field] === '') {
      throw new Error(`${context} is missing required field "${field}"`);
    }
  }
}

function assertEnum(value, allowedValues, context) {
  if (!allowedValues.includes(value)) {
    throw new Error(`${context} has invalid value "${value}"`);
  }
}

function assertStringArray(value, context) {
  if (value === undefined) {
    return;
  }

  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0)) {
    throw new Error(`${context} must be an array of non-empty strings`);
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch (error) {
    throw new Error(`${normalizeRepoPath(filePath)} is not valid JSON: ${error.message}`);
  }
}

function readJsonl(filePath) {
  const rows = [];
  const text = readFileSync(filePath, 'utf8');

  for (const [index, rawLine] of text.split(/\r?\n/u).entries()) {
    const line = rawLine.trim();
    if (!line) {
      continue;
    }

    try {
      const record = JSON.parse(line);
      assertPlainObject(record, `${normalizeRepoPath(filePath)}:${index + 1}`);
      rows.push({ record, lineNumber: index + 1 });
    } catch (error) {
      throw new Error(`${normalizeRepoPath(filePath)}:${index + 1} is not valid JSONL: ${error.message}`);
    }
  }

  return rows;
}

function addUnique(collection, key, context) {
  if (collection.has(key)) {
    throw new Error(`${context} duplicates "${key}"`);
  }
  collection.add(key);
}

function validateSources(sourcesPath) {
  const data = readJson(sourcesPath);
  assertPlainObject(data, normalizeRepoPath(sourcesPath));

  if (data.schema_version !== 1) {
    throw new Error(`${normalizeRepoPath(sourcesPath)} schema_version must be 1`);
  }

  assertEnum(data.calculus_lane, ALLOWED_CALCULUS_LANES, `${normalizeRepoPath(sourcesPath)}.calculus_lane`);

  if (!Array.isArray(data.sources)) {
    throw new Error(`${normalizeRepoPath(sourcesPath)} sources must be an array`);
  }

  const sourceIds = new Set();

  for (const [index, source] of data.sources.entries()) {
    const context = `${normalizeRepoPath(sourcesPath)} sources[${index}]`;
    assertPlainObject(source, context);
    assertRequiredFields(source, REQUIRED_SOURCE_FIELDS, context);
    addUnique(sourceIds, source.source_id, context);
    assertEnum(source.source_type, ALLOWED_SOURCE_TYPES, `${context}.source_type`);
    assertEnum(source.access, ALLOWED_SOURCE_ACCESS, `${context}.access`);
    assertEnum(source.calculus_lane, ALLOWED_CALCULUS_LANES, `${context}.calculus_lane`);
    assertEnum(source.limits_relevance, ALLOWED_SOURCE_RELEVANCE, `${context}.limits_relevance`);

    if (source.source_type === 'website' && !/^https?:\/\/\S+$/u.test(source.url ?? '')) {
      throw new Error(`${context} website sources must include an http(s) url`);
    }

    if (source.source_type === 'local-pdf' && !source.local_path_hint) {
      throw new Error(`${context} local-pdf sources must include local_path_hint`);
    }
  }

  return sourceIds;
}

function validateExpectedResult(record, context) {
  const answerKinds = ['finite', 'infinite', 'symbolic', 'guarded-cases', 'complex-principal'];
  const errorKinds = ['does-not-exist', 'controlled-unsupported', 'parser-boundary', 'proof-boundary', 'domain-boundary'];

  if (answerKinds.includes(record.expected_result_kind) && !record.expected_answer_latex) {
    throw new Error(`${context} must include expected_answer_latex`);
  }

  if (errorKinds.includes(record.expected_result_kind) && !record.expected_error_contains) {
    throw new Error(`${context} must include expected_error_contains`);
  }
}

function validateUniqueCases(filePath, sourceIds) {
  const caseIds = new Set();
  const rows = readJsonl(filePath);

  for (const { record, lineNumber } of rows) {
    const context = `${normalizeRepoPath(filePath)}:${lineNumber}`;
    assertRequiredFields(record, REQUIRED_UNIQUE_CASE_FIELDS, context);
    addUnique(caseIds, record.case_id, context);
    assertEnum(record.target_kind, ALLOWED_TARGET_KINDS, `${context}.target_kind`);
    assertEnum(record.direction, ALLOWED_DIRECTIONS, `${context}.direction`);
    assertEnum(record.domain, ALLOWED_DOMAINS, `${context}.domain`);
    assertEnum(record.expected_result_kind, ALLOWED_EXPECTED_RESULT_KINDS, `${context}.expected_result_kind`);
    assertEnum(record.route_expectation, ALLOWED_ROUTE_KINDS, `${context}.route_expectation`);
    assertEnum(record.run_policy, ALLOWED_RUN_POLICIES, `${context}.run_policy`);
    assertEnum(record.status, ALLOWED_CASE_STATUSES, `${context}.status`);
    assertStringArray(record.expected_detail_titles, `${context}.expected_detail_titles`);
    assertStringArray(record.expected_detail_contains, `${context}.expected_detail_contains`);
    assertStringArray(record.tags, `${context}.tags`);
    validateExpectedResult(record, context);

    if (!sourceIds.has(record.source_id)) {
      throw new Error(`${context} references unknown source_id "${record.source_id}"`);
    }
  }

  return { caseIds, count: rows.length };
}

function validateDuplicateCases(filePath, sourceIds, caseIds) {
  const duplicateIds = new Set();
  const rows = readJsonl(filePath);

  for (const { record, lineNumber } of rows) {
    const context = `${normalizeRepoPath(filePath)}:${lineNumber}`;
    assertRequiredFields(record, REQUIRED_DUPLICATE_FIELDS, context);
    addUnique(duplicateIds, record.duplicate_id, context);

    if (!caseIds.has(record.case_id)) {
      throw new Error(`${context} references unknown case_id "${record.case_id}"`);
    }

    if (!sourceIds.has(record.source_id)) {
      throw new Error(`${context} references unknown source_id "${record.source_id}"`);
    }
  }

  return rows.length;
}

function validateRunResults(filePath, caseIds) {
  const runCaseKeys = new Set();
  const rows = readJsonl(filePath);

  for (const { record, lineNumber } of rows) {
    const context = `${normalizeRepoPath(filePath)}:${lineNumber}`;
    assertRequiredFields(record, REQUIRED_RUN_RESULT_FIELDS, context);

    if (record.duplicate_id || record.occurrence_id) {
      throw new Error(`${context} must reference case_id only, not duplicate or occurrence records`);
    }

    if (!caseIds.has(record.case_id)) {
      throw new Error(`${context} references unknown case_id "${record.case_id}"`);
    }

    assertEnum(record.run_status, ALLOWED_RUN_STATUSES, `${context}.run_status`);
    assertEnum(record.failure_kind, ALLOWED_FAILURE_KINDS, `${context}.failure_kind`);
    assertEnum(record.visual_status, ALLOWED_VISUAL_STATUSES, `${context}.visual_status`);
    addUnique(runCaseKeys, `${record.run_id}:${record.case_id}`, context);
  }

  return rows.length;
}

function validateScanFindings(filePath, sourceIds, caseIds) {
  const findingIds = new Set();
  const rows = readJsonl(filePath);

  for (const { record, lineNumber } of rows) {
    const context = `${normalizeRepoPath(filePath)}:${lineNumber}`;
    assertRequiredFields(record, REQUIRED_SCAN_FINDING_FIELDS, context);
    addUnique(findingIds, record.finding_id, context);

    if (!caseIds.has(record.case_id)) {
      throw new Error(`${context} references unknown case_id "${record.case_id}"`);
    }

    if (record.source_id && !sourceIds.has(record.source_id)) {
      throw new Error(`${context} references unknown source_id "${record.source_id}"`);
    }

    assertEnum(record.finding_kind, ALLOWED_FINDING_KINDS, `${context}.finding_kind`);
  }

  return rows.length;
}

function assertAllowedCorpusEntries(corpusDir) {
  const allowedEntries = new Set(['README.md', 'sources.json', 'schemas', 'ledger']);

  for (const entry of readdirSync(corpusDir)) {
    if (!allowedEntries.has(entry)) {
      throw new Error(`${normalizeRepoPath(corpusDir)} has unsupported entry "${entry}"`);
    }
  }

  const ledgerDir = path.join(corpusDir, 'ledger');
  const allowedLedgerFiles = new Set([
    'unique-cases.jsonl',
    'duplicate-cases.jsonl',
    'run-results.jsonl',
    'scan-findings.jsonl',
  ]);

  for (const entry of readdirSync(ledgerDir)) {
    if (!allowedLedgerFiles.has(entry)) {
      throw new Error(`${normalizeRepoPath(ledgerDir)} has unsupported entry "${entry}"`);
    }
  }
}

export function validateCalculusLimitsCorpusLedger(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const corpusDir = path.join(rootDir, options.corpusDir ?? DEFAULT_CORPUS_DIR);
  const sourcesPath = path.join(corpusDir, 'sources.json');
  const schemaPath = path.join(corpusDir, 'schemas/ledger-schema.md');
  const uniqueCasesPath = path.join(corpusDir, 'ledger/unique-cases.jsonl');
  const duplicateCasesPath = path.join(corpusDir, 'ledger/duplicate-cases.jsonl');
  const runResultsPath = path.join(corpusDir, 'ledger/run-results.jsonl');
  const scanFindingsPath = path.join(corpusDir, 'ledger/scan-findings.jsonl');

  assertExists(corpusDir, 'Calculus limits corpus directory');
  if (!statSync(corpusDir).isDirectory()) {
    throw new Error(`${normalizeRepoPath(corpusDir)} must be a directory`);
  }

  for (const [filePath, label] of [
    [path.join(corpusDir, 'README.md'), 'Calculus limits corpus README'],
    [sourcesPath, 'Calculus limits corpus source registry'],
    [schemaPath, 'Calculus limits corpus schema'],
    [uniqueCasesPath, 'unique case ledger'],
    [duplicateCasesPath, 'duplicate case ledger'],
    [runResultsPath, 'run result ledger'],
    [scanFindingsPath, 'scan finding ledger'],
  ]) {
    assertExists(filePath, label);
  }

  assertAllowedCorpusEntries(corpusDir);

  const sourceIds = validateSources(sourcesPath);
  const { caseIds, count: uniqueCaseCount } = validateUniqueCases(uniqueCasesPath, sourceIds);
  const duplicateCaseCount = validateDuplicateCases(duplicateCasesPath, sourceIds, caseIds);
  const runResultCount = validateRunResults(runResultsPath, caseIds);
  const scanFindingCount = validateScanFindings(scanFindingsPath, sourceIds, caseIds);

  return {
    sourceCount: sourceIds.size,
    uniqueCaseCount,
    duplicateCaseCount,
    runResultCount,
    scanFindingCount,
  };
}
