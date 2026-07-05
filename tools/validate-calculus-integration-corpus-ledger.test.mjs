import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { validateCalculusIntegrationCorpusLedger } from './calculus-integration-corpus-ledger-core.mjs';

const tempRoots = [];

function makeRootFromRepo() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-calculus-integration-corpus-'));
  tempRoots.push(rootDir);
  mkdirSync(path.join(rootDir, 'benchmarks/calculus-corpus'), { recursive: true });
  cpSync(
    'benchmarks/calculus-corpus/integration',
    path.join(rootDir, 'benchmarks/calculus-corpus/integration'),
    { recursive: true },
  );
  return rootDir;
}

function ledgerPath(rootDir, fileName) {
  return path.join(rootDir, 'benchmarks/calculus-corpus/integration/ledger', fileName);
}

function writeJsonl(filePath, records) {
  writeFileSync(filePath, records.map((record) => JSON.stringify(record)).join('\n') + '\n');
}

function uniqueCase(overrides = {}) {
  return {
    case_id: 'calc.int.indef.substitution.real.0001',
    canonical_integrand_latex: 'x\\cos\\left(x^2\\right)',
    variable: 'x',
    integral_kind: 'indefinite',
    domain: 'real',
    family: 'u-substitution',
    expected_result_kind: 'elementary-antiderivative',
    run_policy: 'run-once-per-case-per-sweep',
    status: 'pending',
    source_id: 'openstax-calculus-v1-local',
    source_locator: '5.1 Antiderivatives and Indefinite Integration',
    ...overrides,
  };
}

function runResult(overrides = {}) {
  return {
    run_id: '2026-07-03-bootstrap',
    case_id: 'calc.int.indef.substitution.real.0001',
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

describe('calculus integration corpus ledger validation', () => {
  it('accepts the committed ledger scaffold', () => {
    assert.deepEqual(validateCalculusIntegrationCorpusLedger(), {
      sourceCount: 8,
      uniqueCaseCount: 550,
      duplicateCaseCount: 17,
      runResultCount: 945,
      scanFindingCount: 68,
    });
  });

  it('accepts one indefinite unique case with one duplicate and one visually verified run result', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeJsonl(ledgerPath(rootDir, 'duplicate-cases.jsonl'), [
      {
        duplicate_id: 'dup.calc.int.indef.substitution.real.0001.0001',
        case_id: 'calc.int.indef.substitution.real.0001',
        source_id: 'apex-calculus',
        source_locator: '5.1 Antiderivatives and Indefinite Integration',
        source_integrand_latex: 't\\cos\\left(t^2\\right)',
        duplicate_reason: 'same-under-variable-rename',
      },
    ]);
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [runResult()]);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.deepEqual(validateCalculusIntegrationCorpusLedger({ rootDir }), {
      sourceCount: 8,
      uniqueCaseCount: 1,
      duplicateCaseCount: 1,
      runResultCount: 1,
      scanFindingCount: 0,
    });
  });

  it('rejects definite integral cases in the integration ledger', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [
      uniqueCase({
        case_id: 'calc.int.definite.substitution.real.0001',
        integral_kind: 'definite',
      }),
    ]);

    assert.throws(
      () => validateCalculusIntegrationCorpusLedger({ rootDir }),
      /unique-cases\.jsonl:1\.integral_kind has invalid value "definite"/,
    );
  });

  it('rejects duplicate records that point to unknown unique cases', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'duplicate-cases.jsonl'), [
      {
        duplicate_id: 'dup.unknown.0001',
        case_id: 'calc.int.unknown.0001',
        source_id: 'apex-calculus',
        source_locator: '5.1 Antiderivatives and Indefinite Integration',
        source_integrand_latex: 'x\\cos\\left(x^2\\right)',
        duplicate_reason: 'same-canonical-integrand',
      },
    ]);

    assert.throws(
      () => validateCalculusIntegrationCorpusLedger({ rootDir }),
      /duplicate-cases\.jsonl:1 references unknown case_id "calc\.int\.unknown\.0001"/,
    );
  });

  it('rejects run results that target duplicate records instead of unique cases', () => {
    const rootDir = makeRootFromRepo();

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [
      runResult({
        duplicate_id: 'dup.calc.int.indef.substitution.real.0001.0001',
      }),
    ]);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateCalculusIntegrationCorpusLedger({ rootDir }),
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
      () => validateCalculusIntegrationCorpusLedger({ rootDir }),
      /run-results\.jsonl:2 duplicates "2026-07-03-bootstrap:calc\.int\.indef\.substitution\.real\.0001"/,
    );
  });

  it('rejects run results without visual verification status', () => {
    const rootDir = makeRootFromRepo();
    const result = runResult();
    delete result.visual_status;

    writeJsonl(ledgerPath(rootDir, 'unique-cases.jsonl'), [uniqueCase()]);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeJsonl(ledgerPath(rootDir, 'run-results.jsonl'), [result]);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateCalculusIntegrationCorpusLedger({ rootDir }),
      /run-results\.jsonl:1 is missing required field "visual_status"/,
    );
  });
});
