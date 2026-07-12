const exact = (...values) => values.map((value) => ({ kind: 'exact', value }));
const prefix = (...values) => values.map((value) => ({ kind: 'prefix', value }));

export const DISPLAY_CONTRACT_LANES = [
  {
    id: 'history',
    matchers: exact(
      'src/app/runtime/historyDisplayEntry.ts',
      'src/app/runtime/useHistoryDisplayRuntime.ts',
      'src/app/shell/HistoryPage.tsx',
    ),
  },
  {
    id: 'app-runtime',
    matchers: prefix('src/app/logic/', 'src/app/runtime/'),
  },
  {
    id: 'app-display',
    matchers: [
      ...prefix('src/app/shell/display-panel/'),
      ...exact(
        'src/AppMain.tsx',
        'src/app/shell/DisplayPanel.tsx',
        'src/app/shell/FormulaViewerPage.tsx',
      ),
    ],
  },
  {
    id: 'app-shell',
    matchers: prefix('src/app/shell/', 'src/app/workspaces/', 'src/components/'),
  },
  {
    id: 'result-contract',
    matchers: prefix('src/lib/result-contract/'),
  },
  {
    id: 'display-read-model',
    matchers: prefix('src/lib/display/'),
  },
  {
    id: 'surface-protocol',
    matchers: prefix('src/lib/surface-protocol/'),
  },
  {
    id: 'app-state',
    matchers: prefix('src/lib/app-state/'),
  },
  {
    id: 'history-replay',
    matchers: prefix('src/lib/history-replay/'),
  },
  {
    id: 'golden-evidence',
    matchers: prefix('src/lib/__golden__/'),
  },
  {
    id: 'anti-regression-evidence',
    matchers: prefix('src/lib/anti-regression/', 'src/lib/modes/runtime-probes/'),
  },
  {
    id: 'equation',
    matchers: [
      ...prefix('src/lib/equation/', 'src/lib/modes/equation'),
      ...exact(
        'src/lib/modes/worker-clients/equation-worker-client.ts',
        'src/lib/modes/worker-entrypoints/equation.worker.ts',
      ),
    ],
  },
  {
    id: 'calculate',
    matchers: [
      ...prefix('src/lib/modes/calculate/'),
      ...exact(
        'src/lib/modes/worker-clients/calculate-worker-client.ts',
        'src/lib/modes/worker-entrypoints/calculate.worker.ts',
      ),
    ],
  },
  {
    id: 'calculus',
    matchers: [
      ...prefix('src/lib/calculus/', 'src/lib/modes/calculus'),
      ...exact(
        'src/lib/modes/worker-clients/calculus-worker-client.ts',
        'src/lib/modes/worker-entrypoints/calculus.worker.ts',
      ),
    ],
  },
  {
    id: 'symbolic-limits',
    matchers: prefix('src/lib/symbolic-engine/limits/'),
  },
  {
    id: 'symbolic-integration',
    matchers: prefix('src/lib/symbolic-engine/integration/'),
  },
  {
    id: 'symbolic-core',
    matchers: prefix('src/lib/symbolic-engine/'),
  },
  {
    id: 'trigonometry',
    matchers: [
      ...prefix('src/lib/trigonometry/', 'src/lib/modes/trigonometry'),
      ...exact(
        'src/lib/modes/worker-clients/trigonometry-worker-client.ts',
        'src/lib/modes/worker-entrypoints/trigonometry.worker.ts',
      ),
    ],
  },
  {
    id: 'geometry',
    matchers: [
      ...prefix('src/lib/geometry/', 'src/lib/modes/geometry'),
      ...exact(
        'src/lib/modes/worker-clients/geometry-worker-client.ts',
        'src/lib/modes/worker-entrypoints/geometry.worker.ts',
      ),
    ],
  },
  {
    id: 'statistics',
    matchers: [
      ...prefix('src/lib/statistics/', 'src/lib/modes/statistics'),
      ...exact(
        'src/lib/modes/worker-clients/statistics-worker-client.ts',
        'src/lib/modes/worker-entrypoints/statistics.worker.ts',
      ),
    ],
  },
  {
    id: 'matrix',
    matchers: [
      ...prefix(
        'src/lib/modes/matrix',
        'src/lib/modes/worker-clients/matrix-worker-client',
        'src/lib/modes/worker-entrypoints/matrix.worker',
      ),
      ...exact('src/app/workspaces/MatrixWorkspace.tsx'),
    ],
  },
  {
    id: 'vector',
    matchers: [
      ...prefix(
        'src/lib/modes/vector',
        'src/lib/modes/worker-clients/vector-worker-client',
        'src/lib/modes/worker-entrypoints/vector.worker',
      ),
      ...exact('src/app/workspaces/VectorWorkspace.tsx'),
    ],
  },
  {
    id: 'linear-algebra-shared',
    matchers: prefix(
      'src/lib/linear-algebra/',
      'src/lib/modes/linear-algebra',
      'src/lib/modes/worker-clients/linear-algebra-worker-client-core',
      'src/lib/modes/worker-entrypoints/linear-algebra-worker-contract',
    ),
  },
  {
    id: 'table',
    matchers: [
      ...prefix('src/lib/modes/table'),
      ...exact(
        'src/lib/engine/math-engine/table.ts',
        'src/lib/modes/worker-clients/table-worker-client.ts',
        'src/lib/modes/worker-entrypoints/table.worker.ts',
      ),
    ],
  },
  {
    id: 'shared-algebra',
    matchers: prefix('src/lib/algebra/'),
  },
  {
    id: 'engine-core',
    matchers: prefix('src/lib/engine/', 'src/lib/numeric/'),
  },
  {
    id: 'kernel-runtime',
    matchers: prefix('src/lib/kernel/'),
  },
  {
    id: 'ooe-observability',
    matchers: prefix('src/lib/ooe/'),
  },
  {
    id: 'shared-types',
    matchers: prefix('src/types/'),
  },
];

export const CANONICAL_PROJECTION_REGISTRATIONS = [
  {
    id: 'canonical-result-display-projection-v1',
    owner: 'canonical-result-contract',
    rationale: 'One validated adapter derives compatibility DisplayOutcome fields from a canonical result document.',
    matchers: exact('src/lib/result-contract/projection.ts'),
    functions: ['projectCanonicalResultToDisplayOutcome'],
  },
  {
    id: 'canonical-result-consumer-resolution-v1',
    owner: 'canonical-result-contract',
    rationale: 'Consumers validate and prefer native canonical truth, projecting typed compatibility outcomes only when native truth is absent.',
    matchers: exact('src/lib/result-contract/consumer.ts'),
    functions: ['resolveCanonicalResultForConsumer'],
  },
  {
    id: 'display-legacy-history-detail-projection-v1',
    owner: 'display-result-read-model',
    rationale: 'Display preserves raw undeclared detail sections only for legacy History when canonical projection otherwise succeeds.',
    matchers: exact('src/lib/display/result/display-read-model.ts'),
    functions: ['canonicalDocumentForDisplay'],
  },
];

export const CONTROL_OUTCOME_REGISTRATIONS = [
  {
    id: 'equation-cancellation-display-control-v1',
    owner: 'equation-runtime-control',
    rationale: 'The Equation boundary projects an OOE hard-stop cancellation into the existing Display error card without treating runtime cancellation as mathematical result truth.',
    matchers: exact('src/lib/equation/solve-result/boundary.ts'),
    functions: ['projectEquationOutcomeBoundaryToDisplay'],
  },
  {
    id: 'workspace-worker-cancellation-display-control-v1',
    owner: 'workspace-runtime-control',
    rationale: 'Calculate, Geometry, Statistics, Trigonometry, Matrix, and Vector worker hard stops are OOE control outcomes rather than mathematical result producers.',
    matchers: exact(
      'src/lib/modes/worker-clients/calculate-worker-client.ts',
      'src/lib/modes/worker-clients/geometry-worker-client.ts',
      'src/lib/modes/worker-clients/linear-algebra-worker-client-core.ts',
      'src/lib/modes/worker-clients/statistics-worker-client.ts',
      'src/lib/modes/worker-clients/trigonometry-worker-client.ts',
    ),
    functions: ['buildCancelledPayload'],
  },
  {
    id: 'calculus-worker-cancellation-display-control-v1',
    owner: 'calculus-runtime-control',
    rationale: 'Calculus worker hard stops are OOE control outcomes rather than mathematical result producers.',
    matchers: exact('src/lib/modes/worker-clients/calculus-worker-client.ts'),
    functions: ['buildCancelledOutcome'],
  },
  {
    id: 'table-cancellation-display-control-v1',
    owner: 'table-runtime-control',
    rationale: 'A stopped Table build carries no completed rows and remains an OOE control outcome.',
    matchers: exact('src/lib/modes/table-core.ts'),
    functions: ['buildCancelledTableModeResult'],
  },
];

export const OWNER_ASSEMBLY_REGISTRATIONS = [
  {
    id: 'app-runtime-result-retitle-assembly-v1',
    owner: 'app-runtime-result-routing',
    rationale: 'Legacy Calculate workbench routing retitles an already-owned outcome before commit; it does not author mathematical truth.',
    matchers: exact('src/app/runtime/useCalculateRuntime.ts'),
    functions: ['retitleOutcome'],
  },
  {
    id: 'calculus-result-owner-assembly-v1',
    owner: 'calculus-result-contract',
    rationale: 'Calculus assembles and enriches compatibility fields internally before its unconditional final result-document adapter.',
    matchers: exact('src/lib/calculus/workspace/engine.ts'),
    functions: ['toOutcome', 'withStoredValueDetails', 'withDerivativeSteps', 'runCalculusWorkspaceMode'],
  },
  {
    id: 'geometry-result-owner-assembly-v1',
    owner: 'geometry-result-contract',
    rationale: 'Geometry converts typed domain evaluations before the runtime owner attaches the final canonical document.',
    matchers: exact('src/lib/geometry/core.ts'),
    functions: ['evaluationToOutcome'],
  },
  {
    id: 'kernel-runtime-result-assembly-v1',
    owner: 'workspace-runtime-envelope',
    rationale: 'The shared runtime envelope assembles or enriches compatibility fields before workspace-owned finalization and never owns mathematical truth.',
    matchers: exact('src/lib/kernel/runtime-envelope.ts'),
    functions: ['buildRuntimeOutcome', 'attachRuntimeEnvelope'],
  },
  {
    id: 'matrix-system-result-owner-assembly-v1',
    owner: 'matrix-result-contract',
    rationale: 'The shared exact Matrix-system path assembles Matrix fields before the exported Matrix owner attaches the final canonical document.',
    matchers: exact('src/lib/linear-algebra/matrix-system.ts'),
    functions: ['matrixSystemStop', 'runMatrixLinearSystem'],
  },
  {
    id: 'matrix-mode-result-owner-assembly-v1',
    owner: 'matrix-result-contract',
    rationale: 'Matrix mode assembly is finalized by createMatrixResultOutcome at the exported worker and fallback boundary.',
    matchers: exact('src/lib/modes/matrix.ts'),
    functions: ['runMatrixModeOutcome'],
  },
  {
    id: 'statistics-result-owner-assembly-v1',
    owner: 'statistics-result-contract',
    rationale: 'Statistics converts typed domain evaluations before the runtime owner attaches the final canonical document.',
    matchers: exact('src/lib/statistics/core.ts'),
    functions: ['toOutcome'],
  },
  {
    id: 'table-result-owner-assembly-v1',
    owner: 'table-result-contract',
    rationale: 'Table profiles completed row evidence immediately before createTableResultOutcome attaches the final document.',
    matchers: exact('src/lib/modes/table-core.ts'),
    functions: ['buildTableModeResult'],
  },
  {
    id: 'trigonometry-result-owner-assembly-v1',
    owner: 'trigonometry-result-contract',
    rationale: 'Trigonometry assembles typed domain and cross-workspace presentation fields before its runtime owner attaches final truth.',
    matchers: exact('src/lib/trigonometry/core.ts'),
    functions: ['toOutcome', 'withCanonicalMetadata', 'runTrigRequest'],
  },
  {
    id: 'vector-mode-result-owner-assembly-v1',
    owner: 'vector-result-contract',
    rationale: 'Vector mode assembly is finalized by createVectorResultOutcome at the exported worker and fallback boundary.',
    matchers: exact('src/lib/modes/vector.ts'),
    functions: ['runVectorModeOutcome'],
  },
];

export const REFERENCE_OUTCOME_MATCHERS = exact(
  'src/lib/__golden__/golden-cases.ts',
);

export const NATIVE_DOCUMENT_CALL_NAMES = new Set([
  'projectCanonicalResultToDisplayOutcome',
]);

export const NATIVE_DOCUMENT_WRAPPER_CALL_NAMES = new Set([
  'createCalculusResultOutcome',
  'createEquationResultOutcome',
  'createGeometryResultOutcome',
  'createMatrixResultOutcome',
  'createStatisticsResultOutcome',
  'createTableResultOutcome',
  'createTrigonometryResultOutcome',
  'createVectorResultOutcome',
  'requireNativeSuccessfulResult',
]);

export const PRODUCER_INPUT_REGISTRATIONS = [
  {
    id: 'calculus-result-producer-input-v1',
    owner: 'calculus-result-contract',
    rationale: 'The Calculus producer adapter reads typed result evidence before emitting canonical and compatibility projections; these are producer assembly reads, not downstream Display consumers.',
    matchers: exact('src/lib/calculus/workspace/result-document.ts'),
    functions: ['createCalculusResultOutcome'],
  },
  {
    id: 'equation-result-producer-input-v1',
    owner: 'equation-result-contract',
    rationale: 'The Equation producer adapter reads its authored dual-write input before emitting both canonical and compatibility projections; these are producer assembly reads, not downstream Display consumers.',
    matchers: exact('src/lib/equation/solve-result/producer.ts'),
    functions: ['createEquationResultOutcome'],
  },
  {
    id: 'geometry-result-producer-input-v1',
    owner: 'geometry-result-contract',
    rationale: 'The Geometry owner adapter reads typed result evidence before attaching native canonical truth.',
    matchers: exact('src/lib/geometry/result-document.ts'),
    functions: ['createGeometryResultOutcome'],
  },
  {
    id: 'matrix-result-producer-input-v1',
    owner: 'matrix-result-contract',
    rationale: 'The Matrix owner adapter reads typed result evidence before attaching native canonical truth without changing its independent runtime shell.',
    matchers: exact('src/lib/modes/matrix-result-document.ts'),
    functions: ['createMatrixResultOutcome'],
  },
  {
    id: 'statistics-result-producer-input-v1',
    owner: 'statistics-result-contract',
    rationale: 'The Statistics owner adapter reads typed result evidence before attaching native canonical truth.',
    matchers: exact('src/lib/statistics/result-document.ts'),
    functions: ['createStatisticsResultOutcome'],
  },
  {
    id: 'table-result-producer-input-v1',
    owner: 'table-result-contract',
    rationale: 'The Table owner adapter reads typed result evidence and the completed structured response before attaching native canonical truth.',
    matchers: exact('src/lib/modes/table-result-document.ts'),
    functions: ['createTableResultOutcome'],
  },
  {
    id: 'trigonometry-result-producer-input-v1',
    owner: 'trigonometry-result-contract',
    rationale: 'The Trigonometry owner adapter reads typed result evidence after cross-workspace presentation changes.',
    matchers: exact('src/lib/trigonometry/result-document.ts'),
    functions: ['createTrigonometryResultOutcome'],
  },
  {
    id: 'vector-result-producer-input-v1',
    owner: 'vector-result-contract',
    rationale: 'The Vector owner adapter reads typed result evidence before attaching native canonical truth without changing its independent runtime shell.',
    matchers: exact('src/lib/modes/vector-result-document.ts'),
    functions: ['createVectorResultOutcome'],
  },
];

export const DISPLAY_OUTCOME_CONTROL_PROPERTIES = new Set([
  'carryLatex',
  'kind',
  'message',
  'targetMode',
]);

export const DISPLAY_OUTCOME_TRANSIENT_PROPERTIES = new Set([
  'actions',
  'runtimeAdvisories',
]);

export const DISPLAY_OUTCOME_CANONICAL_PROPERTIES = new Set([
  'canonicalResult',
]);

export const DISPLAY_OUTCOME_LEGACY_PROPERTIES = new Set([
  'answerDomain',
  'answerMode',
  'answerRows',
  'approxText',
  'branchReadback',
  'calculusDerivativeStrategies',
  'calculusStrategy',
  'candidateValues',
  'canonicalMath',
  'detailSections',
  'error',
  'exactLatex',
  'exactSupplementLatex',
  'numericMethod',
  'periodicFamily',
  'plannerBadges',
  'rejectedCandidateCount',
  'resolvedInputLatex',
  'resultOrigin',
  'solutionKind',
  'solveBadges',
  'solveSummaryParts',
  'solveSummaryText',
  'sourceMode',
  'substitutionDiagnostics',
  'systemReadback',
  'title',
  'transformBadges',
  'transformSummaryLatex',
  'transformSummaryText',
  'variableSubstitutions',
  'warnings',
]);

export const CONTROL_ONLY_ERROR_PROPERTIES = new Set([
  'actions',
  'error',
  'kind',
  'runtimeAdvisories',
  'title',
  'warnings',
]);
