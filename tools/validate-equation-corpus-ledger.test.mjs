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

function makeUniqueCase(overrides = {}) {
  return {
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
    ...overrides,
  };
}

function writeSingleCaseLedger(rootDir, result, caseOverrides = {}) {
  writeFileSync(ledgerPath(rootDir, 'unique-cases.jsonl'), `${JSON.stringify(makeUniqueCase(caseOverrides))}\n`);
  writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
  writeFileSync(ledgerPath(rootDir, 'run-results.jsonl'), `${JSON.stringify(result)}\n`);
  writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');
}

describe('equation corpus ledger validation', () => {
  it('accepts the committed ledger scaffold', () => {
    assert.deepEqual(validateEquationCorpusLedger(), {
      sourceCount: 10,
      uniqueCaseCount: 450,
      duplicateCaseCount: 100,
      runResultCount: 1609,
      scanFindingCount: 102,
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
        complex_companion_policy: 'required-when-applicable',
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
        domain_intent: 'complex',
        companion_run_kind: 'complex-companion',
        companion_of_run_id: '2026-07-03-bootstrap-real',
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

  it('rejects invalid complex companion metadata', () => {
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
      complex_companion_policy: 'always',
      source_id: 'openstax-algebra-trig-2e',
      source_locator: '2.5 Quadratic Equations',
    };

    writeFileSync(ledgerPath(rootDir, 'unique-cases.jsonl'), `${JSON.stringify(uniqueCase)}\n`);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'run-results.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /unique-cases\.jsonl:1\.complex_companion_policy has invalid value "always"/,
    );
  });

  it('rejects complex companion run results without complex domain intent', () => {
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
      run_id: '2026-07-04-complex-companion',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-bootstrap',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'real',
      companion_run_kind: 'complex-companion',
      companion_of_run_id: '2026-07-03-bootstrap',
    };

    writeFileSync(ledgerPath(rootDir, 'unique-cases.jsonl'), `${JSON.stringify(uniqueCase)}\n`);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'run-results.jsonl'), `${JSON.stringify(result)}\n`);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /run-results\.jsonl:1\.companion_run_kind requires domain_intent "complex"/,
    );
  });

  it('rejects complex companion run results that self-reference their companion run', () => {
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
      run_id: '2026-07-04-complex-companion',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-bootstrap',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      companion_run_kind: 'complex-companion',
      companion_of_run_id: '2026-07-04-complex-companion',
    };

    writeFileSync(ledgerPath(rootDir, 'unique-cases.jsonl'), `${JSON.stringify(uniqueCase)}\n`);
    writeFileSync(ledgerPath(rootDir, 'duplicate-cases.jsonl'), '');
    writeFileSync(ledgerPath(rootDir, 'run-results.jsonl'), `${JSON.stringify(result)}\n`);
    writeFileSync(ledgerPath(rootDir, 'scan-findings.jsonl'), '');

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /run-results\.jsonl:1\.companion_of_run_id must not reference its own run_id/,
    );
  });

  it('accepts global polynomial complex numeric evidence', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-polynomial-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      route_observed: 'Complex numeric polynomial roots',
      root_count: 2,
      complex_numeric_scope: 'global-polynomial',
      complex_engine: 'complex-polynomial-aberth',
      complex_verification_status: 'global-polynomial',
      complex_branch_policy: 'pole-aware',
      complex_candidate_count: 2,
    };

    writeSingleCaseLedger(rootDir, result);

    assert.deepEqual(validateEquationCorpusLedger({ rootDir }), {
      sourceCount: 10,
      uniqueCaseCount: 1,
      duplicateCaseCount: 0,
      runResultCount: 1,
      scanFindingCount: 0,
    });

    rmSync(rootDir, { recursive: true, force: true });
  });

  it('accepts contour-verified bounded-region complex evidence', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-region-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      route_observed: 'Complex region nonlinear roots',
      root_count: 2,
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'contour-verified',
      complex_contour_root_count: 2,
      complex_candidate_count: 2,
      complex_branch_policy: 'principal',
      complex_region: {
        re_min: '-2',
        re_max: '2',
        im_min: '-2',
        im_max: '2',
        grid_size: 8,
        random_seed_count: 12,
        contour_samples: 64,
        subdivision_depth: 0,
        cell_budget: 1,
      },
      complex_searched_region_notes: 'Verified inside [-2,2] x [-2,2] only.',
    };

    writeSingleCaseLedger(rootDir, result);

    assert.deepEqual(validateEquationCorpusLedger({ rootDir }), {
      sourceCount: 10,
      uniqueCaseCount: 1,
      duplicateCaseCount: 0,
      runResultCount: 1,
      scanFindingCount: 0,
    });

    rmSync(rootDir, { recursive: true, force: true });
  });

  it('rejects supported bounded-region complex evidence without contour verification', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-region-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'inconclusive',
      complex_candidate_count: 1,
      complex_branch_policy: 'principal',
      complex_region: {
        re_min: -2,
        re_max: 2,
        im_min: -2,
        im_max: 2,
      },
    };

    writeSingleCaseLedger(rootDir, result);

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /supported bounded-region complex results require contour-verified evidence/,
    );
  });

  it('rejects bounded-region complex evidence without region bounds', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-region-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'unsupported',
      failure_kind: 'needs-upgrade',
      domain_intent: 'complex',
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'inconclusive',
      complex_candidate_count: 1,
      complex_branch_policy: 'principal',
    };

    writeSingleCaseLedger(rootDir, result);

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /complex_numeric_scope "bounded-region" requires complex_region/,
    );
  });

  it('rejects contour-verified complex evidence with mismatched counts', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-region-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      complex_numeric_scope: 'bounded-region',
      complex_engine: 'complex-region-argument-principle',
      complex_verification_status: 'contour-verified',
      complex_contour_root_count: 2,
      complex_candidate_count: 1,
      complex_branch_policy: 'principal',
      complex_region: {
        re_min: -2,
        re_max: 2,
        im_min: -2,
        im_max: 2,
      },
    };

    writeSingleCaseLedger(rootDir, result);

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /contour-verified complex evidence requires matching contour and candidate counts/,
    );
  });

  it('rejects locus-deferred complex evidence marked supported', () => {
    const rootDir = makeRootFromRepo();
    const result = {
      run_id: '2026-07-05-complex-locus-contract',
      case_id: 'eq.poly.quadratic.real.0001',
      runner: 'manual-ledger-contract',
      run_status: 'supported',
      failure_kind: 'none',
      domain_intent: 'complex',
      complex_numeric_scope: 'locus-deferred',
      complex_engine: 'locus-deferred',
      complex_verification_status: 'not-applicable',
      complex_branch_policy: 'locus-deferred',
    };

    writeSingleCaseLedger(rootDir, result);

    assert.throws(
      () => validateEquationCorpusLedger({ rootDir }),
      /complex_numeric_scope "locus-deferred" cannot be marked supported/,
    );
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
