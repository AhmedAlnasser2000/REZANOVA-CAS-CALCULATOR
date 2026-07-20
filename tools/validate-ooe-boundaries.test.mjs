import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateOoeBoundaries } from './ooe-boundaries-core.mjs';

function makeRoot() {
  const rootDir = mkdtempSync(path.join(tmpdir(), 'calcwiz-ooe-boundaries-'));
  mkdirSync(path.join(rootDir, 'src/lib/ooe'), { recursive: true });
  mkdirSync(path.join(rootDir, 'src-tauri/src/ooe'), { recursive: true });
  return rootDir;
}

function writeFile(rootDir, repoPath, text) {
  const fullPath = path.join(rootDir, repoPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

describe('OOE boundary validation', () => {
  it('accepts the committed OOE import graph', () => {
    const result = validateOoeBoundaries();

    assert.ok(result.tsFiles > 0);
    assert.ok(result.rustFiles > 0);
  });

  it('rejects Rust OOE dependencies outside the OOE module boundary', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src-tauri/src/ooe/types.rs',
      [
        'use crate::app_state::PersistedState;',
        'use serde::{Deserialize, Serialize};',
      ].join('\n'),
    );

    assert.throws(
      () => validateOoeBoundaries({ rootDir }),
      /imports unsupported Rust OOE dependency "crate::app_state::PersistedState"/,
    );
  });

  it('rejects TypeScript OOE core imports from mode or UI runtime code', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/ooe-bridge.ts',
      "import { runCalculateMode } from '../modes/calculate';\n",
    );

    assert.throws(
      () => validateOoeBoundaries({ rootDir }),
      /imports unsupported OOE core target "\.\.\/modes\/calculate"/,
    );
  });

  it('allows OOE diagnostics to consume the public canonical result facade', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/diagnostics-buffer.ts',
      "import { resolveCanonicalResultForConsumer } from '../result-contract';\n",
    );
    writeFile(
      rootDir,
      'src/lib/result-contract.ts',
      'export const resolveCanonicalResultForConsumer = () => undefined;\n',
    );

    assert.deepEqual(validateOoeBoundaries({ rootDir }), {
      tsFiles: 1,
      rustFiles: 0,
    });

    writeFile(
      rootDir,
      'src/lib/ooe/diagnostics-buffer.ts',
      "import { resolveCanonicalResultForConsumer } from '../result-contract/consumer';\n",
    );
    writeFile(
      rootDir,
      'src/lib/result-contract/consumer.ts',
      'export const resolveCanonicalResultForConsumer = () => undefined;\n',
    );

    assert.deepEqual(validateOoeBoundaries({ rootDir }), {
      tsFiles: 1,
      rustFiles: 0,
    });
  });

  it('accepts TypeScript OOE pilots importing their narrow runtime allowlist', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/table-pilot.ts',
      [
        "import type { TableModeResult } from '../modes/table-core';",
        "import { buildOoeRuntimeEnvelope } from './runtime-envelope';",
      ].join('\n'),
    );
    writeFile(
      rootDir,
      'src/lib/ooe/equation-pilot.ts',
      "import { finalizeEquationCanonicalRuntimeOutcome } from '../equation/equation-solve-result';\n",
    );

    assert.deepEqual(validateOoeBoundaries({ rootDir }), {
      tsFiles: 2,
      rustFiles: 0,
    });
  });

  it('rejects TypeScript OOE pilots importing React or UI surfaces', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/expression-pilot.ts',
      "import React from 'react';\n",
    );

    assert.throws(
      () => validateOoeBoundaries({ rootDir }),
      /imports forbidden OOE dependency "react"/,
    );
  });

  it('rejects TypeScript OOE pilots importing Playground or source-mirror surfaces', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/equation-pilot.ts',
      "import { validateSourceMirrors } from '../../../tools/source-mirrors-core.mjs';\n",
    );

    assert.throws(
      () => validateOoeBoundaries({ rootDir }),
      /references forbidden OOE boundary text: source-mirrors/,
    );
  });

  it('rejects literal memory and source-mirror references in OOE production code', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/trace.ts',
      "export const bad = '.memory and playground/sources are not runtime inputs';\n",
    );

    assert.throws(
      () => validateOoeBoundaries({ rootDir }),
      /references forbidden OOE boundary text: \.memory, playground\/sources/,
    );
  });
});
