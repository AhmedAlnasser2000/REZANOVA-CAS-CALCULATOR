import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { validateCalculusLimitsCorpusLedger } from './calculus-limits-corpus-ledger-core.mjs';

const tempRoots = [];

function makeRootFromRepo() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-calculus-limits-corpus-'));
  tempRoots.push(rootDir);
  mkdirSync(path.join(rootDir, 'benchmarks/calculus-corpus'), { recursive: true });
  cpSync(
    'benchmarks/calculus-corpus/limits',
    path.join(rootDir, 'benchmarks/calculus-corpus/limits'),
    { recursive: true },
  );
  return rootDir;
}

function ledgerPath(rootDir, fileName) {
  return path.join(rootDir, 'benchmarks/calculus-corpus/limits/ledger', fileName);
}

function writeJsonl(filePath, records) {
  writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
}

function uniqueCase(overrides = {}) {
  return {
    case_id: 'calc.lim.finite.local-equivalent.real.0001',
    canonical_limit_latex: 'lim x -> 0 sin(x)/x',
    variable: 'x',
    target_kind: 'finite',
    direction: 'two-sided',
    domain: 'real',
    family: 'standard-local-equivalent',
    expected_result_kind: 'finite',
    expected_answer_latex: '1',
    route_expectation: 'local-equivalent',
    run_policy: 'run-once-per-case-per-sweep',
    status: 'supported',
    source_id: 'openstax-calculus-v1-local',
    source_locator: 'Limits and continuity; standard trigonometric limit',
    ...overrides,
  };
}

function runResult(overrides = {}) {
  return {
    run_id: '2026-07-05-bootstrap',
    case_id: 'calc.lim.finite.local-equivalent.real.0001',
    runner: 'manual-ledger-bootstrap',
    run_status: 'supported',
    failure_kind: 'none',
    visual_status: 'visually-verified',
    ...overrides,
  };
}

afterEach(() => {
  while (tempRoots.length > 0) {
    rmSync(tempRoots.pop(), { recursive: true, force: true });
  }
});

describe('calculus limits corpus ledger validation', () => {
  it('accepts the committed ledger scaffold', () => {
    assert.deepEqual(validateCalculusLimitsCorpusLedger(), {
      sourceCount: 5,
      uniqueCaseCount: 27,
      duplicateCaseCount: 0,
      runResultCount: 0,
      scanFindingCount: 0,
    });
  });

  it('accepts one unique case with one duplicate and one visually verified result', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeJsonl(ledgerPath(rootDir, 'duplicate-cases.jsonl'), [
      {
        duplicate_id: 'dup.calc.lim.finite.local-equivalent.real.0001.0001',
        case_id: 'calc.lim.finite.local-equivalent.real.0001',
        source_id: 'paul-online-notes',
        source_locator: 'Limits; trigonometric limit examples',
        source_limit_latex: 'lim t -> 0 sin(t)/t',
        duplicate_reason: 'same-under-variable-rename',
      },
    ]);
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [runResult()]);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.deepEqual(validateCalculusLimitsCorpusLedger({ rootDir }), {
      sourceCount: 5,
      uniqueCaseCount: 1,
      duplicateCaseCount: 1,
      runResultCount: 1,
      scanFindingCount: 0,
    });
  });

  it('rejects invalid target kinds', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [
      uniqueCase({ target_kind: 'symbolic-target' }),
    ]);

    assert.throws(
      () => validateCalculusLimitsCorpusLedger({ rootDir }),
      /unique-cases\.jsonl:1\.target_kind has invalid value "symbolic-target"/,
    );
  });

  it('rejects final-answer rows without expected_answer_latex', () => {
    const rootDir = makeRootFromRepo();
    const record = uniqueCase();
    delete record.expected_answer_latex;

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [record]);

    assert.throws(
      () => validateCalculusLimitsCorpusLedger({ rootDir }),
      /unique-cases\.jsonl:1 must include expected_answer_latex/,
    );
  });

  it('rejects controlled-failure rows without expected_error_contains', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [
      uniqueCase({
        expected_result_kind: 'does-not-exist',
        route_expectation: 'squeeze-oscillation',
      }),
    ]);

    assert.throws(
      () => validateCalculusLimitsCorpusLedger({ rootDir }),
      /unique-cases\.jsonl:1 must include expected_error_contains/,
    );
  });

  it('rejects run results that target duplicate records instead of unique cases', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [
      runResult({
        duplicate_id: 'dup.calc.lim.finite.local-equivalent.real.0001.0001',
      }),
    ]);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateCalculusLimitsCorpusLedger({ rootDir }),
      /must reference case_id only, not duplicate or occurrence records/,
    );
  });

  it('rejects repeated run results for the same case in one sweep', () => {
    const rootDir = makeRootFromRepo();
    const result = runResult();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [result, result]);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateCalculusLimitsCorpusLedger({ rootDir }),
      /run-results\.jsonl:2 duplicates "2026-07-05-bootstrap:calc\.lim\.finite\.local-equivalent\.real\.0001"/,
    );
  });
});
