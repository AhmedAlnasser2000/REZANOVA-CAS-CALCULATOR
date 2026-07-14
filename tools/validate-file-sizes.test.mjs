import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import {
  DEFAULT_MAX_LINES,
  TEST_MAX_LINES,
  baselineCapForLines,
  defaultMaxLinesForPath,
  updateBaseline,
  validateFileSizes,
} from './file-sizes-core.mjs';

function makeRoot() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-file-sizes-'));
  mkdirSync(path.join(rootDir, 'src'), { recursive: true });
  mkdirSync(path.join(rootDir, 'tools'), { recursive: true });
  return rootDir;
}

function writeFile(rootDir, repoPath, text) {
  const fullPath = path.join(rootDir, repoPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

function fileWithLines(lineCount) {
  return `${Array.from({ length: lineCount }, (_, index) => `const line${index} = ${index};`).join('\n')}\n`;
}

describe('file-size ratchet validation', () => {
  it('accepts the committed repo state against the committed baseline', () => {
    const result = validateFileSizes();

    assert.ok(result.files > 0);
    assert.ok(result.baselineEntries > 0);
  });

  it('accepts files at or under the default cap without a baseline entry', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/small.ts', fileWithLines(DEFAULT_MAX_LINES));

    const result = validateFileSizes({ rootDir, baseline: {} });
    assert.equal(result.files, 1);
  });

  it('rejects a file over the default cap with no baseline entry', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/grown.ts', fileWithLines(DEFAULT_MAX_LINES + 1));

    assert.throws(
      () => validateFileSizes({ rootDir, baseline: {} }),
      /src\/grown\.ts has 1001 lines, exceeding its cap of 1000/,
    );
  });

  it('allows test files up to 1500 lines while retaining the production cap', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/large.test.ts', fileWithLines(TEST_MAX_LINES));
    writeFile(rootDir, 'src/large.ui.test.tsx', fileWithLines(TEST_MAX_LINES));
    writeFile(rootDir, 'src/widget.spec.ts', fileWithLines(TEST_MAX_LINES));
    writeFile(rootDir, 'src/__tests__/fixture.ts', fileWithLines(TEST_MAX_LINES));
    writeFile(rootDir, 'src/production.ts', fileWithLines(DEFAULT_MAX_LINES));

    assert.equal(validateFileSizes({ rootDir, baseline: {} }).files, 5);
    assert.equal(defaultMaxLinesForPath('src/large.test.ts'), TEST_MAX_LINES);
    assert.equal(defaultMaxLinesForPath('src/production.ts'), DEFAULT_MAX_LINES);

    writeFile(rootDir, 'src/large.test.ts', fileWithLines(TEST_MAX_LINES + 1));
    assert.throws(
      () => validateFileSizes({ rootDir, baseline: {} }),
      /src\/large\.test\.ts has 1501 lines, exceeding its cap of 1500/,
    );
  });

  it('accepts a large file within its baseline cap and rejects it over the cap', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/big.ts', fileWithLines(2000));

    const baseline = { 'src/big.ts': 2000 };
    assert.equal(validateFileSizes({ rootDir, baseline }).files, 1);

    writeFile(rootDir, 'src/big.ts', fileWithLines(2001));
    assert.throws(
      () => validateFileSizes({ rootDir, baseline }),
      /src\/big\.ts has 2001 lines, exceeding its cap of 2000/,
    );
  });

  it('rejects stale baseline entries for deleted files', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/kept.ts', fileWithLines(10));

    assert.throws(
      () => validateFileSizes({ rootDir, baseline: { 'src/gone.ts': 1500 } }),
      /lists "src\/gone\.ts" but that file does not exist/,
    );
  });

  it('ignores golden corpus and generated catalog files', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/lib/__golden__/corpus.ts', fileWithLines(5000));
    writeFile(rootDir, 'src/lib/labs/generated-catalog.ts', fileWithLines(5000));
    writeFile(rootDir, 'src/ok.ts', fileWithLines(10));

    const result = validateFileSizes({ rootDir, baseline: {} });
    assert.equal(result.files, 1);
  });

  it('update lowers caps when files shrink and never raises them', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/shrunk.ts', fileWithLines(1100));
    writeFile(rootDir, 'src/grown.ts', fileWithLines(3000));

    const previous = {
      'src/shrunk.ts': 2500,
      'src/grown.ts': 2000,
    };

    const result = updateBaseline({ rootDir, baseline: previous, write: false });

    assert.equal(result.baseline['src/shrunk.ts'], baselineCapForLines(1100));
    assert.equal(result.baseline['src/grown.ts'], 2000);
    assert.equal(result.lowered, 1);
  });

  it('update removes entries for deleted files and files back under the default cap', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/now-small.ts', fileWithLines(100));

    const previous = {
      'src/now-small.ts': 1200,
      'src/deleted.ts': 1500,
    };

    const result = updateBaseline({ rootDir, baseline: previous, write: false });

    assert.deepEqual(result.baseline, {});
    assert.equal(result.removed, 2);
  });

  it('update removes a test baseline entry after it shrinks to the test-file cap', () => {
    const rootDir = makeRoot();
    writeFile(rootDir, 'src/now-small.test.ts', fileWithLines(TEST_MAX_LINES));

    const result = updateBaseline({
      rootDir,
      baseline: { 'src/now-small.test.ts': 1800 },
      write: false,
    });

    assert.deepEqual(result.baseline, {});
    assert.equal(result.removed, 1);
  });
});
