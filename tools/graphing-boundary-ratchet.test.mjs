import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateGraphingBoundaries } from './graphing-boundary-ratchet.mjs';

function rootWith(repoPath, text) {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-graph-boundary-'));
  const absolute = path.join(rootDir, repoPath);
  mkdirSync(path.dirname(absolute), { recursive: true });
  writeFileSync(absolute, text);
  return rootDir;
}

describe('Graphing boundary ratchet', () => {
  it('accepts the committed Graph production source', () => {
    assert.doesNotThrow(() => validateGraphingBoundaries());
  });

  it('rejects Three.js outside the private adapter district', () => {
    const rootDir = rootWith('src/lib/graphing/scene.ts', "import * as THREE from 'three';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir }), /imports Three\.js outside/u);
  });

  it('allows Three.js only inside the private adapter district', () => {
    const rootDir = rootWith(
      'src/lib/graphing/renderers/three/renderer.ts',
      "import * as THREE from 'three';\nexport const scene = new THREE.Scene();\n",
    );
    assert.doesNotThrow(() => validateGraphingBoundaries({ rootDir }));
  });

  it('rejects app UI and private solver ownership', () => {
    const appRoot = rootWith('src/lib/graphing/runtime.ts', "import { AppMain } from '../../AppMain';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir: appRoot }), /imports app UI state/u);

    const solverRoot = rootWith('src/lib/graphing/parser.ts', "import { solve } from '../equation/shared-solve';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir: solverRoot }), /imports private solver ownership/u);
  });

  it('allows only the reviewed domain-neutral complex seam', () => {
    const publicRoot = rootWith('src/lib/graphing/sampling/complex.ts',
      "import { evaluate } from '../../equation/complex-domain-public';\n");
    assert.doesNotThrow(() => validateGraphingBoundaries({ rootDir: publicRoot }));
    const privateRoot = rootWith('src/lib/graphing/sampling/complex.ts',
      "import { evaluate } from '../../equation/complex/numeric-evaluator';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir: privateRoot }), /imports private solver ownership/u);
  });

  it('keeps OOE in its future Graph-owned district and contracts renderer-neutral', () => {
    const ooeRoot = rootWith('src/lib/graphing/sampling.ts', "import { launch } from '../ooe/job-launch/launch';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir: ooeRoot }), /imports OOE outside/u);

    const contractRoot = rootWith('src/lib/graphing/contracts/renderer.ts', "import React from 'react';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir: contractRoot }), /leaks runtime or renderer ownership/u);
  });

  it('rejects exactLatex as Graph authority', () => {
    const rootDir = rootWith('src/lib/graphing/contracts/document.ts', "export const exactLatex = 'x';\n");
    assert.throws(() => validateGraphingBoundaries({ rootDir }), /forbidden exactLatex authority/u);
  });

  it('keeps authored LaTeX out of structured relation classification', () => {
    const rootDir = rootWith(
      'src/lib/graphing/parser/classifier.ts',
      "export const classify = (sourceLatex) => sourceLatex.includes('=');\n",
    );
    assert.throws(
      () => validateGraphingBoundaries({ rootDir }),
      /reads authored LaTeX inside the structured classifier/u,
    );
  });

  it('keeps evaluator and sampling downstream of structured relation authority', () => {
    const sourceRoot = rootWith(
      'src/lib/graphing/sampling/explicit.ts',
      "export const sample = (sourceLatex) => sourceLatex;\n",
    );
    assert.throws(
      () => validateGraphingBoundaries({ rootDir: sourceRoot }),
      /reads authored LaTeX after GraphRelationIR/u,
    );

    const parserRoot = rootWith(
      'src/lib/graphing/evaluator/compile.ts',
      "import { ComputeEngine } from '@cortex-js/compute-engine';\n",
    );
    assert.throws(
      () => validateGraphingBoundaries({ rootDir: parserRoot }),
      /reparses authoring source after GraphRelationIR/u,
    );
  });
});
