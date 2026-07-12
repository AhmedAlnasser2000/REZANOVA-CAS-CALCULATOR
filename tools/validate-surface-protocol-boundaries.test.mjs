import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateSurfaceProtocolBoundaries } from './surface-protocol-boundaries-core.mjs';

function makeRoot() {
  return mkdtempSync(path.join(tmpdir(), 'calcwiz-surface-protocol-'));
}

function writeFile(rootDir, repoPath, text) {
  const fullPath = path.join(rootDir, repoPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

describe('Surface Protocol boundary validation', () => {
  it('accepts the committed Surface Protocol production boundary', () => {
    assert.ok(validateSurfaceProtocolBoundaries().files >= 6);
  });

  it('allows only the curated Order of Execution event adapter seam', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/surface-protocol/events.ts',
      "import { listOoeEvents } from '../ooe/events/event-outbox';\n",
    );
    writeFile(
      rootDir,
      'src/lib/surface-protocol/queries.ts',
      "import { listOoeEvents } from '../ooe/events/event-outbox';\n",
    );

    assert.throws(
      () => validateSurfaceProtocolBoundaries({ rootDir }),
      /queries\.ts imports forbidden Surface dependency/,
    );
  });

  it('allows only the DTO mapper to read the neutral canonical consumer seam', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/surface-protocol/dto.ts',
      "import { resolveCanonicalResultForConsumer } from '../result-contract/consumer';\n",
    );
    assert.deepEqual(validateSurfaceProtocolBoundaries({ rootDir }), { files: 1 });

    writeFile(
      rootDir,
      'src/lib/surface-protocol/queries.ts',
      "import { resolveCanonicalResultForConsumer } from '../result-contract/consumer';\n",
    );
    assert.throws(
      () => validateSurfaceProtocolBoundaries({ rootDir }),
      /queries\.ts imports forbidden Surface dependency/,
    );
  });

  it('allows the policy registry to name blocked internal concepts', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/surface-protocol/policy.ts',
      [
        "export const blocked = 'DisplayBlock MathJSON HistoryEntry HTMLElement /home/ahmed';",
        "export const result = 'runHostCommand';",
      ].join('\n'),
    );

    assert.deepEqual(validateSurfaceProtocolBoundaries({ rootDir }), {
      files: 1,
    });
  });

  it('rejects app-state schemas, React, DOM objects, and local paths', () => {
    const cases = [
      {
        repoPath: 'src/lib/surface-protocol/bad-app-state.ts',
        text: "import { appStateSchema } from '../app-state/schemas';\n",
        pattern: /imports forbidden Surface dependency/,
      },
      {
        repoPath: 'src/lib/surface-protocol/bad-react.ts',
        text: "import React from 'react';\n",
        pattern: /imports forbidden package dependency/,
      },
      {
        repoPath: 'src/lib/surface-protocol/bad-dom.ts',
        text: 'export type Bad = HTMLElement;\n',
        pattern: /DOM objects/,
      },
      {
        repoPath: 'src/lib/surface-protocol/bad-path.ts',
        text: "export const bad = '/home/ahmed/secret';\n",
        pattern: /local filesystem paths/,
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);
      assert.throws(
        () => validateSurfaceProtocolBoundaries({ rootDir }),
        testCase.pattern,
      );
    }
  });

  it('rejects Display block, MathJSON, and host-command leakage', () => {
    const cases = [
      {
        repoPath: 'src/lib/surface-protocol/bad-display.ts',
        text: 'export type BadDisplay = DisplayBlock;\n',
        pattern: /Display block trees/,
      },
      {
        repoPath: 'src/lib/surface-protocol/bad-mathjson.ts',
        text: 'export type BadTree = MathJSON;\n',
        pattern: /MathJSON trees/,
      },
      {
        repoPath: 'src/lib/surface-protocol/bad-host-command.ts',
        text: 'export const runHostCommand = () => null;\n',
        pattern: /host commands/,
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);
      assert.throws(
        () => validateSurfaceProtocolBoundaries({ rootDir }),
        testCase.pattern,
      );
    }
  });
});
