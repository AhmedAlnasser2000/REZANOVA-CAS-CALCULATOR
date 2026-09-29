import {
  complex,
  complexAbs,
  complexAdd,
  complexArg,
  complexConjugate,
  complexDiv,
  complexMul,
  complexNeg,
  complexPowInteger,
  complexPrincipalNthRoot,
  complexSqrt,
  type ComplexValue,
} from '../../numeric/complex';

// Complex loci and roots evaluate f(z) thousands of times per view. The public
// complex evaluator walks MathJSON through Compute Engine on every call, so this
// compiles a z-expression once into plain closures. Semantics match it exactly
// (principal log, integer powers exact, other powers exp(w ln b)), which the
// parity test in complex-plan.test.ts checks; operators outside this set return
// `unsupported` and the caller falls back to the public evaluator.

const EPSILON = 1e-12;

type Node = (z: ComplexValue) => ComplexValue | null;

export type GraphComplexPlan = {
  /** f(z), or null where f is undefined (pole, log of 0) or not finite. */
  evaluate(z: ComplexValue): ComplexValue | null;
};

export type GraphComplexPlanResult =
  | { ok: true; plan: GraphComplexPlan }
  | { ok: false; reason: string };

const CONSTANTS: Record<string, ComplexValue> = {
  Pi: complex(Math.PI), ExponentialE: complex(Math.E), ImaginaryUnit: complex(0, 1), GoldenRatio: complex((1 + Math.sqrt(5)) / 2),
};

function exp(value: ComplexValue) {
  const magnitude = Math.exp(value.re);
  return complex(magnitude * Math.cos(value.im), magnitude * Math.sin(value.im));
}
function log(value: ComplexValue) {
  return value.re === 0 && value.im === 0 ? null : complex(Math.log(complexAbs(value)), Math.atan2(value.im, value.re));
}
function sin(value: ComplexValue) {
  return complex(Math.sin(value.re) * Math.cosh(value.im), Math.cos(value.re) * Math.sinh(value.im));
}
function cos(value: ComplexValue) {
  return complex(Math.cos(value.re) * Math.cosh(value.im), -Math.sin(value.re) * Math.sinh(value.im));
}
function sinh(value: ComplexValue) {
  return complex(Math.sinh(value.re) * Math.cos(value.im), Math.cosh(value.re) * Math.sin(value.im));
}
function cosh(value: ComplexValue) {
  return complex(Math.cosh(value.re) * Math.cos(value.im), Math.sinh(value.re) * Math.sin(value.im));
}
function divide(numerator: ComplexValue | null, denominator: ComplexValue | null) {
  return numerator && denominator && complexAbs(denominator) >= EPSILON ? complexDiv(numerator, denominator) : null;
}

const UNARY: Record<string, (value: ComplexValue) => ComplexValue | null> = {
  Negate: complexNeg,
  Exp: exp,
  Ln: log,
  Sqrt: complexSqrt,
  Sin: sin,
  Cos: cos,
  Tan: (value) => divide(sin(value), cos(value)),
  Sec: (value) => divide(complex(1), cos(value)),
  Csc: (value) => divide(complex(1), sin(value)),
  Cot: (value) => divide(cos(value), sin(value)),
  Sinh: sinh,
  Cosh: cosh,
  Tanh: (value) => divide(sinh(value), cosh(value)),
  Conjugate: complexConjugate,
  Real: (value) => complex(value.re),
  ImaginaryPart: (value) => complex(value.im),
  Abs: (value) => complex(complexAbs(value)),
  Arg: (value) => complex(complexArg(value)),
};

function numberOf(node: unknown): number | null {
  if (typeof node === 'number') return node;
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node) {
    const value = Number((node as { num: unknown }).num);
    return Number.isNaN(value) && String((node as { num: unknown }).num) !== 'NaN' ? null : value;
  }
  return null;
}

function compileNode(node: unknown, parameters: Readonly<Record<string, number>>, variable: string): Node | string {
  const number = numberOf(node);
  if (number !== null) { const value = complex(number); return () => value; }
  if (typeof node === 'string') {
    if (node === variable) return (z) => z;
    const constant = CONSTANTS[node];
    if (constant) return () => constant;
    if (node in parameters) { const value = complex(parameters[node]!); return () => value; }
    return `symbol:${node}`;
  }
  if (!Array.isArray(node) || typeof node[0] !== 'string') return 'node';
  const [head, ...operandNodes] = node as [string, ...unknown[]];
  const operands: Node[] = [];
  for (const operand of operandNodes) {
    const compiled = compileNode(operand, parameters, variable);
    if (typeof compiled === 'string') return compiled;
    operands.push(compiled);
  }
  const [a, b] = operands;
  if (head === 'Add') return (z) => {
    let sum = complex(0);
    for (const operand of operands) { const value = operand(z); if (!value) return null; sum = complexAdd(sum, value); }
    return sum;
  };
  if (head === 'Multiply') return (z) => {
    let product = complex(1);
    for (const operand of operands) { const value = operand(z); if (!value) return null; product = complexMul(product, value); }
    return product;
  };
  if (head === 'Subtract' && operands.length === 2) return (z) => {
    const left = a!(z); const right = b!(z); return left && right ? complexAdd(left, complexNeg(right)) : null;
  };
  if (head === 'Divide' && operands.length === 2) return (z) => divide(a!(z), b!(z));
  if ((head === 'Complex' || head === 'Rational') && operands.length === 2) {
    return head === 'Complex'
      ? (z) => { const re = a!(z); const im = b!(z); return re && im ? complex(re.re, im.re) : null; }
      : (z) => divide(a!(z), b!(z));
  }
  if (head === 'Power' && operands.length === 2) {
    const exponent = numberOf(operandNodes[1]);
    if (exponent !== null && Number.isInteger(exponent)) {
      return (z) => {
        const base = a!(z); if (!base) return null;
        if (exponent < 0 && complexAbs(base) < EPSILON) return null;
        return complexPowInteger(base, exponent);
      };
    }
    return (z) => {
      const base = a!(z); const power = b!(z); if (!base || !power) return null;
      const logged = log(base); return logged ? exp(complexMul(power, logged)) : null;
    };
  }
  if (head === 'Root' && operands.length === 2) {
    const degree = numberOf(operandNodes[1]);
    if (degree === null || !Number.isInteger(degree) || degree < 2) return 'root-degree';
    return (z) => { const base = a!(z); return base ? complexPrincipalNthRoot(base, degree) : null; };
  }
  if (head === 'Log' && operands.length >= 1) {
    return operands.length === 1 ? (z) => { const value = a!(z); return value ? log(value) : null; }
      : (z) => { const value = a!(z); const base = b!(z); return value && base ? divide(log(value), log(base)) : null; };
  }
  const unary = UNARY[head];
  if (unary && operands.length === 1) return (z) => { const value = a!(z); return value ? unary(value) : null; };
  return `operator:${head}`;
}

/** Compiles a MathJSON expression in `variable` (default z) with slider values fixed. */
export function compileGraphComplexPlan(
  mathJson: unknown,
  parameters: Readonly<Record<string, number>> = {},
  variable = 'z',
): GraphComplexPlanResult {
  const compiled = compileNode(mathJson, parameters, variable);
  if (typeof compiled === 'string') return { ok: false, reason: compiled };
  return {
    ok: true,
    plan: {
      evaluate(z) {
        const value = compiled(z);
        return value && Number.isFinite(value.re) && Number.isFinite(value.im) ? value : null;
      },
    },
  };
}
