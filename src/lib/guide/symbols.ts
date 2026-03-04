import { KEYBOARD_PAGE_SPECS } from '../virtual-keyboard/catalog';
import type {
  CapabilityId,
  GuideDomainId,
  GuideSymbolRef,
  KeyboardKeySpec,
} from '../../types/calculator';

const DOMAIN_BY_CAPABILITY: Record<CapabilityId, GuideDomainId> = {
  'keyboard-foundation': 'basics',
  'algebra-core': 'algebra',
  'discrete-core': 'discrete',
  'calculus-core': 'calculus',
  'linear-algebra-core': 'linearAlgebra',
  'advanced-calculus-core': 'advancedCalculus',
  'trigonometry-core': 'trigonometry',
  'statistics-core': 'statistics',
  'geometry-core': 'geometry',
};

const DEFAULT_ARTICLES_BY_DOMAIN: Record<GuideDomainId, string[]> = {
  basics: ['basics-keyboard'],
  algebra: ['algebra-manipulation'],
  discrete: ['discrete-operators'],
  calculus: ['calculus-derivatives'],
  linearAlgebra: ['linear-algebra-matrix-vector'],
  advancedCalculus: ['advanced-integrals', 'advanced-partials'],
  trigonometry: ['trig-functions', 'trig-identities'],
  statistics: ['statistics-descriptive'],
  geometry: ['geometry-shapes-2d', 'geometry-coordinate'],
};

const SYMBOL_OVERRIDES: Record<string, Partial<GuideSymbolRef>> = {
  'core-ans': {
    id: 'symbol-ans',
    meaning: 'Reuse the most recent exact result as Ans.',
    articleIds: ['basics-output'],
  },
  'core-pi': {
    id: 'symbol-pi',
    meaning: 'Insert the constant π.',
  },
  'core-e': {
    id: 'symbol-e',
    meaning: 'Insert the constant e.',
  },
  'core-fraction': {
    id: 'symbol-fraction',
    meaning: 'Insert a structured fraction template.',
  },
  'core-sqrt': {
    id: 'symbol-sqrt',
    meaning: 'Insert a square-root template.',
  },
  'core-power': {
    id: 'symbol-power',
    meaning: 'Insert a power/exponent placeholder.',
  },
  'alg-nth-root': {
    id: 'symbol-nth-root',
    meaning: 'Insert an nth-root template.',
  },
  'alg-abs': {
    id: 'symbol-abs',
    meaning: 'Insert an absolute-value template.',
  },
  'alg-group-power': {
    id: 'symbol-group-power',
    meaning: 'Raise a grouped expression to a power.',
  },
  'alg-square': {
    id: 'symbol-square',
    meaning: 'Square the previous expression or placeholder.',
  },
  'alg-cube': {
    id: 'symbol-cube',
    meaning: 'Cube the previous expression or placeholder.',
  },
  'rel-equal': {
    id: 'symbol-equal',
    meaning: 'Equation relation used for solving and equality notation.',
    articleIds: ['algebra-equations'],
  },
  'rel-not-equal': {
    id: 'symbol-not-equal',
    meaning: 'Not-equal relation notation.',
    articleIds: ['algebra-equations'],
  },
  'rel-less': {
    id: 'symbol-less',
    meaning: 'Less-than relation notation.',
    articleIds: ['algebra-equations'],
  },
  'rel-greater': {
    id: 'symbol-greater',
    meaning: 'Greater-than relation notation.',
    articleIds: ['algebra-equations'],
  },
  'rel-less-equal': {
    id: 'symbol-less-equal',
    meaning: 'Less-than-or-equal relation notation.',
    articleIds: ['algebra-equations'],
  },
  'rel-greater-equal': {
    id: 'symbol-greater-equal',
    meaning: 'Greater-than-or-equal relation notation.',
    articleIds: ['algebra-equations'],
  },
  'greek-sigma': {
    id: 'symbol-greek-sigma',
    meaning: 'Greek capital sigma used as a variable or notation symbol, not summation.',
    articleIds: ['discrete-operators'],
  },
  'disc-sum': {
    id: 'symbol-sum',
    meaning: 'Finite summation operator with explicit index and bounds.',
    articleIds: ['discrete-operators'],
  },
  'disc-product': {
    id: 'symbol-product',
    meaning: 'Finite product operator with explicit index and bounds.',
    articleIds: ['discrete-operators'],
  },
  'disc-factorial': {
    id: 'symbol-factorial',
    meaning: 'Factorial for non-negative integers in the current milestone.',
    articleIds: ['discrete-operators'],
  },
  'comb-ncr': {
    id: 'symbol-ncr',
    meaning: 'Combination count when order does not matter.',
    articleIds: ['discrete-combinatorics'],
  },
  'comb-npr': {
    id: 'symbol-npr',
    meaning: 'Permutation count when order matters.',
    articleIds: ['discrete-combinatorics'],
  },
  'calc-derivative': {
    id: 'symbol-derivative',
    meaning: 'Derivative with respect to x.',
    articleIds: ['calculus-derivatives'],
  },
  'calc-derivative-at-point': {
    id: 'symbol-derivative-point',
    meaning: 'Derivative evaluated at a numeric point.',
    articleIds: ['calculus-derivatives'],
  },
  'calc-integral': {
    id: 'symbol-integral',
    meaning: 'Indefinite integral template.',
    articleIds: ['calculus-integrals-limits'],
  },
  'calc-definite-integral': {
    id: 'symbol-definite-integral',
    meaning: 'Definite integral with numeric lower and upper bounds.',
    articleIds: ['calculus-integrals-limits'],
  },
  'calc-limit': {
    id: 'symbol-limit',
    meaning: 'Limit near a numeric target.',
    articleIds: ['calculus-integrals-limits'],
  },
  'calc-partial-x': {
    id: 'symbol-partial-x',
    meaning: 'Insert a first-order partial derivative with respect to x.',
    articleIds: ['calculus-derivatives', 'advanced-partials'],
  },
  'calc-partial-y': {
    id: 'symbol-partial-y',
    meaning: 'Insert a first-order partial derivative with respect to y.',
    articleIds: ['calculus-derivatives', 'advanced-partials'],
  },
  'calc-partial-z': {
    id: 'symbol-partial-z',
    meaning: 'Insert a first-order partial derivative with respect to z.',
    articleIds: ['calculus-derivatives', 'advanced-partials'],
  },
  'fn-sin': {
    id: 'symbol-sin',
    meaning: 'Insert a structured sin() function.',
    articleIds: ['calculus-derivatives', 'trig-functions', 'trig-equations'],
    bestModes: ['calculate', 'trigonometry', 'advancedCalculus'],
  },
  'trig-sin': {
    id: 'symbol-sin',
    meaning: 'Insert a structured sin() function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'fn-cos': {
    id: 'symbol-cos',
    meaning: 'Insert a structured cos() function.',
    articleIds: ['calculus-derivatives', 'trig-functions', 'trig-equations'],
    bestModes: ['calculate', 'trigonometry', 'advancedCalculus'],
  },
  'trig-cos': {
    id: 'symbol-cos',
    meaning: 'Insert a structured cos() function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'fn-tan': {
    id: 'symbol-tan',
    meaning: 'Insert a structured tan() function.',
    articleIds: ['calculus-derivatives', 'trig-functions', 'trig-equations'],
    bestModes: ['calculate', 'trigonometry', 'advancedCalculus'],
  },
  'trig-tan': {
    id: 'symbol-tan',
    meaning: 'Insert a structured tan() function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'trig-pi': {
    id: 'symbol-pi',
    meaning: 'Insert the constant pi.',
    articleIds: ['trig-special-angles'],
  },
  'fn-log': {
    id: 'symbol-log',
    meaning: 'Insert a structured base-10 log() function.',
    articleIds: ['calculus-derivatives'],
  },
  'fn-ln': {
    id: 'symbol-ln',
    meaning: 'Insert a structured natural-log function.',
    articleIds: ['calculus-derivatives'],
  },
  'trig-asin': {
    id: 'symbol-asin',
    meaning: 'Insert the inverse sine function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'trig-acos': {
    id: 'symbol-acos',
    meaning: 'Insert the inverse cosine function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'trig-atan': {
    id: 'symbol-atan',
    meaning: 'Insert the inverse tangent function.',
    articleIds: ['trig-functions', 'trig-equations'],
  },
  'trig-degree': {
    id: 'symbol-degree',
    meaning: 'Insert the degree symbol for angle notation.',
    articleIds: ['trig-functions', 'trig-special-angles'],
  },
  'trig-radian': {
    id: 'symbol-radian',
    meaning: 'Insert a radian label.',
    articleIds: ['trig-functions', 'trig-special-angles'],
  },
  'trig-product-to-sum': {
    id: 'symbol-product-to-sum',
    meaning: 'Insert product-to-sum identity notation.',
    articleIds: ['trig-identities'],
  },
  'trig-sum-to-product': {
    id: 'symbol-sum-to-product',
    meaning: 'Insert sum-to-product identity notation.',
    articleIds: ['trig-identities'],
  },
  'trig-sine-rule': {
    id: 'symbol-sine-rule',
    meaning: 'Insert the sine rule identity.',
    articleIds: ['trig-triangles'],
  },
  'trig-cosine-rule': {
    id: 'symbol-cosine-rule',
    meaning: 'Insert the cosine rule identity.',
    articleIds: ['trig-triangles'],
  },
  'geom-area': {
    id: 'symbol-geometry-area',
    meaning: 'Insert area notation.',
    articleIds: ['geometry-shapes-2d', 'geometry-triangles'],
  },
  'geom-perimeter': {
    id: 'symbol-geometry-perimeter',
    meaning: 'Insert perimeter notation.',
    articleIds: ['geometry-shapes-2d'],
  },
  'geom-volume': {
    id: 'symbol-geometry-volume',
    meaning: 'Insert volume notation.',
    articleIds: ['geometry-solids-3d'],
  },
  'geom-circle-area': {
    id: 'symbol-circle-area',
    meaning: 'Insert the circle-area pattern pi r^2.',
    articleIds: ['geometry-circles'],
  },
  'geom-circumference': {
    id: 'symbol-circumference',
    meaning: 'Insert the circumference pattern 2 pi r.',
    articleIds: ['geometry-circles'],
  },
  'geom-heron': {
    id: 'symbol-heron',
    meaning: 'Insert Heron-formula notation.',
    articleIds: ['geometry-triangles'],
  },
  'geom-point': {
    id: 'symbol-point',
    meaning: 'Insert a coordinate point template.',
    articleIds: ['geometry-coordinate'],
  },
  'geom-distance': {
    id: 'symbol-distance',
    meaning: 'Insert the distance-formula pattern.',
    articleIds: ['geometry-coordinate'],
  },
  'geom-midpoint': {
    id: 'symbol-midpoint',
    meaning: 'Insert midpoint-formula notation.',
    articleIds: ['geometry-coordinate'],
  },
  'geom-slope': {
    id: 'symbol-slope',
    meaning: 'Insert slope-formula notation.',
    articleIds: ['geometry-coordinate'],
  },
  'geom-line-standard': {
    id: 'symbol-line-standard',
    meaning: 'Insert the standard line form Ax+By=C.',
    articleIds: ['geometry-coordinate'],
  },
  'lin-matrix-template': {
    id: 'symbol-matrix-template',
    meaning: 'Insert a structured matrix template for notation and reuse.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-vector-template': {
    id: 'symbol-vector-template',
    meaning: 'Insert a structured vector template for notation and reuse.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-transpose': {
    id: 'symbol-transpose',
    meaning: 'Insert transpose notation.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-inverse': {
    id: 'symbol-inverse',
    meaning: 'Insert inverse notation.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-det': {
    id: 'symbol-det',
    meaning: 'Insert determinant notation.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-dot': {
    id: 'symbol-dot',
    meaning: 'Insert a dot-product template.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-cross': {
    id: 'symbol-cross',
    meaning: 'Insert a cross-product template.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'lin-norm': {
    id: 'symbol-norm',
    meaning: 'Insert norm notation.',
    articleIds: ['linear-algebra-matrix-vector'],
  },
  'series-maclaurin': {
    id: 'symbol-maclaurin',
    meaning: 'Insert Maclaurin-series notation.',
    articleIds: ['advanced-series'],
  },
  'series-taylor': {
    id: 'symbol-taylor',
    meaning: 'Insert Taylor-series notation.',
    articleIds: ['advanced-series'],
  },
  'advanced-pos-infinity': {
    id: 'symbol-pos-infinity',
    meaning: 'Insert positive infinity.',
    articleIds: ['advanced-limits'],
  },
  'advanced-neg-infinity': {
    id: 'symbol-neg-infinity',
    meaning: 'Insert negative infinity.',
    articleIds: ['advanced-limits'],
  },
};

function keyToLatex(key: KeyboardKeySpec) {
  return key.action.kind === 'insert-latex' || key.action.kind === 'insert-template'
    ? key.action.latex
    : '';
}

function inferMeaning(key: KeyboardKeySpec) {
  if (/^\d+$/.test(key.label)) {
    return `Insert digit ${key.label}.`;
  }

  const generic: Record<string, string> = {
    '+': 'Insert the plus operator.',
    '−': 'Insert the minus operator.',
    '×': 'Insert the multiplication operator.',
    '÷': 'Insert the division operator.',
    '(': 'Insert a left parenthesis.',
    ')': 'Insert a right parenthesis.',
    ',': 'Insert a comma separator.',
    '.': 'Insert a decimal point.',
  };

  return generic[key.label] ?? `Insert ${key.label}.`;
}

function bestModesForKey(key: KeyboardKeySpec) {
  return (key.modeVisibility ?? ['calculate', 'equation', 'table']).filter(
    (mode): mode is GuideSymbolRef['bestModes'][number] => mode !== 'guide',
  );
}

function isLookupCandidate(key: KeyboardKeySpec) {
  return key.action.kind === 'insert-latex' || key.action.kind === 'insert-template';
}

function isGuideSupportLevel(
  supportLevel: KeyboardKeySpec['supportLevel'],
): supportLevel is GuideSymbolRef['supportLevel'] {
  return supportLevel === 'insert' || supportLevel === 'numeric' || supportLevel === 'symbolic';
}

export function getActiveGuideSymbols(enabledCapabilities: readonly CapabilityId[]): GuideSymbolRef[] {
  const symbols: GuideSymbolRef[] = [];

  for (const page of KEYBOARD_PAGE_SPECS) {
    if (!enabledCapabilities.includes(page.capability)) {
      continue;
    }

    for (const key of page.rows.flat()) {
      if (!isLookupCandidate(key)) {
        continue;
      }

      const domainId = DOMAIN_BY_CAPABILITY[key.capability];
      const override = SYMBOL_OVERRIDES[key.id] ?? {};
      const supportLevel = override.supportLevel ?? key.supportLevel;
      if (!isGuideSupportLevel(supportLevel)) {
        continue;
      }

      symbols.push({
        id: override.id ?? `symbol-${key.id}`,
        label: key.label,
        latex: override.latex ?? keyToLatex(key),
        domainId: override.domainId ?? domainId,
        keyboardPageId: override.keyboardPageId ?? page.id,
        supportLevel,
        meaning: override.meaning ?? inferMeaning(key),
        bestModes: override.bestModes ?? bestModesForKey(key),
        articleIds: override.articleIds ?? DEFAULT_ARTICLES_BY_DOMAIN[domainId],
        active: override.active ?? true,
      });
    }
  }

  return symbols
    .filter((symbol) => symbol.active)
    .filter((symbol, index, list) => list.findIndex((candidate) => candidate.id === symbol.id) === index)
    .sort((left, right) => left.label.localeCompare(right.label));
}
