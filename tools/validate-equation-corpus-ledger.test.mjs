import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateEquationCorpusLedger } from './equation-corpus-ledger-core.mjs';

function makeRootFromRepo() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-equation-corpus-'));
  mkdirSync(path.join(rootDir, 'benchmarks'), { recursive: true });
  cpSync('benchmarks/equation-corpus', path.join(rootDir, 'benchmarks/equation-corpus'), {
    recursive: true,
  });
  return rootDir;
}

function ledgerPath(rootDir, fileName) {
  return path.join(rootDir, 'benchmarks/equation-corpus/ledger', fileName);
}

describe('equation corpus ledger validation', () => {
  it('accepts the committed ledger scaffold', () => {
    assert.deepEqual(validateEquationCorpusLedger(), {
      sourceCount: 10,
      uniqueCaseCount: 450,
      duplicateCaseCount: 100,
      runResultCount: 724,
      scanFindingCount: 76,
    });
  });

  it('accepts one unique case with one duplicate and one run result', () => {
    const rootDir = makeRootFromRepo();

    writeFileSync(
      ledgerPath(rootDir, 'unique-cases.jsonl'),
      `${JSON.stringify({
        case_id: 'eq.poly.quadratic.real.0001',
        canonical_latex: 'x^2-5x+6=0',
        target: 'x',
        domain: 'real',
        family: 'quadratic',
        expected_result_kind: 'exact-roots',
        run_policy: 'run-once-per-case-per-sweep',
        status: 'pending',
        route_hint: 'symbolic',
        source_id: 'openstax-algebra-trig-2e',
        source_locator: '2.5 Quadratic Equations',
      })}\n`,
    );

    writeFileSync(
      ledgerPath(rootDir, 'duplicate-cases.jsonl'),
      `${JSON.stringify({
        duplicate_id: 'dup.eq.poly.quadratic.real.0001.0001',
        case_id: 'eq.poly.quadratic.real.0001',
        source_id: 'openstax-college-algebra-2e',
        source_locator: '2.5 Quadratic Equations',
        source_expression_latex: 't^2-5t+6=0',
        duplicate_reason: 'same-under-variable-rename',
      })}\n`,
    );

    writeFileSync(
      ledgerPath(rootDir, 'run-results.jsonl'),
      `${JSON.stringify({
        run_id: '2026-07-03-bootstrap',
        case_id: 'eq.poly.quadratic.real.0001',
        runner: 'manual-ledger-bootstrap',
        run_status: 'supported',
        failure_kind: 'none',
      })}\n`,
    );
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.deepEqual(validateEquationCorpusLedger({ rootDir }), {
      sourceCount: 10,
      uniqueCaseCount: 1,
      duplicateCaseCount: 1,
      runResultCount: 1,
      scanFindingCount: 0,
    });
  });

  it('rejects duplicate records that point to unknown unique cases', () => {
    const rootDir = makeRootFromRepo();
    writeFileSync(
      ledgerPath(rootDir, 'duplicate-cases.jsonl'),
      `${JSON.stringify({
        duplicate_id: 'dup.unknown.0001',
        case_id: 'eq.unknown.0001',
        source_id: 'openstax-college-algebra-2e',
        source_locator: '2.5 Quadratic Equations',
        source_expression_latex: 'x^2=1',
        duplicate_reason: 'same-canonical-equation',
      })}\n`,
    );

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /duplicate-cases\.jsonl:1 references unknown case_id "eq\.unknown\.0001"/,
    );
  });

  it('rejects run results that target duplicate records instead of unique cases', () => {
    const rootDir = makeRootFromRepo();

    writeFileSync(
      ledgerPath(rootDir, 'unique-cases.jsonl'),
      `${JSON.stringify({
        case_id: 'eq.poly.quadratic.real.0001',
        canonical_latex: 'x^2-5x+6=0',
        target: 'x',
        domain: 'real',
        family: 'quadratic',
        expected_result_kind: 'exact-roots',
        run_policy: 'run-once-per-case-per-sweep',
        status: 'pending',
        source_id: 'openstax-algebra-trig-2e',
        source_locator: '2.5 Quadratic Equations',
      })}\n`,
    );

    writeFileSync(
      ledgerPath(rootDir, 'run-results.jsonl'),
      `${JSON.stringify({
        run_id: '2026-07-03-bootstrap',
        case_id: 'eq.poly.quadratic.real.0001',
        duplicate_id: 'dup.eq.poly.quadratic.real.0001.0001',
        runner: 'manual-ledger-bootstrap',
        run_status: 'supported',
        failure_kind: 'none',
      })}\n`,
    );
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /must reference case_id only, not duplicate or occurrence records/,
    );
  });

  it('rejects repeated run results for the same case in one sweep', () => {
    const rootDir = makeRootFromRepo();
    const uniqueCase = {
      case_id: 'eq.poly.quadratic.real.0001',
      canonical_latex: 'x^2-5x+6=0',
      target: 'x',
      domain: 'real',
      family: 'quadratic',
      expected_result_kind: 'exact-roots',
      run_policy: 'run-once-per-case-per-sweep',
      status: 'pending',
      source_id: 'openstax-algebra-trig-2e',
      source_locator: '2.5 Quadratic Equations',
    };
    const result = {
      run_id: '2026-07-03-bootstrap',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-bootstrap',
      run_status: 'supported',
      failure_kind: 'none',
    };

    writeFileSync(ledgerPath(rootDir, 'unique-cases.jsonl'), `${JSON.stringify(uniqueCase)}\n`);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(
      ledgerPath(rootDir, 'run-results.jsonl'),
      `${JSON.stringify(result)}\n${JSON.stringify(result)}\n`,
    );
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /run-results\.jsonl:2 duplicates "2026-07-03-bootstrap:eq\.poly\.quadratic\.real\.0001"/,
    );

    rmSync(rootDir, { recursive: true, force: true });
  });
});
