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
];

export const REFERENCE_OUTCOME_MATCHERS = exact(
  'src/lib/__golden__/golden-cases.ts',
);

export const NATIVE_DOCUMENT_CALL_NAMES = new Set([
  'projectCanonicalResultToDisplayOutcome',
]);

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
