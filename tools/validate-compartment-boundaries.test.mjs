import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
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

function readCurrentManifest() {
  return readFileSync(path.join(process.cwd(), 'src/lib/compartments/manifest.ts'), 'utf8');
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

  it('rejects duplicate or unstable compartment manifest ids', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/compartments/manifest.ts',
      readCurrentManifest().replace("id: 'equation'", "id: 'calculate'"),
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir, sourceFiles: [] }),
      /duplicates compartment id "calculate"/,
    );
  });

  it('rejects OOE-backed manifest entries without fact mappings', () => {
    const rootDir = makeRoot();
    const manifest = readCurrentManifest()
      .replace("      prefixes: ['equation.'],", '')
      .replace(/    ooeFacts: \{\s*\},\n/u, '');
    writeFile(rootDir, 'src/lib/compartments/manifest.ts', manifest);

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir, sourceFiles: [] }),
      /OOE-backed compartment "equation" has no OOE fact mapping/,
    );
  });

  it('rejects manifest entries without owned paths', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/compartments/manifest.ts',
      readCurrentManifest().replace(
        "    ownedPaths: [\n      'src/lib/display/',\n    ],",
        '    ownedPaths: [],',
      ),
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir, sourceFiles: [] }),
      /compartment "display" has no owned paths/,
    );
  });

  it('rejects unknown manifest dependency policies and surface exposure candidates', () => {
    const badPolicyRoot = makeRoot();
    writeFile(
      badPolicyRoot,
      'src/lib/compartments/manifest.ts',
      readCurrentManifest().replace("      'library-no-app-ui',", "      'made-up-policy',"),
    );
    assert.throws(
      () => validateCompartmentBoundaries({ rootDir: badPolicyRoot, sourceFiles: [] }),
      /declares unknown dependency policy "made-up-policy"/,
    );

    const badSurfaceRoot = makeRoot();
    writeFile(
      badSurfaceRoot,
      'src/lib/compartments/manifest.ts',
      readCurrentManifest().replace("    surfaceExposureCandidate: 'future-surface',", "    surfaceExposureCandidate: 'public-api-now',"),
    );
    assert.throws(
      () => validateCompartmentBoundaries({ rootDir: badSurfaceRoot, sourceFiles: [] }),
      /unknown surface exposure candidate "public-api-now"/,
    );
  });

  it('labels validator failures with the source compartment when known', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/lib/engine/bad-ooe.ts',
      "import { recordOoeEvent } from '../ooe/events/event-outbox';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /src\/lib\/engine\/bad-ooe\.ts \[Engine\] imports forbidden shared-compute target/,
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
      {
        repoPath: 'src/lib/engine/bad-app-state.ts',
        text: "import { loadCalculatorMemorySnapshot } from '../app-state/tauri';\n",
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

  it('rejects app shell, workspace, and normal component imports from OOE internals', () => {
    const cases = [
      {
        repoPath: 'src/AppMain.tsx',
        text: "import { hasActivePendingHistoryTickets } from './lib/ooe/job-launch/launch-tickets';\n",
      },
      {
        repoPath: 'src/app/shell/BadOoeRuntimePanel.tsx',
        text: "import { runOoeRuntimeJob } from '../../lib/ooe/runtime-control/runtime-coordinator';\n",
      },
      {
        repoPath: 'src/app/workspaces/BadOoeWorkspace.tsx',
        text: "import { buildPendingHistoryTicket } from '../../lib/ooe/job-launch/launch-tickets';\n",
      },
      {
        repoPath: 'src/components/BadOoeBridge.tsx',
        text: "import type { OoeBridgeEvent } from '../lib/ooe/bridge-schema/ooe-bridge';\n",
      },
      {
        repoPath: 'src/components/BadOoeEvents.tsx',
        text: "import { recordOoeEvent } from '../lib/ooe/events/event-outbox';\n",
      },
      {
        repoPath: 'src/components/BadOoeDiagnostics.tsx',
        text: "import { listOoeDiagnostics } from '../lib/ooe/diagnostics/diagnostics-buffer';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-surface OOE target/,
      );
    }
  });

  it('allows the developer OOE diagnostics panel to import only the panel seam', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/components/OoeDiagnosticsPanel.tsx',
      "import { buildOoeDiagnosticsPanelSnapshot } from '../lib/ooe/diagnostics/panel-surface';\n",
    );

    assert.deepEqual(validateCompartmentBoundaries({ rootDir }), {
      sourceFiles: 1,
      ooe: {
        tsFiles: 0,
        rustFiles: 0,
      },
    });
  });

  it('rejects the developer OOE diagnostics panel importing old OOE internals', () => {
    const cases = [
      {
        text: "import { listActiveOoeJobs } from '../lib/ooe/job-launch/active-job-registry';\n",
      },
      {
        text: "import { listOoeDiagnostics } from '../lib/ooe/diagnostics/diagnostics-buffer';\n",
      },
      {
        text: "import { listOoeEvents } from '../lib/ooe/events/event-outbox';\n",
      },
      {
        text: "import type { OoeBridgeEvent } from '../lib/ooe/bridge-schema/ooe-bridge';\n",
      },
      {
        text: "import { runOoeRuntimeJob } from '../lib/ooe/runtime-control/runtime-coordinator';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, 'src/components/OoeDiagnosticsPanel.tsx', testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-surface OOE target/,
      );
    }
  });

  it('rejects normal components importing the OOE diagnostics panel seam', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/components/BadOoeDiagnosticsPanelReader.tsx',
      "import { buildOoeDiagnosticsPanelSnapshot } from '../lib/ooe/diagnostics/panel-surface';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /imports forbidden app-surface OOE target/,
    );
  });

  it('allows the shell error boundary to record compartment UI failures through the facade', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/shell/CompartmentErrorBoundary.tsx',
      [
        "import type { CompartmentId } from '../../lib/compartments/manifest';",
        "import { recordCompartmentUiBoundaryError } from '../../lib/compartments/ui-boundary';",
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

  it('rejects the shell error boundary importing compartment UI-boundary record internals directly', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/shell/CompartmentErrorBoundary.tsx',
      "import { recordCompartmentUiBoundaryError } from '../../lib/compartments/ui-boundary-records';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /imports forbidden app-surface compartment target/,
    );
  });

  it('rejects normal components importing compartment UI-boundary record internals', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/components/BadCompartmentRecord.tsx',
      "import { recordCompartmentUiBoundaryError } from '../lib/compartments/ui-boundary-records';\n",
    );

    assert.throws(
      () => validateCompartmentBoundaries({ rootDir }),
      /imports forbidden app-surface compartment target/,
    );
  });

  it('rejects workspace and component imports from private solver districts', () => {
    const cases = [
      {
        repoPath: 'src/app/workspaces/BadEquationWorkspace.tsx',
        text: "import { runGuardedEquationSolve } from '../../lib/equation/guarded/run';\n",
      },
      {
        repoPath: 'src/components/BadSymbolicWidget.tsx',
        text: "import { normalizeExactPowerLogNode } from '../lib/symbolic-engine/power-log/api';\n",
      },
      {
        repoPath: 'src/app/shell/BadCalculusShell.tsx',
        text: "import { evaluateBodyAt } from '../../lib/calculus/engine/shared';\n",
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

  it('allows workspace and component imports through public metadata and Display facades', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/workspaces/AllowedWorkspace.tsx',
      [
        "import { MathEditor } from '../../components/MathEditor';",
        "import { cycleLimitTargetKind } from '../../lib/calculus/calculus-workbench';",
        "import type { CalculateMenuEntry } from '../../lib/modes/calculate-navigation';",
        "import { SPECIAL_ANGLE_REFERENCE } from '../../lib/trigonometry/angles';",
      ].join('\n'),
    );
    writeFile(
      rootDir,
      'src/components/AllowedDisplayComponent.tsx',
      [
        "import { MathStatic } from './MathStatic';",
        "import { formatMathTextForDisplay } from '../lib/display/math-notation';",
        "import { namedVariableEditorLatex } from '../lib/algebra/named-variable';",
      ].join('\n'),
    );

    assert.deepEqual(validateCompartmentBoundaries({ rootDir }), {
      sourceFiles: 2,
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
        "import { summarizeOoeProvenanceDisplayOutcome } from '../../lib/ooe/pilots/provenance-summary';",
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

  it('allows app runtime imports from workspace runtime-request facades and public seams', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/runtime/useWorkspaceRuntime.ts',
      [
        "import { parseTrigDraft } from '../../lib/trigonometry/runtime-request';",
        "import { parseStatisticsDraft } from '../../lib/statistics/runtime-request';",
        "import { parseGeometryDraft } from '../../lib/geometry/runtime-request';",
        "import { dispatchMatrixEditorLatex } from '../../lib/linear-algebra/runtime-request';",
        "import { getTrigRouteMeta } from '../../lib/trigonometry/navigation';",
        "import { defaultStatisticsDraftForScreen } from '../../lib/statistics/examples';",
        "import { runGeometryMode } from '../../lib/modes/geometry';",
        "import { createCoreDraftState } from '../../lib/modes/core-mode';",
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

  it('rejects app runtime imports from workspace request-building internals', () => {
    const cases = [
      {
        repoPath: 'src/app/runtime/badLinearAlgebraDispatch.ts',
        text: "import { dispatchMatrixEditorLatex } from '../../lib/linear-algebra/editor-dispatch';\n",
      },
      {
        repoPath: 'src/app/runtime/badLinearAlgebraNamedValues.ts',
        text: "import { matrixValueById } from '../../lib/linear-algebra/named-values';\n",
      },
      {
        repoPath: 'src/app/runtime/badTrigParser.ts',
        text: "import { parseTrigDraft } from '../../lib/trigonometry/parser';\n",
      },
      {
        repoPath: 'src/app/runtime/badTrigRuntimeInput.ts',
        text: "import { buildTrigonometryOoeInputRevisionId } from '../../lib/trigonometry/runtime-input';\n",
      },
      {
        repoPath: 'src/app/runtime/badTrigSerializer.ts',
        text: "import { serializeTrigRequest } from '../../lib/trigonometry/serializer';\n",
      },
      {
        repoPath: 'src/app/runtime/badStatisticsParser.ts',
        text: "import { parseStatisticsDraft } from '../../lib/statistics/parser';\n",
      },
      {
        repoPath: 'src/app/runtime/badStatisticsRuntimeInput.ts',
        text: "import { buildStatisticsOoeInputRevisionId } from '../../lib/statistics/runtime-input';\n",
      },
      {
        repoPath: 'src/app/runtime/badStatisticsShared.ts',
        text: "import { statisticsRequestToWorkingSource } from '../../lib/statistics/shared';\n",
      },
      {
        repoPath: 'src/app/runtime/badGeometryParser.ts',
        text: "import { parseGeometryDraft } from '../../lib/geometry/parser';\n",
      },
      {
        repoPath: 'src/app/runtime/badGeometryRuntimeInput.ts',
        text: "import { buildGeometryOoeInputRevisionId } from '../../lib/geometry/runtime-input';\n",
      },
      {
        repoPath: 'src/app/runtime/badGeometrySerializer.ts',
        text: "import { serializeGeometryRequest } from '../../lib/geometry/serializer';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-runtime workspace request target/,
      );
    }
  });

  it('rejects app runtime imports from workspace math-core internals', () => {
    const cases = [
      {
        repoPath: 'src/app/runtime/badLinearAlgebraMatrixCore.ts',
        text: "import { addMatrices } from '../../lib/linear-algebra/matrix';\n",
      },
      {
        repoPath: 'src/app/runtime/badTrigCore.ts',
        text: "import { runTrigCoreDraft } from '../../lib/trigonometry/core';\n",
      },
      {
        repoPath: 'src/app/runtime/badStatisticsEngine.ts',
        text: "import { runStatisticsEngine } from '../../lib/statistics/engine';\n",
      },
      {
        repoPath: 'src/app/runtime/badGeometrySolveMissing.ts',
        text: "import { solveSquareMissing } from '../../lib/geometry/solve-missing/square';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-runtime workspace internal target/,
      );
    }
  });

  it('allows app runtime imports from audited app-state and variable public seams', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/app/runtime/useAllowedAppState.ts',
      [
        "import { bootApp } from '../../lib/app-state/persistence';",
        "import { buildVariableMemoryDetailSections } from '../../lib/algebra/variable-memory';",
        "import { buildVariableHints } from '../../lib/algebra/variable-hints';",
        "import { namedVariableEditorLatex } from '../../lib/algebra/named-variable';",
        "import type { HistoryEntry } from '../../types/calculator';",
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

  it('rejects app runtime imports from app-state schemas and private variable-memory surfaces', () => {
    const cases = [
      {
        repoPath: 'src/app/runtime/badTauriPersistence.ts',
        text: "import { loadCalculatorMemorySnapshot } from '../../lib/app-state/tauri';\n",
        pattern: /imports forbidden app-runtime app-state target/,
      },
      {
        repoPath: 'src/app/runtime/badSchemas.ts',
        text: "import { calculatorMemorySchema } from '../../lib/app-state/schemas';\n",
        pattern: /imports forbidden app-runtime app-state target/,
      },
      {
        repoPath: 'src/app/logic/badVariableMemoryPrivate.ts',
        text: "import { parseStoredVariableValue } from '../../lib/algebra/variable-memory/validation';\n",
        pattern: /imports forbidden app-runtime variable-memory target/,
      },
      {
        repoPath: 'src/app/logic/badVariableMemoryStore.ts',
        text: "import { upsertVariableMemoryEntry } from '../../lib/algebra/variable-memory-store';\n",
        pattern: /imports forbidden app-runtime variable-memory target/,
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

  it('rejects app shell and components importing app-state persistence directly', () => {
    const cases = [
      {
        repoPath: 'src/app/shell/BadPersistencePanel.tsx',
        text: "import { loadCalculatorMemorySnapshot } from '../../lib/app-state/tauri';\n",
      },
      {
        repoPath: 'src/components/BadPersistencePanel.tsx',
        text: "import { loadCalculatorMemorySnapshot } from '../lib/app-state/tauri';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden app-surface persistence target/,
      );
    }
  });

  it('allows AppMain to import the app-runtime persistence shell', () => {
    const rootDir = makeRoot();
    writeFile(
      rootDir,
      'src/AppMain.tsx',
      "import { useAppPersistenceRuntime } from './app/runtime/useAppPersistenceRuntime';\n",
    );

    assert.deepEqual(validateCompartmentBoundaries({ rootDir }), {
      sourceFiles: 1,
      ooe: {
        tsFiles: 0,
        rustFiles: 0,
      },
    });
  });

  it('rejects AppMain direct app-state and variable-memory-store bootstrap imports', () => {
    const cases = [
      {
        repoPath: 'src/AppMain.tsx',
        text: "import { loadCalculatorMemorySnapshot } from './lib/app-state/tauri';\n",
      },
      {
        repoPath: 'src/AppMain.tsx',
        text: "import { bootApp } from './lib/app-state/persistence';\n",
      },
      {
        repoPath: 'src/AppMain.tsx',
        text: "import { upsertStoredVariableValue } from './lib/algebra/variable-memory-store';\n",
      },
    ];

    for (const testCase of cases) {
      const rootDir = makeRoot();
      writeFile(rootDir, testCase.repoPath, testCase.text);

      assert.throws(
        () => validateCompartmentBoundaries({ rootDir }),
        /imports forbidden AppMain bootstrap target/,
      );
    }
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
      {
        repoPath: 'src/app/logic/badDiagnosticsBuffer.ts',
        text: "import { summarizeDisplayOutcome } from '../../lib/ooe/diagnostics/diagnostics-buffer';\n",
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
