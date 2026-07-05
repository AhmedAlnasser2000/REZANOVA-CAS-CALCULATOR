import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export const DEFAULT_CORPUS_DIR = 'benchmarks/equation-corpus';

const REQUIRED_SOURCE_FIELDS = [
  'source_id',
  'title',
  'source_type',
  'access',
  'equation_relevance',
  'license',
  'locator_policy',
];

const REQUIRED_UNIQUE_CASE_FIELDS = [
  'case_id',
  'canonical_latex',
  'target',
  'domain',
  'family',
  'expected_result_kind',
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
  'source_expression_latex',
  'duplicate_reason',
];

const REQUIRED_RUN_RESULT_FIELDS = [
  'run_id',
  'case_id',
  'runner',
  'run_status',
  'failure_kind',
];

const REQUIRED_SCAN_FINDING_FIELDS = [
  'finding_id',
  'case_id',
  'finding_kind',
  'summary',
];

const ALLOWED_SOURCE_TYPES = ['local-pdf', 'website'];
const ALLOWED_SOURCE_ACCESS = ['local', 'web'];
const ALLOWED_SOURCE_RELEVANCE = ['primary', 'secondary', 'reference'];
const ALLOWED_DOMAINS = ['real', 'complex', 'interval-real', 'mixed-or-unspecified'];
const ALLOWED_COMPLEX_COMPANION_POLICIES = [
  'required-when-applicable',
  'native-complex-case',
  'not-applicable',
];
const ALLOWED_RUN_POLICIES = ['run-once-per-case-per-sweep'];
const ALLOWED_CASE_STATUSES = ['pending', 'supported', 'unsupported', 'wrong-result', 'needs-upgrade', 'not-run'];
const ALLOWED_ROUTE_HINTS = ['symbolic', 'linear2', 'linear3', 'polynomialSystem2', 'quadratic', 'cubic', 'quartic'];
const ALLOWED_COMPANION_RUN_KINDS = ['complex-companion'];
const ALLOWED_COMPLEX_NUMERIC_SCOPES = [
  'global-polynomial',
  'bounded-region',
  'symbolic-family',
  'controlled-boundary',
  'locus-deferred',
];
const ALLOWED_COMPLEX_ENGINES = [
  'exact-symbolic',
  'complex-polynomial-aberth',
  'complex-region-argument-principle',
  'complex-boundary-policy',
  'locus-deferred',
];
const ALLOWED_COMPLEX_VERIFICATION_STATUSES = [
  'global-polynomial',
  'contour-verified',
  'inconclusive',
  'unsafe',
  'not-applicable',
];
const ALLOWED_COMPLEX_BRANCH_POLICIES = [
  'not-applicable',
  'principal',
  'branch-family',
  'branch-safe',
  'branch-unsafe',
  'pole-aware',
  'locus-deferred',
];
const COMPLEX_EVIDENCE_FIELDS = [
  'complex_numeric_scope',
  'complex_region',
  'complex_engine',
  'complex_verification_status',
  'complex_contour_root_count',
  'complex_candidate_count',
  'complex_branch_policy',
  'complex_searched_region_notes',
];
const ALLOWED_RUN_STATUSES = ['supported', 'unsupported', 'wrong-result', 'timeout-or-too-slow', 'not-run'];
const ALLOWED_FAILURE_KINDS = [
  'none',
  'missing-capability',
  'needs-upgrade',
  'readback-only-issue',
  'parser-or-input-grammar-gap',
  'performance-concern',
  'unknown',
];
const ALLOWED_FINDING_KINDS = [
  'missing-capability',
  'needs-normalization',
  'needs-factoring',
  'needs-domain-handling',
  'needs-exclusion-handling',
  'needs-branch-handling',
  'needs-periodic-output',
  'needs-numeric-search',
  'needs-complex-support',
  'wrong-result',
  'timeout-or-too-slow',
  'readback-only-issue',
  'parser-or-input-grammar-gap',
  'duplicate-mapping-note',
];
const ALLOWED_UPGRADE_OR_MISSING = ['missing-capability', 'needs-upgrade', 'not-applicable'];
const ALLOWED_FINDING_RESOLUTION_STATUSES = ['open', 'fixed', 'superseded', 'not-reproduced'];

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

function assertNonnegativeInteger(value, context) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${context} must be a nonnegative integer`);
  }
}

function assertFiniteBound(value, context) {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new Error(`${context} must be a finite numeric bound`);
  }

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    throw new Error(`${context} must be a finite numeric bound`);
  }

  return numericValue;
}

function validateComplexRegion(region, context) {
  assertPlainObject(region, context);

  const reMin = assertFiniteBound(region.re_min, `${context}.re_min`);
  const reMax = assertFiniteBound(region.re_max, `${context}.re_max`);
  const imMin = assertFiniteBound(region.im_min, `${context}.im_min`);
  const imMax = assertFiniteBound(region.im_max, `${context}.im_max`);

  if (reMin >= reMax) {
    throw new Error(`${context}.re_min must be less than re_max`);
  }

  if (imMin >= imMax) {
    throw new Error(`${context}.im_min must be less than im_max`);
  }

  for (const field of ['grid_size', 'random_seed_count', 'contour_samples', 'subdivision_depth', 'cell_budget']) {
    if (region[field] !== undefined) {
      assertNonnegativeInteger(region[field], `${context}.${field}`);
    }
  }
}

function validateComplexNumericEvidence(record, context) {
  const hasComplexEvidence = COMPLEX_EVIDENCE_FIELDS.some((field) => record[field] !== undefined);
  if (!hasComplexEvidence) {
    return;
  }

  if (record.domain_intent !== 'complex') {
    throw new Error(`${context} complex numeric evidence requires domain_intent "complex"`);
  }

  for (const field of ['complex_numeric_scope', 'complex_engine', 'complex_verification_status', 'complex_branch_policy']) {
    if (!record[field]) {
      throw new Error(`${context} complex numeric evidence is missing required field "${field}"`);
    }
  }

  assertEnum(
    record.complex_numeric_scope,
    ALLOWED_COMPLEX_NUMERIC_SCOPES,
    `${context}.complex_numeric_scope`,
  );
  assertEnum(record.complex_engine, ALLOWED_COMPLEX_ENGINES, `${context}.complex_engine`);
  assertEnum(
    record.complex_verification_status,
    ALLOWED_COMPLEX_VERIFICATION_STATUSES,
    `${context}.complex_verification_status`,
  );
  assertEnum(record.complex_branch_policy, ALLOWED_COMPLEX_BRANCH_POLICIES, `${context}.complex_branch_policy`);

  if (record.complex_region !== undefined) {
    validateComplexRegion(record.complex_region, `${context}.complex_region`);
  }

  for (const field of ['complex_contour_root_count', 'complex_candidate_count']) {
    if (record[field] !== undefined) {
      assertNonnegativeInteger(record[field], `${context}.${field}`);
    }
  }

  if (
    record.complex_verification_status === 'contour-verified' &&
    (record.complex_contour_root_count === undefined || record.complex_candidate_count === undefined)
  ) {
    throw new Error(`${context}.complex_verification_status "contour-verified" requires contour and candidate counts`);
  }

  if (
    record.complex_verification_status === 'contour-verified' &&
    record.complex_contour_root_count !== record.complex_candidate_count
  ) {
    throw new Error(`${context} contour-verified complex evidence requires matching contour and candidate counts`);
  }

  if (record.complex_searched_region_notes !== undefined && typeof record.complex_searched_region_notes !== 'string') {
    throw new Error(`${context}.complex_searched_region_notes must be a string`);
  }

  switch (record.complex_numeric_scope) {
    case 'global-polynomial':
      if (record.complex_engine !== 'complex-polynomial-aberth') {
        throw new Error(`${context}.complex_numeric_scope "global-polynomial" requires complex-polynomial-aberth`);
      }
      if (record.complex_verification_status !== 'global-polynomial') {
        throw new Error(`${context}.complex_numeric_scope "global-polynomial" requires global-polynomial verification`);
      }
      if (record.complex_region !== undefined) {
        throw new Error(`${context}.complex_numeric_scope "global-polynomial" must not include complex_region`);
      }
      break;
    case 'bounded-region':
      if (record.complex_engine !== 'complex-region-argument-principle') {
        throw new Error(`${context}.complex_numeric_scope "bounded-region" requires complex-region-argument-principle`);
      }
      if (record.complex_region === undefined) {
        throw new Error(`${context}.complex_numeric_scope "bounded-region" requires complex_region`);
      }
      if (record.run_status === 'supported' && record.complex_verification_status !== 'contour-verified') {
        throw new Error(`${context} supported bounded-region complex results require contour-verified evidence`);
      }
      break;
    case 'symbolic-family':
      if (record.complex_engine !== 'exact-symbolic') {
        throw new Error(`${context}.complex_numeric_scope "symbolic-family" requires exact-symbolic`);
      }
      if (record.complex_verification_status !== 'not-applicable') {
        throw new Error(`${context}.complex_numeric_scope "symbolic-family" requires not-applicable verification`);
      }
      break;
    case 'controlled-boundary':
      if (record.complex_engine !== 'complex-boundary-policy') {
        throw new Error(`${context}.complex_numeric_scope "controlled-boundary" requires complex-boundary-policy`);
      }
      if (!['not-applicable', 'unsafe'].includes(record.complex_verification_status)) {
        throw new Error(`${context}.complex_numeric_scope "controlled-boundary" requires not-applicable or unsafe verification`);
      }
      break;
    case 'locus-deferred':
      if (record.complex_engine !== 'locus-deferred') {
        throw new Error(`${context}.complex_numeric_scope "locus-deferred" requires locus-deferred engine`);
      }
      if (record.complex_branch_policy !== 'locus-deferred') {
        throw new Error(`${context}.complex_numeric_scope "locus-deferred" requires locus-deferred branch policy`);
      }
      if (record.run_status === 'supported') {
        throw new Error(`${context}.complex_numeric_scope "locus-deferred" cannot be marked supported`);
      }
      break;
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
  if (typeof collection.add === 'function') {
    collection.add(key);
    return;
  }
  collection.set(key, context);
}

function validateSources(sourcesPath) {
  const data = readJson(sourcesPath);
  assertPlainObject(data, normalizeRepoPath(sourcesPath));

  if (data.schema_version !== 1) {
    throw new Error(`${normalizeRepoPath(sourcesPath)} schema_version must be 1`);
  }

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
    assertEnum(source.equation_relevance, ALLOWED_SOURCE_RELEVANCE, `${context}.equation_relevance`);

    if (source.source_type === 'website' && !/^https?:\/\/\S+$/u.test(source.url ?? '')) {
      throw new Error(`${context} website sources must include an http(s) url`);
    }

    if (source.source_type === 'local-pdf' && !source.local_path_hint) {
      throw new Error(`${context} local-pdf sources must include local_path_hint`);
    }
  }

  return sourceIds;
}

function validateUniqueCases(filePath, sourceIds) {
  const caseIds = new Set();
  const rows = readJsonl(filePath);

  for (const { record, lineNumber } of rows) {
    const context = `${normalizeRepoPath(filePath)}:${lineNumber}`;
    assertRequiredFields(record, REQUIRED_UNIQUE_CASE_FIELDS, context);
    addUnique(caseIds, record.case_id, context);
    assertEnum(record.domain, ALLOWED_DOMAINS, `${context}.domain`);
    assertEnum(record.run_policy, ALLOWED_RUN_POLICIES, `${context}.run_policy`);
    assertEnum(record.status, ALLOWED_CASE_STATUSES, `${context}.status`);
    if (record.route_hint) {
      assertEnum(record.route_hint, ALLOWED_ROUTE_HINTS, `${context}.route_hint`);
    }
    if (record.complex_companion_policy) {
      assertEnum(
        record.complex_companion_policy,
        ALLOWED_COMPLEX_COMPANION_POLICIES,
        `${context}.complex_companion_policy`,
      );
    }

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
    if (record.domain_intent) {
      assertEnum(record.domain_intent, ALLOWED_DOMAINS, `${context}.domain_intent`);
    }
    if (record.companion_run_kind) {
      assertEnum(record.companion_run_kind, ALLOWED_COMPANION_RUN_KINDS, `${context}.companion_run_kind`);
      if (record.domain_intent !== 'complex') {
        throw new Error(`${context}.companion_run_kind requires domain_intent "complex"`);
      }
      if (!record.companion_of_run_id) {
        throw new Error(`${context}.companion_run_kind requires companion_of_run_id`);
      }
      if (record.companion_of_run_id === record.run_id) {
        throw new Error(`${context}.companion_of_run_id must not reference its own run_id`);
      }
    }
    validateComplexNumericEvidence(record, context);
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

    if (record.upgrade_or_missing) {
      assertEnum(record.upgrade_or_missing, ALLOWED_UPGRADE_OR_MISSING, `${context}.upgrade_or_missing`);
    }

    if (record.resolution_status) {
      assertEnum(
        record.resolution_status,
        ALLOWED_FINDING_RESOLUTION_STATUSES,
        `${context}.resolution_status`,
      );
    }
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

export function validateEquationCorpusLedger(options = {}) {
  const rootDir = options.rootDir ?? process.cwd();
  const corpusDir = path.join(rootDir, options.corpusDir ?? DEFAULT_CORPUS_DIR);
  const sourcesPath = path.join(corpusDir, 'sources.json');
  const schemaPath = path.join(corpusDir, 'schemas/ledger-schema.md');
  const uniqueCasesPath = path.join(corpusDir, 'ledger/unique-cases.jsonl');
  const duplicateCasesPath = path.join(corpusDir, 'ledger/duplicate-cases.jsonl');
  const runResultsPath = path.join(corpusDir, 'ledger/run-results.jsonl');
  const scanFindingsPath = path.join(corpusDir, 'ledger/scan-findings.jsonl');

  assertExists(corpusDir, 'Equation corpus directory');
  if (!statSync(corpusDir).isDirectory()) {
    throw new Error(`${normalizeRepoPath(corpusDir)} must be a directory`);
  }

  for (const [filePath, label] of [
    [path.join(corpusDir, 'README.md'), 'Equation corpus README'],
    [sourcesPath, 'Equation corpus source registry'],
    [schemaPath, 'Equation corpus schema'],
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
