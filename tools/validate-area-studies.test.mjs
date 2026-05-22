import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateAreaStudies } from './area-studies-core.mjs';

function makeRootFromRepo() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-area-studies-'));
  mkdirSync(path.join(rootDir, 'playground'), { recursive: true });
  cpSync('playground/area-studies', path.join(rootDir, 'playground/area-studies'), {
    recursive: true,
  });
  return rootDir;
}

describe('area-study structure validation', () => {
  it('accepts the committed area-study templates and active studies', () => {
    assert.equal(validateAreaStudies(), 32);
  });

  it('rejects missing required template headings', () => {
    const rootDir = makeRootFromRepo();
    writeFileSync(
      path.join(rootDir, 'playground/area-studies/templates/lite-synthesis.md'),
      '# Lite Area Synthesis\n\n## Problem\n',
    );

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /lite-synthesis\.md is missing heading "## Evidence"/,
    );
  });

  it('rejects unsupported root clutter', () => {
    const rootDir = makeRootFromRepo();
    writeFileSync(path.join(rootDir, 'playground/area-studies/random-note.md'), 'Nope.\n');

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /unsupported entries: random-note\.md/,
    );
  });

  it('rejects unsupported committed study folders', () => {
    const rootDir = makeRootFromRepo();
    mkdirSync(path.join(rootDir, 'playground/area-studies/studies/random-study'));

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /unsupported studies: random-study/,
    );
  });

  it('rejects missing required study headings', () => {
    const rootDir = makeRootFromRepo();
    writeFileSync(
      path.join(rootDir, 'playground/area-studies/studies/area-poly-rat0/05-synthesis.md'),
      '# Incomplete Synthesis\n\n## Findings\n',
    );

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /05-synthesis\.md is missing heading "## What To Carry Forward"/,
    );
  });

  it('rejects missing template files', () => {
    const rootDir = makeRootFromRepo();
    rmSync(path.join(rootDir, 'playground/area-studies/templates/full-synthesis/08-risks.md'));

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /Missing area-study file: playground\/area-studies\/templates\/full-synthesis\/08-risks\.md/,
    );
  });

  it('rejects missing study files', () => {
    const rootDir = makeRootFromRepo();
    rmSync(path.join(rootDir, 'playground/area-studies/studies/area-poly-rat0/08-risks.md'));

    assert.throws(
      () => validateAreaStudies({ rootDir }),
      /Missing area-study file: playground\/area-studies\/studies\/area-poly-rat0\/08-risks\.md/,
    );
  });
});
