import type {
  CapabilityId,
  KeyboardKeySpec,
  KeyboardPageSpec,
  ModeId,
} from '../../types/calculator';

type KeyOptions = {
  modeVisibility?: ModeId[];
  duplicateGroup?: string;
  lessonRef?: string;
  variants?: KeyboardKeySpec[];
};

function insertLatexKey(
  id: string,
  label: string,
  latex: string,
  capability: CapabilityId,
  pageId: string,
  options: KeyOptions = {},
): KeyboardKeySpec {
  return {
    id,
    label,
    action: { kind: 'insert-latex', latex },
    capability,
    supportLevel: 'insert',
    pageId,
    ...options,
  };
}

function insertTemplateKey(
  id: string,
  label: string,
  latex: string,
  capability: CapabilityId,
  pageId: string,
  supportLevel: KeyboardKeySpec['supportLevel'],
  options: KeyOptions = {},
): KeyboardKeySpec {
  return {
    id,
    label,
    action: { kind: 'insert-template', latex },
    capability,
    supportLevel,
    pageId,
    ...options,
  };
}

function commandKey(
  id: string,
  label: string,
  command: string,
  capability: CapabilityId,
  pageId: string,
): KeyboardKeySpec {
  return {
    id,
    label,
    action: { kind: 'execute-command', command },
    capability,
    supportLevel: 'insert',
    pageId,
  };
}

const FOUNDATION = 'keyboard-foundation' as const;
const ALGEBRA = 'algebra-core' as const;
const DISCRETE = 'discrete-core' as const;
const CALCULUS = 'calculus-core' as const;
const LINEAR = 'linear-algebra-core' as const;
const ADVANCED = 'advanced-calculus-core' as const;
const TRIG = 'trigonometry-core' as const;
const GEOM = 'geometry-core' as const;

const epsilonVariant = insertLatexKey(
  'greek-epsilon-variant',
  'ϵ',
  '\\epsilon',
  FOUNDATION,
  'greek',
  { duplicateGroup: 'greek-epsilon', lessonRef: 'milestone-00-keyboard-foundation' },
);

const thetaVariant = insertLatexKey(
  'greek-theta-variant',
  'ϑ',
  '\\vartheta',
  FOUNDATION,
  'greek',
  { duplicateGroup: 'greek-theta', lessonRef: 'milestone-00-keyboard-foundation' },
);

const phiVariant = insertLatexKey(
  'greek-phi-variant',
  'ϕ',
  '\\varphi',
  FOUNDATION,
  'greek',
  { duplicateGroup: 'greek-phi', lessonRef: 'milestone-00-keyboard-foundation' },
);

const rhoVariant = insertLatexKey(
  'greek-rho-variant',
  'ϱ',
  '\\varrho',
  FOUNDATION,
  'greek',
  { duplicateGroup: 'greek-rho', lessonRef: 'milestone-00-keyboard-foundation' },
);

const sigmaVariants = [
  insertLatexKey(
    'greek-sigma-lower',
    'σ',
    '\\sigma',
    FOUNDATION,
    'greek',
    { duplicateGroup: 'greek-sigma', lessonRef: 'milestone-00-keyboard-foundation' },
  ),
  insertLatexKey(
    'greek-sigma-final',
    'ς',
    '\\varsigma',
    FOUNDATION,
    'greek',
    { duplicateGroup: 'greek-sigma', lessonRef: 'milestone-00-keyboard-foundation' },
  ),
];

export const KEYBOARD_PAGE_SPECS: KeyboardPageSpec[] = [
  {
    id: 'core',
    label: 'Core',
    capability: FOUNDATION,
    modeVisibility: ['calculate', 'equation', 'matrix', 'vector', 'table', 'advancedCalculus', 'trigonometry', 'geometry'],
    rows: [
      [
        insertLatexKey('core-ans', 'Ans', 'Ans', FOUNDATION, 'core', {
          duplicateGroup: 'ans',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('core-pi', 'π', '\\pi', FOUNDATION, 'core', {
          duplicateGroup: 'constant-pi',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('core-e', 'e', '\\exponentialE', FOUNDATION, 'core', {
          duplicateGroup: 'constant-e',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
      ],
      [
        insertLatexKey('core-7', '7', '7', FOUNDATION, 'core'),
        insertLatexKey('core-8', '8', '8', FOUNDATION, 'core'),
        insertLatexKey('core-9', '9', '9', FOUNDATION, 'core'),
        insertLatexKey('core-divide', '÷', '\\div', FOUNDATION, 'core', {
          duplicateGroup: 'operator-divide',
        }),
        commandKey('core-backspace', '⌫', 'deleteBackward', FOUNDATION, 'core'),
      ],
      [
        insertLatexKey('core-4', '4', '4', FOUNDATION, 'core'),
        insertLatexKey('core-5', '5', '5', FOUNDATION, 'core'),
        insertLatexKey('core-6', '6', '6', FOUNDATION, 'core'),
        insertLatexKey('core-multiply', '×', '\\times', FOUNDATION, 'core', {
          duplicateGroup: 'operator-multiply',
        }),
        insertLatexKey('core-left-paren', '(', '(', FOUNDATION, 'core', {
          duplicateGroup: 'paren-left',
        }),
      ],
      [
        insertLatexKey('core-1', '1', '1', FOUNDATION, 'core'),
        insertLatexKey('core-2', '2', '2', FOUNDATION, 'core'),
        insertLatexKey('core-3', '3', '3', FOUNDATION, 'core'),
        insertLatexKey('core-minus', '−', '-', FOUNDATION, 'core', {
          duplicateGroup: 'operator-minus',
        }),
        insertLatexKey('core-right-paren', ')', ')', FOUNDATION, 'core', {
          duplicateGroup: 'paren-right',
        }),
      ],
      [
        insertLatexKey('core-0', '0', '0', FOUNDATION, 'core'),
        insertLatexKey('core-dot', '.', '.', FOUNDATION, 'core', {
          duplicateGroup: 'decimal-point',
        }),
        insertLatexKey('core-plus', '+', '+', FOUNDATION, 'core', {
          duplicateGroup: 'operator-plus',
        }),
        insertTemplateKey('core-fraction', 'a/b', '\\frac{#@}{#?}', FOUNDATION, 'core', 'symbolic', {
          duplicateGroup: 'fraction',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertTemplateKey('core-sqrt', '√', '\\sqrt{#0}', FOUNDATION, 'core', 'symbolic', {
          duplicateGroup: 'sqrt',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
      ],
      [
        insertTemplateKey('core-power', 'xⁿ', '^{#0}', FOUNDATION, 'core', 'symbolic', {
          duplicateGroup: 'power',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        commandKey('core-left', '◀', 'moveToPreviousChar', FOUNDATION, 'core'),
        commandKey('core-right', '▶', 'moveToNextChar', FOUNDATION, 'core'),
        commandKey('core-return', '↵', '[return]', FOUNDATION, 'core'),
      ],
    ],
  },
  {
    id: 'algebra',
    label: 'Algebra',
    capability: ALGEBRA,
    modeVisibility: ['calculate', 'equation', 'advancedCalculus'],
    rows: [
      [
        insertTemplateKey('alg-nth-root', 'ⁿ√', '\\sqrt[#0]{#?}', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'nth-root',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-subscript', 'xₙ', '_{#0}', ALGEBRA, 'algebra', 'insert', {
          duplicateGroup: 'subscript',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-abs', '|x|', '\\left|#0\\right|', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'absolute-value',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-square', 'x²', '^{2}', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'power-square',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-cube', 'x³', '^{3}', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'power-cube',
          lessonRef: 'milestone-01-algebra-core',
        }),
      ],
      [
        insertTemplateKey('alg-group-power', '( )ⁿ', '\\left(#0\\right)^{#?}', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'group-power',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-reciprocal', 'x⁻¹', '^{-1}', ALGEBRA, 'algebra', 'symbolic', {
          duplicateGroup: 'reciprocal',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-brackets', '[ ]', '\\left[#0\\right]', ALGEBRA, 'algebra', 'insert', {
          duplicateGroup: 'group-brackets',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertTemplateKey('alg-braces', '{ }', '\\left\\{#0\\right\\}', ALGEBRA, 'algebra', 'insert', {
          duplicateGroup: 'group-braces',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('alg-comma', ',', ',', ALGEBRA, 'algebra', {
          duplicateGroup: 'comma',
          lessonRef: 'milestone-01-algebra-core',
        }),
      ],
    ],
  },
  {
    id: 'relations',
    label: 'Relations',
    capability: ALGEBRA,
    modeVisibility: ['calculate', 'equation', 'advancedCalculus'],
    rows: [
      [
        insertLatexKey('rel-equal', '=', '=', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-equal',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('rel-not-equal', '≠', '\\ne', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-not-equal',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('rel-less', '<', '<', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-less',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('rel-greater', '>', '>', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-greater',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('rel-less-equal', '≤', '\\le', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-less-equal',
          lessonRef: 'milestone-01-algebra-core',
        }),
        insertLatexKey('rel-greater-equal', '≥', '\\ge', ALGEBRA, 'relations', {
          duplicateGroup: 'relation-greater-equal',
          lessonRef: 'milestone-01-algebra-core',
        }),
      ],
    ],
  },
  {
    id: 'letters',
    label: 'Letters',
    capability: FOUNDATION,
    modeVisibility: ['calculate', 'equation', 'table', 'trigonometry'],
    rows: [
      [
        insertLatexKey('letter-a', 'a', 'a', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-a',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('letter-b', 'b', 'b', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-b',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('letter-c', 'c', 'c', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-c',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('letter-n', 'n', 'n', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-n',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('letter-x', 'x', 'x', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-x',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('letter-y', 'y', 'y', FOUNDATION, 'letters', {
          duplicateGroup: 'letter-y',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
      ],
    ],
  },
  {
    id: 'greek',
    label: 'Greek',
    capability: FOUNDATION,
    modeVisibility: ['calculate', 'equation'],
    rows: [
      [
        insertLatexKey('greek-alpha', 'α', '\\alpha', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-alpha',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('greek-beta', 'β', '\\beta', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-beta',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('greek-gamma', 'γ', '\\gamma', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-gamma',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('greek-theta', 'θ', '\\theta', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-theta',
          lessonRef: 'milestone-00-keyboard-foundation',
          variants: [thetaVariant],
        }),
        insertLatexKey('greek-epsilon', 'ε', '\\varepsilon', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-epsilon',
          lessonRef: 'milestone-00-keyboard-foundation',
          variants: [epsilonVariant],
        }),
      ],
      [
        insertLatexKey('greek-rho', 'ρ', '\\rho', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-rho',
          lessonRef: 'milestone-00-keyboard-foundation',
          variants: [rhoVariant],
        }),
        insertLatexKey('greek-phi', 'φ', '\\phi', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-phi',
          lessonRef: 'milestone-00-keyboard-foundation',
          variants: [phiVariant],
        }),
        insertLatexKey('greek-lambda', 'λ', '\\lambda', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-lambda',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('greek-mu', 'μ', '\\mu', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-mu',
          lessonRef: 'milestone-00-keyboard-foundation',
        }),
        insertLatexKey('greek-sigma', 'Σ', '\\Sigma', FOUNDATION, 'greek', {
          duplicateGroup: 'greek-sigma',
          lessonRef: 'milestone-00-keyboard-foundation',
          variants: sigmaVariants,
        }),
      ],
    ],
  },
  {
    id: 'discrete',
    label: 'Discrete',
    capability: DISCRETE,
    modeVisibility: ['calculate', 'equation', 'advancedCalculus'],
    rows: [
      [
        insertTemplateKey(
          'disc-sum',
          '∑',
          '\\sum_{#0=#?}^{#?}{#?}',
          DISCRETE,
          'discrete',
          'numeric',
          {
            duplicateGroup: 'operator-sum',
            lessonRef: 'milestone-02-discrete-core',
          },
        ),
        insertTemplateKey(
          'disc-product',
          '∏',
          '\\prod_{#0=#?}^{#?}{#?}',
          DISCRETE,
          'discrete',
          'numeric',
          {
            duplicateGroup: 'operator-product',
            lessonRef: 'milestone-02-discrete-core',
          },
        ),
        insertLatexKey('disc-factorial', '!', '!', DISCRETE, 'discrete', {
          duplicateGroup: 'operator-factorial',
          lessonRef: 'milestone-02-discrete-core',
        }),
      ],
    ],
  },
  {
    id: 'combinatorics',
    label: 'Combinatorics',
    capability: DISCRETE,
    modeVisibility: ['calculate', 'equation', 'advancedCalculus'],
    rows: [
      [
        insertTemplateKey(
          'comb-ncr',
          'nCr',
          '\\operatorname{nCr}\\left(#@,#?\\right)',
          DISCRETE,
          'combinatorics',
          'numeric',
          {
            duplicateGroup: 'operator-ncr',
            lessonRef: 'milestone-02-discrete-core',
          },
        ),
        insertTemplateKey(
          'comb-npr',
          'nPr',
          '\\operatorname{nPr}\\left(#@,#?\\right)',
          DISCRETE,
          'combinatorics',
          'numeric',
          {
            duplicateGroup: 'operator-npr',
            lessonRef: 'milestone-02-discrete-core',
          },
        ),
      ],
    ],
  },
  {
    id: 'calculus',
    label: 'Calculus',
    capability: CALCULUS,
    modeVisibility: ['calculate', 'equation', 'advancedCalculus'],
    rows: [
      [
        insertTemplateKey(
          'calc-derivative',
          'd/dx',
          '\\frac{d}{dx}#0',
          CALCULUS,
          'calculus',
          'symbolic',
          {
            duplicateGroup: 'calc-derivative',
            lessonRef: 'milestone-03-calculus-core',
          },
        ),
        insertTemplateKey(
          'calc-derivative-at-point',
          'd/dx|',
          '\\left.\\frac{d}{dx}#0\\right|_{x=#?}',
          CALCULUS,
          'calculus',
          'numeric',
          {
            duplicateGroup: 'calc-derivative-at-point',
            lessonRef: 'milestone-03-calculus-core',
          },
        ),
        insertTemplateKey(
          'calc-integral',
          '∫',
          '\\int #0\\, dx',
          CALCULUS,
          'calculus',
          'symbolic',
          {
            duplicateGroup: 'calc-integral',
            lessonRef: 'milestone-03-calculus-core',
          },
        ),
      ],
      [
        insertTemplateKey(
          'calc-definite-integral',
          '∫ab',
          '\\int_{#0}^{#?} #?\\, dx',
          CALCULUS,
          'calculus',
          'numeric',
          {
            duplicateGroup: 'calc-definite-integral',
            lessonRef: 'milestone-03-calculus-core',
          },
        ),
        insertTemplateKey(
          'calc-limit',
          'lim',
          '\\lim_{x\\to #0} #?',
          CALCULUS,
          'calculus',
          'numeric',
          {
            duplicateGroup: 'calc-limit',
            lessonRef: 'milestone-03-calculus-core',
          },
        ),
      ],
      [
        insertTemplateKey(
          'calc-partial-x',
          '∂/∂x',
          '\\frac{\\partial}{\\partial x}\\left(#0\\right)',
          ADVANCED,
          'calculus',
          'symbolic',
          {
            duplicateGroup: 'calc-partial-x',
            lessonRef: 'advanced-calculus-core',
            modeVisibility: ['advancedCalculus'],
          },
        ),
        insertTemplateKey(
          'calc-partial-y',
          '∂/∂y',
          '\\frac{\\partial}{\\partial y}\\left(#0\\right)',
          ADVANCED,
          'calculus',
          'symbolic',
          {
            duplicateGroup: 'calc-partial-y',
            lessonRef: 'advanced-calculus-core',
            modeVisibility: ['advancedCalculus'],
          },
        ),
        insertTemplateKey(
          'calc-partial-z',
          '∂/∂z',
          '\\frac{\\partial}{\\partial z}\\left(#0\\right)',
          ADVANCED,
          'calculus',
          'symbolic',
          {
            duplicateGroup: 'calc-partial-z',
            lessonRef: 'advanced-calculus-core',
            modeVisibility: ['advancedCalculus'],
          },
        ),
      ],
    ],
  },
  {
    id: 'functions',
    label: 'Functions',
    capability: CALCULUS,
    modeVisibility: ['calculate', 'equation', 'table', 'advancedCalculus'],
    rows: [
      [
        insertTemplateKey('fn-sin', 'sin', '\\sin\\left(#@\\right)', CALCULUS, 'functions', 'symbolic', {
          duplicateGroup: 'fn-sin',
          lessonRef: 'milestone-03-calculus-core',
        }),
        insertTemplateKey('fn-cos', 'cos', '\\cos\\left(#@\\right)', CALCULUS, 'functions', 'symbolic', {
          duplicateGroup: 'fn-cos',
          lessonRef: 'milestone-03-calculus-core',
        }),
        insertTemplateKey('fn-tan', 'tan', '\\tan\\left(#@\\right)', CALCULUS, 'functions', 'symbolic', {
          duplicateGroup: 'fn-tan',
          lessonRef: 'milestone-03-calculus-core',
        }),
      ],
      [
        insertTemplateKey('fn-log', 'log', '\\log\\left(#@\\right)', CALCULUS, 'functions', 'symbolic', {
          duplicateGroup: 'fn-log',
          lessonRef: 'milestone-03-calculus-core',
        }),
        insertTemplateKey('fn-ln', 'ln', '\\ln\\left(#@\\right)', CALCULUS, 'functions', 'symbolic', {
          duplicateGroup: 'fn-ln',
          lessonRef: 'milestone-03-calculus-core',
        }),
      ],
    ],
  },
  {
    id: 'series',
    label: 'Series',
    capability: ADVANCED,
    modeVisibility: ['advancedCalculus'],
    rows: [
      [
        insertTemplateKey(
          'series-maclaurin',
          'Mac',
          '\\operatorname{Maclaurin}\\left(#0,#?\\right)',
          ADVANCED,
          'series',
          'symbolic',
          {
            duplicateGroup: 'advanced-maclaurin',
            lessonRef: 'advanced-calculus-core',
          },
        ),
        insertTemplateKey(
          'series-taylor',
          'Taylor',
          '\\operatorname{Taylor}\\left(#0,#?,#?\\right)',
          ADVANCED,
          'series',
          'symbolic',
          {
            duplicateGroup: 'advanced-taylor',
            lessonRef: 'advanced-calculus-core',
          },
        ),
        insertLatexKey(
          'advanced-pos-infinity',
          '+∞',
          '\\infty',
          ADVANCED,
          'series',
          {
            duplicateGroup: 'advanced-pos-infinity',
            lessonRef: 'advanced-calculus-core',
          },
        ),
        insertLatexKey(
          'advanced-neg-infinity',
          '-∞',
          '-\\infty',
          ADVANCED,
          'series',
          {
            duplicateGroup: 'advanced-neg-infinity',
            lessonRef: 'advanced-calculus-core',
          },
        ),
      ],
    ],
  },
  {
    id: 'trig',
    label: 'Trig',
    capability: TRIG,
    modeVisibility: ['trigonometry'],
    rows: [
      [
        insertTemplateKey('trig-sin', 'sin', '\\sin\\left(#@\\right)', TRIG, 'trig', 'symbolic', {
          duplicateGroup: 'trig-fn-sin',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertTemplateKey('trig-cos', 'cos', '\\cos\\left(#@\\right)', TRIG, 'trig', 'symbolic', {
          duplicateGroup: 'trig-fn-cos',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertTemplateKey('trig-tan', 'tan', '\\tan\\left(#@\\right)', TRIG, 'trig', 'symbolic', {
          duplicateGroup: 'trig-fn-tan',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
      ],
      [
        insertTemplateKey('trig-asin', 'asin', '\\arcsin\\left(#@\\right)', TRIG, 'trig', 'numeric', {
          duplicateGroup: 'trig-asin',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertTemplateKey('trig-acos', 'acos', '\\arccos\\left(#@\\right)', TRIG, 'trig', 'numeric', {
          duplicateGroup: 'trig-acos',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertTemplateKey('trig-atan', 'atan', '\\arctan\\left(#@\\right)', TRIG, 'trig', 'numeric', {
          duplicateGroup: 'trig-atan',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
      ],
      [
        insertTemplateKey('trig-product-to-sum', 'P->S', '\\sin\\left(#0\\right)\\sin\\left(#?\\right)', TRIG, 'trig', 'symbolic', {
          duplicateGroup: 'trig-product-to-sum',
          lessonRef: 'milestone-07-trigonometry-core',
          modeVisibility: ['trigonometry'],
        }),
        insertTemplateKey('trig-sum-to-product', 'S->P', '\\sin\\left(#0\\right)+\\sin\\left(#?\\right)', TRIG, 'trig', 'symbolic', {
          duplicateGroup: 'trig-sum-to-product',
          lessonRef: 'milestone-07-trigonometry-core',
          modeVisibility: ['trigonometry'],
        }),
      ],
    ],
  },
  {
    id: 'angles',
    label: 'Angles',
    capability: TRIG,
    modeVisibility: ['trigonometry'],
    rows: [
      [
        insertLatexKey('trig-degree', 'deg', '^{\\circ}', TRIG, 'angles', {
          duplicateGroup: 'trig-degree',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertLatexKey('trig-radian', 'rad', '\\operatorname{rad}', TRIG, 'angles', {
          duplicateGroup: 'trig-radian',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertLatexKey('trig-theta', 'theta', '\\theta', TRIG, 'angles', {
          duplicateGroup: 'trig-theta',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
      ],
      [
        insertTemplateKey('trig-sine-rule', 'Sine', '\\frac{a}{\\sin\\left(A\\right)}=\\frac{b}{\\sin\\left(B\\right)}', TRIG, 'angles', 'symbolic', {
          duplicateGroup: 'trig-sine-rule',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
        insertTemplateKey('trig-cosine-rule', 'Cosine', 'c^{2}=a^{2}+b^{2}-2ab\\cos\\left(C\\right)', TRIG, 'angles', 'symbolic', {
          duplicateGroup: 'trig-cosine-rule',
          lessonRef: 'milestone-07-trigonometry-core',
        }),
      ],
    ],
  },
  {
    id: 'geometry',
    label: 'Geometry',
    capability: GEOM,
    modeVisibility: ['geometry'],
    rows: [
      [
        insertLatexKey('geom-area', 'A', 'A', GEOM, 'geometry', {
          duplicateGroup: 'geom-area',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertLatexKey('geom-perimeter', 'P', 'P', GEOM, 'geometry', {
          duplicateGroup: 'geom-perimeter',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertLatexKey('geom-volume', 'V', 'V', GEOM, 'geometry', {
          duplicateGroup: 'geom-volume',
          lessonRef: 'milestone-08-geometry-core',
        }),
      ],
      [
        insertTemplateKey('geom-circle-area', 'pi r^2', '\\pi #0^{2}', GEOM, 'geometry', 'symbolic', {
          duplicateGroup: 'geom-circle-area',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertTemplateKey('geom-circumference', '2pi r', '2\\pi #0', GEOM, 'geometry', 'symbolic', {
          duplicateGroup: 'geom-circumference',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertTemplateKey('geom-heron', 'Heron', '\\sqrt{s\\left(s-a\\right)\\left(s-b\\right)\\left(s-c\\right)}', GEOM, 'geometry', 'symbolic', {
          duplicateGroup: 'geom-heron',
          lessonRef: 'milestone-08-geometry-core',
        }),
      ],
    ],
  },
  {
    id: 'coordinate',
    label: 'Coordinate',
    capability: GEOM,
    modeVisibility: ['geometry'],
    rows: [
      [
        insertTemplateKey('geom-point', '(x,y)', '\\left(#0,#?\\right)', GEOM, 'coordinate', 'insert', {
          duplicateGroup: 'geom-point',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertTemplateKey('geom-distance', 'dist', '\\sqrt{\\left(#0-#?\\right)^{2}+\\left(#?-#?\\right)^{2}}', GEOM, 'coordinate', 'symbolic', {
          duplicateGroup: 'geom-distance',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertTemplateKey('geom-midpoint', 'mid', '\\left(\\frac{#0+#?}{2},\\frac{#?+#?}{2}\\right)', GEOM, 'coordinate', 'symbolic', {
          duplicateGroup: 'geom-midpoint',
          lessonRef: 'milestone-08-geometry-core',
        }),
      ],
      [
        insertTemplateKey('geom-slope', 'slope', '\\frac{#0-#?}{#?-#?}', GEOM, 'coordinate', 'symbolic', {
          duplicateGroup: 'geom-slope',
          lessonRef: 'milestone-08-geometry-core',
        }),
        insertLatexKey('geom-line-standard', 'Ax+By=C', 'Ax+By=C', GEOM, 'coordinate', {
          duplicateGroup: 'geom-line-standard',
          lessonRef: 'milestone-08-geometry-core',
        }),
      ],
    ],
  },
  {
    id: 'matrixVec',
    label: 'MatrixVec',
    capability: LINEAR,
    modeVisibility: ['matrix', 'vector'],
    rows: [
      [
        insertTemplateKey(
          'lin-matrix-template',
          '[ ]',
          '\\begin{bmatrix}#0 & #?\\\\#? & #?\\end{bmatrix}',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-matrix-template',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['matrix'],
          },
        ),
        insertTemplateKey(
          'lin-vector-template',
          'vec',
          '\\begin{bmatrix}#0\\\\#?\\\\#?\\end{bmatrix}',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-vector-template',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['vector'],
          },
        ),
        insertTemplateKey(
          'lin-transpose',
          'T',
          '^{\\mathsf{T}}',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-transpose',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['matrix'],
          },
        ),
        insertTemplateKey(
          'lin-inverse',
          'A^-1',
          '^{-1}',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-inverse',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['matrix'],
          },
        ),
      ],
      [
        insertTemplateKey(
          'lin-det',
          'det',
          '\\det\\left(#0\\right)',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-det',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['matrix'],
          },
        ),
        insertTemplateKey(
          'lin-dot',
          'dot',
          '#0\\cdot#?',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-dot',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['vector'],
          },
        ),
        insertTemplateKey(
          'lin-cross',
          'cross',
          '#0\\times#?',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-cross',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['vector'],
          },
        ),
        insertTemplateKey(
          'lin-norm',
          'norm',
          '\\left\\lVert#0\\right\\rVert',
          LINEAR,
          'matrixVec',
          'insert',
          {
            duplicateGroup: 'linear-norm',
            lessonRef: 'milestone-04-linear-algebra-core',
            modeVisibility: ['vector'],
          },
        ),
      ],
    ],
  },
];
