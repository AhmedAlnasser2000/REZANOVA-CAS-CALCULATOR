import type {
  CanonicalizationChange,
  CanonicalizationContext,
} from '../../types/calculator';

const FUNCTION_COMMANDS: Record<string, string> = {
  sin: '\\sin',
  cos: '\\cos',
  tan: '\\tan',
  sec: '\\sec',
  csc: '\\csc',
  cot: '\\cot',
  asin: '\\arcsin',
  acos: '\\arccos',
  atan: '\\arctan',
  ln: '\\ln',
  log: '\\log',
  abs: '\\operatorname{abs}',
};

const SPECIAL_FUNCTION_COMMANDS: Record<string, string> = {
  erf: '\\operatorname{erf}',
  erfi: '\\operatorname{erfi}',
  si: '\\operatorname{Si}',
  ci: '\\operatorname{Ci}',
  ei: '\\operatorname{Ei}',
  li: '\\operatorname{li}',
  fresnels: '\\operatorname{FresnelS}',
  fresnelc: '\\operatorname{FresnelC}',
  ellipticf: '\\operatorname{EllipticF}',
  elliptice: '\\operatorname{EllipticE}',
  ellipticpi: '\\operatorname{EllipticPi}',
};

const ALL_FUNCTION_COMMANDS: Record<string, string> = {
  ...FUNCTION_COMMANDS,
  ...SPECIAL_FUNCTION_COMMANDS,
};

export const COMMAND_FUNCTION_NAMES = new Map(
  Object.entries(ALL_FUNCTION_COMMANDS).map(([name, command]) => [command, name]),
);

const RESERVED_FUNCTIONS = new Set([
  'sin',
  'cos',
  'tan',
  'sec',
  'csc',
  'cot',
  'asin',
  'acos',
  'atan',
  'ln',
  'log',
  'sqrt',
  'abs',
]);
const RESERVED_SPECIAL_FUNCTIONS = new Set(Object.keys(SPECIAL_FUNCTION_COMMANDS));

export function canonicalCommandFor(name: string) {
  return ALL_FUNCTION_COMMANDS[name] ?? '';
}

export function isReservedCanonicalFunction(
  tokenLower: string,
  options: {
    enableSpecialFunctions?: boolean;
    canonicalizationScope?: 'all' | 'special-functions';
  },
) {
  return (
    options.canonicalizationScope !== 'special-functions'
    && RESERVED_FUNCTIONS.has(tokenLower)
  ) || (
    Boolean(options.enableSpecialFunctions)
    && RESERVED_SPECIAL_FUNCTIONS.has(tokenLower)
  );
}

export function isSpecialFunctionContext(
  context?: Pick<CanonicalizationContext, 'mode' | 'screenHint'> | null,
) {
  if (context?.mode !== 'calculus') {
    return false;
  }

  const screenHint = context.screenHint ?? '';
  return screenHint === 'derivative'
    || screenHint === 'derivativeAtPoint'
    || screenHint === 'partialDerivative'
    || screenHint === 'implicitDerivative'
    || screenHint === 'derivativePoint'
    || screenHint === 'indefinite-integral'
    || screenHint === 'indefiniteIntegral'
    || screenHint === 'definite-integral'
    || screenHint === 'definiteIntegral'
    || screenHint === 'improper-integral'
    || screenHint === 'improperIntegral'
    || screenHint === 'integral'
    || screenHint === 'integrals';
}

export function normalizeSplitFunctionTokens(
  source: string,
  changes: CanonicalizationChange[],
  options: {
    enableSpecialFunctions?: boolean;
  } = {},
) {
  let next = source.replace(
    /(^|[^\\A-Za-z])l(?:\s|\\,|\\:|\\;|\\!|\\thinspace|\\medspace|\\quad|\\qquad)+n(?=\s*(?:\\left\s*)?\()/g,
    (match, prefix: string) => {
      const after = `${prefix}ln`;
      changes.push({ kind: 'function-token', before: match, after });
      return after;
    },
  );

  if (!options.enableSpecialFunctions) {
    return next;
  }

  const spacing = '(?:\\s|\\\\,|\\\\:|\\\\;|\\\\!|\\\\thinspace|\\\\medspace|\\\\quad|\\\\qquad)+';
  const splitSpecials: Array<{ pattern: RegExp; joined: string }> = [
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])S${spacing}i(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'Si' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])C${spacing}i(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'Ci' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])E${spacing}i(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'Ei' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])l${spacing}i(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'li' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])Fresnel${spacing}S(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'FresnelS' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])Fresnel${spacing}C(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'FresnelC' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])Elliptic${spacing}F(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'EllipticF' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])Elliptic${spacing}E(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'EllipticE' },
    { pattern: new RegExp(`(^|[^\\\\A-Za-z])Elliptic${spacing}Pi(?=\\s*(?:\\\\left\\s*)?\\()`, 'g'), joined: 'EllipticPi' },
  ];

  for (const { pattern, joined } of splitSpecials) {
    next = next.replace(pattern, (match, prefix: string) => {
      const after = `${prefix}${joined}`;
      changes.push({ kind: 'function-token', before: match, after });
      return after;
    });
  }

  return next;
}
