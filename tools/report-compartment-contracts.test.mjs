import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { buildCompartmentContractsReport } from './report-compartment-contracts.mjs';

const repoRoot = path.resolve('.');
const manifestPath = path.join(repoRoot, 'src/lib/compartments/manifest.ts');

function makeRoot() {
  const root = mkdtempSync(path.join(tmpdir(), 'calcwiz-compartment-report-'));
  mkdirSync(path.join(root, 'src/lib/compartments'), { recursive: true });
  writeFileSync(
    path.join(root, 'src/lib/compartments/manifest.ts'),
    readFileSync(manifestPath, 'utf8'),
  );
  return root;
}

describe('compartment contract report', () => {
  it('prints contract metadata and a validator pass summary', () => {
    const report = buildCompartmentContractsReport({ rootDir: repoRoot });

    assert.equal(report.validation.status, 'pass');
    assert.match(report.text, /Compartment Contracts Report/u);
    assert.match(report.text, /## Equation \(equation\)/u);
    assert.match(report.text, /surface exposure: future-surface/u);
    assert.match(report.text, /owned paths: .*src\/lib\/equation\//u);
    assert.match(report.text, /dependency policies: .*private-solver-boundary/u);
  });

  it('includes validator failures without writing files', () => {
    const root = makeRoot();
    mkdirSync(path.join(root, 'src/lib/algebra'), { recursive: true });
    writeFileSync(
      path.join(root, 'src/lib/algebra/bad.ts'),
      "import React from 'react';\n",
    );

    const report = buildCompartmentContractsReport({
      rootDir: root,
      sourceFiles: ['src/lib/algebra/bad.ts'],
    });

    assert.equal(report.validation.status, 'fail');
    assert.match(report.text, /validator: fail/u);
    assert.match(report.text, /src\/lib\/algebra\/bad\.ts \[Algebra\]/u);
  });
});
