import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import {
  assertPrinterMigrationBaselineUpdateAllowed,
  buildPrinterMigrationBaseline,
  formatPrinterMigrationReport,
  scanPrinterMigrationRepository,
  validatePrinterMigrationReport,
} from './printer-migration-ratchet-core.mjs';

const temporaryRoots = [];

function fixture(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calcwiz-printer-ratchet-'));
  temporaryRoots.push(rootDir);
  for (const [repoPath, source] of Object.entries(files)) {
    const absolute = path.join(rootDir, repoPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, source);
  }
  return rootDir;
}

function rewrite(rootDir, repoPath, source) {
  const absolute = path.join(rootDir, repoPath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, source);
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});

describe('printer migration ratchet', () => {
  it('classifies producer debt separately from input, prose, and reference content', () => {
    const rootDir = fixture({
      'src/lib/modes/calculate/sample.ts': `
        export const result = {
          inputLatex: '2+2',
          title: 'Numeric result',
          exactLatex: '4',
        };
      `,
      'src/lib/guide/reference.ts': `
        export const example = { exactLatex: 'reference-only' };
      `,
      'src/lib/notebook/document/tiptap-adapter.ts': `
        export const evidence = { resultLatex: 'authored-reference' };
      `,
    });
    const report = scanPrinterMigrationRepository({ rootDir });

    assert.equal(report.summary.compatibilityFallbackCount, 1);
    assert.equal(report.summary.violationCount, 0);
    assert.equal(report.categoryCounts['input-syntax'], 1);
    assert.equal(report.categoryCounts['prose-only'], 1);
    assert.equal(report.categoryCounts['reference-content'], 1);
    assert.equal(report.classificationCounts['notebook-document-content'], 1);
    assert.match(formatPrinterMigrationReport(report), /calculate-result-v1/u);
    assert.deepEqual(JSON.parse(JSON.stringify(report)), report);
    assert.deepEqual(scanPrinterMigrationRepository({ rootDir }), report);
  });

  it('recognizes canonical, answer-node, and producer-evidence dual writes as migrated result paths', () => {
    const rootDir = fixture({
      'src/lib/modes/calculate/sample.ts': `
        export const first = { exactLatex: '4', answerMathJson: 4 };
        export const second = {
          exactLatex: 'x=1',
          primaryMath: { canonicalLatex: 'x=1' },
        };
        export const third = { resultLatex: '6', resultMathJson: 6 };
        export const fourth = { exactLatex: 'x=t', primaryMathJson: ['Equal', 'x', 't'] };
      `,
    });
    const report = scanPrinterMigrationRepository({ rootDir });

    assert.equal(report.summary.migratedDualWriteCount, 4);
    assert.equal(report.summary.compatibilityFallbackCount, 0);
  });

  it('recognizes an explicit producer-profile wrapper around authored result paths', () => {
    const rootDir = fixture({
      'src/lib/equation/sample.ts': `
        const profileEquationResult = (value) => value;
        export const result = profileEquationResult({ exactLatex: 'x=1' });
      `,
    });
    const report = scanPrinterMigrationRepository({ rootDir });

    assert.equal(report.summary.migratedDualWriteCount, 1);
    assert.equal(report.summary.compatibilityFallbackCount, 0);
  });

  it('rejects result serialization outside every narrow registration', () => {
    const rootDir = fixture({
      'src/lib/new-domain/result.ts': `export const result = { exactLatex: 'x=1' };`,
    });
    const report = scanPrinterMigrationRepository({ rootDir });

    assert.deepEqual(report.violations.map((entry) => entry.kind), [
      'unclassified-result-serialization',
    ]);
    assert.throws(
      () => buildPrinterMigrationBaseline(report, 'Not allowed'),
      /unclassified or ambiguous/u,
    );
  });

  it('inventories known result builders in addition to object properties', () => {
    const rootDir = fixture({
      'src/lib/equation/guarded/sample.ts': `
        export const result = successOutcome('Solve', 'x=1');
      `,
    });
    const report = scanPrinterMigrationRepository({ rootDir });

    assert.equal(report.summary.resultPathCount, 1);
    assert.equal(report.summary.compatibilityFallbackCount, 1);
    assert.equal(report.compatibilityAssignments[0].sourceKind, 'builder:equation-guarded-success-outcome');
  });

  it('pins source fingerprints while ignoring line-only movement', () => {
    const repoPath = 'src/lib/modes/calculate/sample.ts';
    const rootDir = fixture({
      [repoPath]: `export const result = { exactLatex: '4' };`,
    });
    const initial = scanPrinterMigrationRepository({ rootDir });
    const baseline = buildPrinterMigrationBaseline(initial, 'Initial producer inventory');
    assert.equal(validatePrinterMigrationReport(initial, baseline).ok, true);

    rewrite(rootDir, repoPath, `\n\nexport const result = { exactLatex: '4' };\n`);
    assert.equal(
      validatePrinterMigrationReport(scanPrinterMigrationRepository({ rootDir }), baseline).ok,
      true,
    );

    rewrite(rootDir, repoPath, `export const result = { exactLatex: '5' };\n`);
    const changed = validatePrinterMigrationReport(
      scanPrinterMigrationRepository({ rootDir }),
      baseline,
    );
    assert.equal(changed.ok, false);
    assert.equal(changed.addedAssignmentIds.length, 1);
    assert.equal(changed.staleAssignmentIds.length, 1);
  });

  it('requires accepted updates to lower or preserve every lane and registration floor', () => {
    const repoPath = 'src/lib/modes/calculate/sample.ts';
    const rootDir = fixture({
      [repoPath]: `export const first = { exactLatex: '4' };`,
    });
    const initial = scanPrinterMigrationRepository({ rootDir });
    const baseline = buildPrinterMigrationBaseline(initial, 'Initial producer inventory');

    rewrite(rootDir, repoPath, `
      export const first = { exactLatex: '4' };
      export const second = { exactLatex: '5' };
    `);
    assert.throws(
      () => assertPrinterMigrationBaselineUpdateAllowed(
        scanPrinterMigrationRepository({ rootDir }),
        baseline,
      ),
      /cannot rise from 1 to 2/u,
    );
    assert.throws(
      () => buildPrinterMigrationBaseline(initial, ''),
      /non-empty reason/u,
    );
  });
});
