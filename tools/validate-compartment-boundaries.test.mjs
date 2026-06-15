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

  it('rejects library compartment imports from app UI surfaces', () => {
    const cases = [
      {
        repoPath: 'src/lib/modes/calculate.ts',
        text: "import { DisplayPanel } from '../../app/shell/DisplayPanel';\n",
      },
      {
        repoPath: 'src/lib/guide/content.ts',
        text: "import { OoeDiagnosticsPanel } from '../../components/OoeDiagnosticsPanel';\n",
      },
      {
        repoPath: 'src/lib/display/format.ts',
        text: "import '../../styles/app/shell.css';\n",
      },
      {
        repoPath: 'src/lib/calculus/workspace/navigation.ts',
        text: "import { useCalculusRuntime } from '../../../app/runtime/useCalculusRuntime';\n",
      },
      {
        repoPath: 'src/lib/equation/equation-navigation.ts',
        text: "import { EquationWorkspace } from '../../app/workspaces/EquationWorkspace';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app UI target/,
      );
    }
  });

  it('allows the current Calculus workspace app-state Tauri seam', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/calculus/workspace/ode.ts',
      "import { solveOdeNumeric } from '../../app-state/tauri';\n",
    );

    assert.deepEqual(validateCompartmentBoundaries({ rootDir }), {
      sourceFiles: 1,
      ooe: {
        tsFiles: 0,
        rustFiles: 0,
      },
    });
  });

  it('rejects Display imports from OOE lifecycle districts and app runtime', () => {
    const cases = [
      {
        repoPath: 'src/lib/display/result/readback.ts',
        text: "import { recordOoeEvent } from '../../ooe/events/event-outbox';\n",
        pattern: /imports forbidden Display boundary target/,
      },
      {
        repoPath: 'src/lib/display/result/blocks.ts',
        text: "import { buildOoeDiagnosticsInspectorSnapshot } from '../../ooe/diagnostics/diagnostics-inspector';\n",
        pattern: /imports forbidden Display boundary target/,
      },
      {
        repoPath: 'src/lib/display/scheduling/render.ts',
        text: "import { runOoeRuntimeJob } from '../../ooe/runtime-control/runtime-coordinator';\n",
        pattern: /imports forbidden Display boundary target/,
      },
      {
        repoPath: 'src/lib/display/notation/format.ts',
        text: "import { useHistoryDisplayRuntime } from '../../../app/runtime/useHistoryDisplayRuntime';\n",
        pattern: /imports forbidden app UI target/,
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        testCase.pattern,
      );
    }
  });

  it('rejects Guide and Labs imports from private solver districts', () => {
    const cases = [
      {
        repoPath: 'src/lib/guide/examples.ts',
        text: "import { runGuarded } from '../equation/guarded/run';\n",
      },
      {
        repoPath: 'src/lib/labs/experiments.ts',
        text: "import { normalizeExactPowerLogNode } from '../symbolic-engine/power-log/api';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports private solver district/,
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

  it('rejects app runtime imports from app UI, workspace, style, and worker surfaces', () => {
    const cases = [
      {
        repoPath: 'src/app/runtime/useBadShell.ts',
        text: "import { DisplayPanel } from '../shell/DisplayPanel';\n",
        pattern: /imports forbidden app-runtime UI target/,
      },
      {
        repoPath: 'src/app/runtime/useBadWorkspace.ts',
        text: "import { CalculusWorkspace } from '../workspaces/CalculusWorkspace';\n",
        pattern: /imports forbidden app-runtime UI target/,
      },
      {
        repoPath: 'src/app/logic/badComponent.ts',
        text: "import { OoeDiagnosticsPanel } from '../../components/OoeDiagnosticsPanel';\n",
        pattern: /imports forbidden app-runtime UI target/,
      },
      {
        repoPath: 'src/app/logic/badStyle.ts',
        text: "import '../../styles/app/shell.css';\n",
        pattern: /imports forbidden app-runtime UI target/,
      },
      {
        repoPath: 'src/app/runtime/badWorker.ts',
        text: "import { runCalculateWorker } from '../../lib/modes/worker-entrypoints/calculate.worker';\n",
        pattern: /imports forbidden app-runtime worker target/,
      },
      {
        repoPath: 'src/app/runtime/badWorkerClient.ts',
        text: "import { runCalculateInWorker } from '../../lib/modes/worker-clients/calculate-worker-client';\n",
        pattern: /imports forbidden app-runtime worker target/,
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        testCase.pattern,
      );
    }
  });

  it('keeps app runtime OOE imports on the audited exact allowlist', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/runtime/useAllowedOoe.ts',
      [
        "import { isOoeCommitAllowed } from '../../lib/ooe/job-launch/job-contract';",
        "import { reservePendingHistoryTicket } from '../../lib/ooe/job-launch/launch-tickets';",
        "import { markOoeJobStopping } from '../../lib/ooe/job-launch/active-job-registry';",
        "import { runWorkspaceWithOoeProvenance } from '../../lib/ooe/pilots/workspace-pilot';",
        "import { summarizeDisplayOutcome } from '../../lib/ooe/diagnostics/diagnostics-buffer';",
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

  it('rejects app runtime imports from unaudited OOE districts', () => {
    const cases = [
      {
        repoPath: 'src/app/runtime/badRuntimeControl.ts',
        text: "import { runOoeRuntimeJob } from '../../lib/ooe/runtime-control/runtime-coordinator';\n",
      },
      {
        repoPath: 'src/app/logic/badEvents.ts',
        text: "import { recordOoeEvent } from '../../lib/ooe/events/event-outbox';\n",
      },
      {
        repoPath: 'src/app/logic/badDiagnosticsInspector.ts',
        text: "import { buildOoeDiagnosticsInspectorSnapshot } from '../../lib/ooe/diagnostics/diagnostics-inspector';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-runtime OOE target/,
      );
    }
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
