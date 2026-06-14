import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { validateCompartmentBoundaries } from './compartment-boundaries-core.mjs';

function makeRoot() {
  return mkdtempSync(path.join(tmpdir(), 'calcwiz-compartment-boundaries-'));
}

function writeFile(rootDir, repoPath, text) {
  const fullPath = path.join(rootDir, repoPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, text);
}

describe('compartment boundary validation', () => {
  it('accepts the committed repo state', () => {
    const result = validateCompartmentBoundaries();

    assert.ok(result.sourceFiles > 0);
    assert.ok(result.ooe.tsFiles > 0);
    assert.ok(result.ooe.rustFiles > 0);
  });

  it('rejects production source imports from source mirrors', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/engine/math-analysis.ts',
      "import { mirror } from '../../../playground/sources/mirrors/giac-xcas/index';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /references forbidden source-mirror text: playground\/sources/,
    );
  });

  it('rejects source mirror path literals in production source', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/engine/math-analysis.ts',
      "export const forbiddenPath = 'playground/sources/mirrors/giac-xcas';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /references forbidden source-mirror text: playground\/sources/,
    );
  });

  it('rejects shared compute imports from app shell, React, styles, and OOE lifecycle districts', () => {
    const rootDir = makeRoot();
    const cases = [
      {
        repoPath: 'src/lib/algebra/bad-app.ts',
        text: "import { DisplayPanel } from '../../app/shell/DisplayPanel';\n",
        pattern: /imports forbidden shared-compute target/,
      },
      {
        repoPath: 'src/lib/symbolic-engine/bad-react.ts',
        text: "import React from 'react';\n",
        pattern: /imports forbidden shared-compute dependency "react"/,
      },
      {
        repoPath: 'src/lib/engine/bad-styles.ts',
        text: "import '../../styles/app/shell.css';\n",
        pattern: /imports forbidden shared-compute target/,
      },
      {
        repoPath: 'src/lib/engine/bad-ooe.ts',
        text: "import { recordOoeEvent } from '../ooe/events/event-outbox';\n",
        pattern: /imports forbidden shared-compute target/,
      },
    ];

    for (const testCase of cases) {
      const caseRoot = makeRoot();
      writeFile(caseRoot, testCase.repoPath, testCase.text);
      assert.throws(
        () => validateCompartmentBoundaries({ rootDir: caseRoot }),
        testCase.pattern,
      );
    }
  });

  it('rejects app shell imports from private solver districts', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/runtime/useEquationRuntime.ts',
      "import { runGuarded } from '../../lib/equation/guarded/run';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /imports private solver district "\.\.\/\.\.\/lib\/equation\/guarded\/run"/,
    );
  });

  it('allows app shell imports through known public facades and compatibility seams', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/runtime/useEquationRuntime.ts',
      [
        "import { getEquationScreenMeta } from '../../lib/equation/equation-navigation';",
        "import { isCalculusMode } from '../../lib/calculus/calculus-identity';",
        "import { algebraTransformActions } from '../../lib/algebra/algebra-transform-ui';",
        "import { namedVariableEditorLatex } from '../../lib/algebra/named-variable';",
        "import { buildVariableHints } from '../../lib/algebra/variable-hints';",
      ].join('\n'),
    );

    assert.deepEqual(validateCompartmentBoundaries({ rootDir }), {
      sourceFiles: 1,
      ooe: {
        tsFiles: 0,
        rustFiles: 0,
      },
    });
  });

  it('delegates OOE boundary failures to the existing OOE validator', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/ooe/ooe-bridge.ts',
      "import { runCalculateMode } from '../modes/calculate';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /imports unsupported OOE core target "\.\.\/modes\/calculate"/,
    );
  });
});
