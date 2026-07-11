const exact = (...values) => values.map((value) => ({ kind: 'exact', value }));
const prefix = (...values) => values.map((value) => ({ kind: 'prefix', value }));

export const DETAIL_SEGMENT_HELPERS = new Map([
  ['mathDetailSection', 'explicit-math'],
  ['textDetailSection', 'explicit-text'],
  ['mixedDetailSection', 'typed-parts'],
]);
export const DETAIL_SEGMENT_LANES = [
  {
    id: 'equation-parameterized',
    owner: 'Equation parameterized and wrapper presentation',
    matchers: [
      ...prefix('src/lib/equation/parameterized/'),
      ...exact(
        'src/lib/equation/isolation/algebraic.ts',
        'src/lib/equation/isolation/selected-target.ts',
        'src/lib/modes/equation/complex-mixed-algebraic-wrapper-route.ts',
        'src/lib/modes/equation/complex-power-wrapper-route.ts',
        'src/lib/modes/equation/complex-preimage-wrapper-route.ts',
        'src/lib/modes/equation/complex-root-wrapper-route.ts',
        'src/lib/modes/equation/complex-wrapper-fallback.ts',
        'src/lib/modes/equation/parameterized-formula-routes.ts',
        'src/lib/modes/equation/parameterized.ts',
        'src/lib/modes/equation/symbolic-algebraic-formula-fallback.ts',
        'src/lib/modes/equation/symbolic-parameterized-exact.ts',
      ),
    ],
  },
  {
    id: 'equation-core',
    owner: 'Equation core, inequality, complex, and numeric presentation',
    matchers: prefix('src/lib/equation/', 'src/lib/modes/equation/'),
  },
  {
    id: 'symbolic-limits',
    owner: 'Symbolic Limits presentation',
    matchers: prefix('src/lib/symbolic-engine/limits/'),
  },
  {
    id: 'symbolic-integration',
    owner: 'Symbolic integration presentation',
    matchers: prefix('src/lib/symbolic-engine/integration/'),
  },
  {
    id: 'calculus',
    owner: 'Calculus workspace presentation',
    matchers: prefix('src/lib/calculus/', 'src/lib/modes/calculus'),
  },
  {
    id: 'workspace-domains',
    owner: 'Calculate, Trigonometry, Geometry, Statistics, and Table presentation',
    matchers: prefix(
      'src/lib/geometry/',
      'src/lib/statistics/',
      'src/lib/trigonometry/',
      'src/lib/modes/calculate',
      'src/lib/modes/geometry',
      'src/lib/modes/statistics',
      'src/lib/modes/table',
      'src/lib/modes/trigonometry',
    ),
  },
  {
    id: 'linear-algebra',
    owner: 'Matrix and Vector presentation',
    matchers: prefix(
      'src/lib/linear-algebra/',
      'src/lib/modes/linear-algebra',
      'src/lib/modes/matrix',
      'src/lib/modes/vector',
    ),
  },
  {
    id: 'compat-closeout',
    owner: 'Remaining live producer compatibility inventory',
    matchers: prefix('src/'),
  },
];

export const DETAIL_SECTION_CONTAINER_PROPERTIES = new Set([
  'detailSections',
  'extraDetailSections',
  'extraSections',
]);
