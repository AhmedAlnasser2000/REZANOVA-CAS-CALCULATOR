import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import {
  assertDetailSegmentBaselineUpdateAllowed,
  buildDetailSegmentBaseline,
  scanDetailSegmentRepository,
  validateDetailSegmentReport,
} from './detail-segment-migration-ratchet-core.mjs';

const temporaryRoots = [];

function fixture(files) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calcwiz-detail-ratchet-'));
  temporaryRoots.push(rootDir);
  for (const [repoPath, source] of Object.entries(files)) {
    const absolute = path.join(rootDir, repoPath);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, source);
  }
  return rootDir;
}

function rewrite(rootDir, repoPath, source) {
  fs.writeFileSync(path.join(rootDir, repoPath), source);
}

afterEach(() => {
  while (temporaryRoots.length > 0) {
    fs.rmSync(temporaryRoots.pop(), { recursive: true, force: true });
  }
});
describe('detail-segment migration ratchet', () => {
  it('inventories contextual detail sections while ignoring unrelated title-line objects', () => {
    const rootDir = fixture({
      'src/lib/modes/equation/sample.ts': `
        type DisplayDetailSection = {
          title: string;
          lines: string[];
          lineKind?: 'text' | 'math';
          lineKinds?: Array<'text' | 'math'>;
          lineParts?: unknown[][];
        };
        export const section: DisplayDetailSection = { title: 'Proof', lines: ['x=1'] };
        export const internal = { title: 'Trace', lines: ['not a display section'] };
      `,
    });
    const report = scanDetailSegmentRepository({ rootDir });

    assert.equal(report.summary.producerCount, 1);
    assert.equal(report.summary.undeclaredCount, 1);
    assert.equal(report.laneCounts['equation-core'].undeclared, 1);
  });

  it('recognizes uniform, per-line, typed-parts, and helper declarations', () => {
    const rootDir = fixture({
      'src/lib/modes/equation/sample.ts': `
        type DisplayDetailSection = {
          title: string;
          lines: string[];
          lineKind?: 'text' | 'math';
          lineKinds?: Array<'text' | 'math'>;
          lineParts?: unknown[][];
        };
        declare function mathDetailSection(title: string, lines: string[]): DisplayDetailSection;
        export const a: DisplayDetailSection = { title: 'A', lines: ['x'], lineKind: 'math' };
        export const b: DisplayDetailSection = { title: 'B', lines: ['x'], lineKinds: ['math'] };
        export const c: DisplayDetailSection = { title: 'C', lines: ['x'], lineParts: [[{}]] };
        export const d = mathDetailSection('D', ['x']);
      `,
    });
    const report = scanDetailSegmentRepository({ rootDir });

    assert.equal(report.summary.producerCount, 4);
    assert.equal(report.summary.declaredCount, 4);
    assert.equal(report.summary.undeclaredCount, 0);
  });

  it('pins undeclared fingerprints while ignoring line-only movement', () => {
    const repoPath = 'src/lib/modes/equation/sample.ts';
    const source = `
      type DisplayDetailSection = {
        title: string; lines: string[]; lineKind?: 'text' | 'math';
        lineKinds?: Array<'text' | 'math'>; lineParts?: unknown[][];
      };
      export const section: DisplayDetailSection = { title: 'Proof', lines: ['x=1'] };
    `;
    const rootDir = fixture({ [repoPath]: source });
    const initial = scanDetailSegmentRepository({ rootDir });
    const baseline = buildDetailSegmentBaseline(initial, 'Initial inventory');
    assert.equal(validateDetailSegmentReport(initial, baseline).ok, true);

    rewrite(rootDir, repoPath, `\n\n${source}`);
    assert.equal(validateDetailSegmentReport(
      scanDetailSegmentRepository({ rootDir }),
      baseline,
    ).ok, true);

    rewrite(rootDir, repoPath, source.replace("['x=1']", "['x=2']"));
    const changed = validateDetailSegmentReport(
      scanDetailSegmentRepository({ rootDir }),
      baseline,
    );
    assert.equal(changed.ok, false);
    assert.match(changed.errors.join('\n'), /New or changed undeclared/u);
  });

  it('requires an accepted lower baseline when debt is removed', () => {
    const repoPath = 'src/lib/modes/equation/sample.ts';
    const undeclared = `
      type DisplayDetailSection = {
        title: string; lines: string[]; lineKind?: 'text' | 'math';
        lineKinds?: Array<'text' | 'math'>; lineParts?: unknown[][];
      };
      export const section: DisplayDetailSection = { title: 'Proof', lines: ['x=1'] };
    `;
    const rootDir = fixture({ [repoPath]: undeclared });
    const baseline = buildDetailSegmentBaseline(
      scanDetailSegmentRepository({ rootDir }),
      'Initial inventory',
    );
    rewrite(rootDir, repoPath, undeclared.replace("lines: ['x=1']", "lines: ['x=1'], lineKind: 'math'"));
    const report = scanDetailSegmentRepository({ rootDir });

    assert.equal(validateDetailSegmentReport(report, baseline).ok, false);
    assert.doesNotThrow(() => assertDetailSegmentBaselineUpdateAllowed(report, baseline));
    assert.equal(buildDetailSegmentBaseline(report, 'Migrated the producer').laneFloors['equation-core'], 0);
  });

  it('forbids baseline debt increases', () => {
    const rootDir = fixture({
      'src/lib/modes/equation/sample.ts': `
        type DisplayDetailSection = {
          title: string; lines: string[]; lineKind?: 'text' | 'math';
          lineKinds?: Array<'text' | 'math'>; lineParts?: unknown[][];
        };
        export const a: DisplayDetailSection = { title: 'A', lines: ['x'], lineKind: 'math' };
      `,
    });
    const baseline = buildDetailSegmentBaseline(
      scanDetailSegmentRepository({ rootDir }),
      'No debt',
    );
    rewrite(rootDir, 'src/lib/modes/equation/sample.ts', `
      type DisplayDetailSection = {
        title: string; lines: string[]; lineKind?: 'text' | 'math';
        lineKinds?: Array<'text' | 'math'>; lineParts?: unknown[][];
      };
      export const a: DisplayDetailSection = { title: 'A', lines: ['x'] };
    `);

    assert.throws(
      () => assertDetailSegmentBaselineUpdateAllowed(
        scanDetailSegmentRepository({ rootDir }),
        baseline,
      ),
      /cannot increase equation-core debt/u,
    );
  });
});
