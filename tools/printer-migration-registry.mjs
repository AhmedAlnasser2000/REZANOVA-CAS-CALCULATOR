const exact = (...values) => values.map((value) => ({ kind: 'exact', value }));
const prefix = (...values) => values.map((value) => ({ kind: 'prefix', value }));

export const RESULT_PROPERTY_NAMES = [
  'answerLatex',
  'exactLatex',
  'resultLatex',
  'solutionLatex',
];

export const RESULT_BUILDER_SPECS = [
  {
    id: 'equation-guarded-success-outcome',
    callee: 'successOutcome',
    argumentIndex: 1,
    matchers: prefix('src/lib/equation/guarded/'),
  },
];

export const REFERENCE_CONTENT_MATCHERS = prefix(
  'src/lib/__golden__/',
  'src/lib/guide/',
  'src/lib/labs/',
  'src/lib/surface-protocol/fixtures.ts',
);

export const NON_PRODUCER_RESULT_REGISTRATIONS = [
  {
    id: 'history-schema-v1',
    category: 'persistence-schema',
    owner: 'app-state-history',
    rationale: 'The History schema names stored compatibility fields but does not author mathematical output.',
    matchers: exact('src/lib/app-state/schemas.ts'),
    properties: ['resultLatex'],
  },
];

export const FALLBACK_REGISTRATIONS = [
  {
    id: 'app-history-result-v1',
    lane: 'history-compatibility',
    owner: 'app-runtime-history',
    rationale: 'History and app-flow adapters retain legacy result strings until HISTORY-STRUCTURED-RESULT2.',
    matchers: prefix('src/app/logic/', 'src/app/runtime/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'calculate-result-v1',
    lane: 'calculate',
    owner: 'calculate-runtime',
    rationale: 'Unmigrated Calculate engine and mode routes retain compatibility LaTeX until their printer profile slice.',
    matchers: [
      ...prefix('src/lib/engine/math-engine/', 'src/lib/modes/calculate/'),
      ...exact('src/lib/numeric/real-numeric-eval.ts'),
    ],
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'equation-result-v1',
    lane: 'equation',
    owner: 'equation-runtime',
    rationale: 'Equation exact, numeric, parameterized, and complex families migrate through the approved risk slices.',
    matchers: prefix('src/lib/equation/', 'src/lib/modes/equation/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'calculus-result-v1',
    lane: 'calculus',
    owner: 'calculus-runtime',
    rationale: 'Calculus engine and guided workspace producers retain compatibility output until the Calculus profile slice.',
    matchers: prefix('src/lib/calculus/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'symbolic-limits-result-v1',
    lane: 'symbolic-limits',
    owner: 'symbolic-limits',
    rationale: 'Limits keep their current proof-aware serializers until the Symbolic Limits profile slice.',
    matchers: prefix('src/lib/symbolic-engine/limits/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'symbolic-integration-result-v1',
    lane: 'symbolic-integration',
    owner: 'symbolic-integration',
    rationale: 'Integration families keep compatibility serializers until the Symbolic Integration profile slice.',
    matchers: [
      ...prefix('src/lib/symbolic-engine/integration/'),
      ...exact(
        'src/lib/symbolic-engine/orchestrator.ts',
        'src/lib/symbolic-engine/partials.ts',
      ),
    ],
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'trigonometry-result-v1',
    lane: 'trigonometry',
    owner: 'trigonometry-workspace',
    rationale: 'Trigonometry result builders migrate with the guided-domain printer profile slice.',
    matchers: prefix('src/lib/trigonometry/', 'src/lib/modes/trigonometry/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'geometry-result-v1',
    lane: 'geometry',
    owner: 'geometry-workspace',
    rationale: 'Geometry native-domain result builders migrate with the guided-domain printer profile slice.',
    matchers: prefix('src/lib/geometry/', 'src/lib/modes/geometry/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'statistics-result-v1',
    lane: 'statistics',
    owner: 'statistics-workspace',
    rationale: 'Statistics native-domain result builders migrate with the guided-domain printer profile slice.',
    matchers: prefix('src/lib/statistics/', 'src/lib/modes/statistics/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'linear-algebra-result-v1',
    lane: 'linear-algebra',
    owner: 'linear-algebra-workspaces',
    rationale: 'Matrix and Vector retain native exact serializers until the shared Linear Algebra profile slice.',
    matchers: [
      ...prefix('src/lib/linear-algebra/'),
      ...exact('src/lib/modes/matrix.ts', 'src/lib/modes/vector.ts'),
    ],
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'table-result-v1',
    lane: 'table',
    owner: 'table-workspace',
    rationale: 'Table structured rows and summary output remain native until the guided-domain profile slice.',
    matchers: exact('src/lib/engine/math-engine/table.ts', 'src/lib/modes/table-core.ts'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'shared-algebra-result-v1',
    lane: 'shared-algebra',
    owner: 'algebra-core',
    rationale: 'Shared algebra transform and polynomial result helpers migrate with their consuming producer slices.',
    matchers: prefix('src/lib/algebra/polynomial-factor/', 'src/lib/algebra/transform-core/'),
    properties: RESULT_PROPERTY_NAMES,
  },
  {
    id: 'shared-runtime-result-v1',
    lane: 'shared-runtime',
    owner: 'kernel-runtime',
    rationale: 'The shared runtime envelope remains a compatibility forwarding seam while producers migrate.',
    matchers: exact('src/lib/kernel/runtime-envelope.ts'),
    properties: RESULT_PROPERTY_NAMES,
  },
];

export const INPUT_LATEX_PROPERTY_NAMES = new Set([
  'ansLatex',
  'argumentLatex',
  'bodyLatex',
  'carryLatex',
  'editorExpressionLatex',
  'equationInputLatex',
  'equationLatex',
  'expressionLatex',
  'inputLatex',
  'originalLatex',
  'plannerResolvedLatex',
  'rawLatex',
  'requestLatex',
  'resolvedInputLatex',
  'resolvedLatex',
  'sourceLatex',
]);

export const PROSE_PROPERTY_NAMES = new Set([
  'description',
  'error',
  'label',
  'lines',
  'message',
  'text',
  'title',
  'warnings',
]);

export const MIGRATION_MARKER_NAMES = new Set([
  'answerMathJson',
  'canonicalMath',
]);

export const MIGRATION_WRAPPER_NAMES = new Set([
  'canonicalDirectSymbolicOutcome',
]);
