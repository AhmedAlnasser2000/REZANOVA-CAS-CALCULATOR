// Translates a structured complex mapping (MathJSON in z) into a GPU program:
// one op list consumed by the GLSL emitter and a float32 reference
// interpreter. Semantics mirror `equation/complex/numeric-evaluator.ts`
// (principal branches, 1e-10 snapping, division/pole thresholds). The op list
// is dimension-neutral so a later Riemann-surface move can reuse it for
// heights. Output is visual evaluation only.

import type { GraphGpuComplexOpV1, GraphGpuComplexProgramV1 } from '../../contracts/gpu-types';
import type { GraphGpuTranslationRefusal } from './real-program';

export type { GraphGpuComplexProgramV1 } from '../../contracts/gpu-types';

type Complex = { re: number; im: number };

export type GraphGpuComplexOp = GraphGpuComplexOpV1;

const UNARY = new Set([
  'Negate', 'Square', 'Sqrt', 'Ln', 'Exp', 'Sin', 'Cos', 'Tan', 'Arcsin', 'Arccos', 'Arctan',
  'Sinh', 'Cosh', 'Tanh', 'Arsinh', 'Arcosh', 'Artanh', 'Conjugate', 'Real', 'ImaginaryPart', 'Abs', 'Arg',
]);
const ALIASES = new Map([
  ['asin', 'Arcsin'], ['acos', 'Arccos'], ['atan', 'Arctan'], ['Asinh', 'Arsinh'], ['Acosh', 'Arcosh'],
  ['Atanh', 'Artanh'], ['RealPart', 'Real'],
]);
const MAX_OPS = 512;
const MAX_INTEGER_EXPONENT = 1024;

function numericLeaf(node: unknown): number | null {
  if (typeof node === 'number') return Number.isFinite(node) ? node : null;
  if (node && typeof node === 'object' && !Array.isArray(node) && 'num' in node && typeof node.num === 'string') {
    const value = Number(node.num);
    return Number.isFinite(value) ? value : null;
  }
  return null;
}

export function translateGraphComplexMapping(
  mathJson: unknown,
  options: { key: string; symbol?: string },
): GraphGpuComplexProgramV1 | GraphGpuTranslationRefusal {
  const symbol = options.symbol ?? 'z';
  const ops: GraphGpuComplexOp[] = [];
  const parameterNames: string[] = [];
  const visit = (node: unknown): string | null => {
    if (ops.length > MAX_OPS) return 'expression-budget-exceeded';
    if (node === symbol) { ops.push({ kind: 'z' }); return null; }
    const leaf = numericLeaf(node);
    if (leaf !== null) { ops.push({ kind: 'constant', value: { re: leaf, im: 0 } }); return null; }
    if (typeof node === 'string') {
      if (node === 'Pi') { ops.push({ kind: 'constant', value: { re: Math.PI, im: 0 } }); return null; }
      if (node === 'ExponentialE') { ops.push({ kind: 'constant', value: { re: Math.E, im: 0 } }); return null; }
      if (node === 'ImaginaryUnit') { ops.push({ kind: 'constant', value: { re: 0, im: 1 } }); return null; }
      let index = parameterNames.indexOf(node);
      if (index < 0) index = parameterNames.push(node) - 1;
      ops.push({ kind: 'parameter', index });
      return null;
    }
    if (!Array.isArray(node) || typeof node[0] !== 'string') return 'unsupported-node';
    const operator = ALIASES.get(node[0]) ?? node[0];
    const args = node.slice(1);
    if (operator === 'Complex' || operator === 'Rational') {
      const [first, second] = args.map(numericLeaf);
      if (args.length === 2 && first !== null && second !== null) {
        ops.push({ kind: 'constant', value: operator === 'Complex'
          ? { re: first, im: second } : { re: first / second, im: 0 } });
        return null;
      }
      if (operator === 'Rational') return 'unsupported-operator:Rational';
    }
    if (operator === 'Power' && args.length === 2) {
      const exponent = numericLeaf(args[1]);
      if (exponent !== null && Number.isInteger(exponent)) {
        if (Math.abs(exponent) > MAX_INTEGER_EXPONENT) return 'integer-exponent-too-large';
        const failure = visit(args[0]);
        if (failure) return failure;
        ops.push({ kind: 'power-integer', exponent });
        return null;
      }
    }
    if (operator === 'Root' && args.length === 2) {
      const degree = numericLeaf(args[1]);
      if (degree === null || !Number.isInteger(Math.round(degree)) || Math.round(degree) < 2) return 'unsupported-root-degree';
      const failure = visit(args[0]);
      if (failure) return failure;
      ops.push({ kind: 'root', degree: Math.round(degree) });
      return null;
    }
    const arityOk = UNARY.has(operator) ? args.length === 1
      : operator === 'Add' || operator === 'Multiply' ? args.length >= 1
        : operator === 'Subtract' || operator === 'Divide' || operator === 'Power' || operator === 'Complex' ? args.length === 2
          : operator === 'Log' ? args.length === 1 || args.length === 2 : false;
    if (!arityOk) return `unsupported-operator:${operator}`;
    for (const arg of args) {
      const failure = visit(arg);
      if (failure) return failure;
    }
    ops.push({ kind: 'operator', operator, arity: args.length });
    return null;
  };
  const failure = visit(mathJson);
  if (failure) return { ok: false, reason: failure };
  return { kind: 'complex', key: options.key, ops, parameterNames, glsl: emitComplexGlsl(ops) };
}

export const GRAPH_GPU_COMPLEX_PRELUDE = `
const float GRAPH_EPS = 1e-10;
vec2 cSnap(vec2 a) { return vec2(abs(a.x) < GRAPH_EPS ? 0.0 : a.x, abs(a.y) < GRAPH_EPS ? 0.0 : a.y); }
vec2 cMul(vec2 a, vec2 b) { return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
float cAbs(vec2 a) { return length(a); }
vec2 cDiv(vec2 a, vec2 b, inout bool ok) {
  float d = dot(b, b);
  ok = ok && d >= GRAPH_EPS;
  return d >= GRAPH_EPS ? vec2(a.x * b.x + a.y * b.y, a.y * b.x - a.x * b.y) / d : vec2(0.0);
}
vec2 cExp(vec2 a) { return exp(a.x) * vec2(cos(a.y), sin(a.y)); }
vec2 cLog(vec2 a, inout bool ok) {
  vec2 s = cSnap(a);
  bool zero = s.x == 0.0 && s.y == 0.0;
  ok = ok && !zero;
  return zero ? vec2(0.0) : vec2(log(length(s)), atan(s.y, s.x));
}
vec2 cSqrt(vec2 a) {
  if (a.y == 0.0 && a.x >= 0.0) return vec2(sqrt(a.x), 0.0);
  float m = length(a);
  float s = a.y < 0.0 ? -1.0 : 1.0;
  return cSnap(vec2(sqrt(max((m + a.x) * 0.5, 0.0)), s * sqrt(max((m - a.x) * 0.5, 0.0))));
}
vec2 cSin(vec2 a) { return vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y)); }
vec2 cCos(vec2 a) { return vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y)); }
vec2 cSinh(vec2 a) { return vec2(sinh(a.x) * cos(a.y), cosh(a.x) * sin(a.y)); }
vec2 cCosh(vec2 a) { return vec2(cosh(a.x) * cos(a.y), sinh(a.x) * sin(a.y)); }
vec2 cAsin(vec2 a, inout bool ok) {
  vec2 root = cSqrt(vec2(1.0, 0.0) - cMul(a, a));
  return cMul(vec2(0.0, -1.0), cLog(cMul(vec2(0.0, 1.0), a) + root, ok));
}
vec2 cAtan(vec2 a, inout bool ok) {
  vec2 iz = cMul(vec2(0.0, 1.0), a);
  return cMul(vec2(0.0, 0.5), cLog(vec2(1.0, 0.0) - iz, ok) - cLog(vec2(1.0, 0.0) + iz, ok));
}
vec2 cRoot(vec2 a, float n) {
  vec2 s = cSnap(a);
  if (s.x == 0.0 && s.y == 0.0) return vec2(0.0);
  float angle = atan(s.y, s.x) / n;
  return pow(length(s), 1.0 / n) * vec2(cos(angle), sin(angle));
}
`;

function emitComplexGlsl(ops: GraphGpuComplexOp[]): string {
  const lines: string[] = [];
  const stack: string[] = [];
  let next = 0;
  const assign = (expression: string, guard?: string) => {
    const name = `c${next}`;
    next += 1;
    if (guard) lines.push(`  ok = ok && (${guard});`);
    lines.push(`  vec2 ${name} = cSnap(${expression});`);
    lines.push(`  ok = ok && abs(${name}.x) < 3e38 && abs(${name}.y) < 3e38;`);
    stack.push(name);
  };
  const constant = (value: Complex) => `vec2(${Math.fround(value.re).toPrecision(9)}, ${Math.fround(value.im).toPrecision(9)})`;
  for (const op of ops) {
    if (op.kind === 'z') { stack.push('z'); continue; }
    if (op.kind === 'constant') { stack.push(constant(op.value)); continue; }
    if (op.kind === 'parameter') { stack.push(`vec2(uGraphParameters[${op.index}], 0.0)`); continue; }
    if (op.kind === 'power-integer') {
      const base = stack.pop()!;
      if (op.exponent === 0) { assign('vec2(1.0, 0.0)'); continue; }
      let remaining = Math.abs(op.exponent);
      let result = 'vec2(1.0, 0.0)';
      let factor = base;
      const temps: string[] = [];
      while (remaining > 0) {
        if (remaining % 2 === 1) {
          const name = `p${next}_${temps.length}`; temps.push(name);
          lines.push(`  vec2 ${name} = cMul(${result}, ${factor});`); result = name;
        }
        remaining = Math.floor(remaining / 2);
        if (remaining > 0) {
          const name = `p${next}_${temps.length}`; temps.push(name);
          lines.push(`  vec2 ${name} = cMul(${factor}, ${factor});`); factor = name;
        }
      }
      assign(op.exponent < 0 ? `cDiv(vec2(1.0, 0.0), ${result}, ok)` : result);
      continue;
    }
    if (op.kind === 'root') { assign(`cRoot(${stack.pop()!}, ${op.degree.toFixed(1)})`); continue; }
    const args = stack.splice(stack.length - op.arity, op.arity);
    const [a, b] = args;
    switch (op.operator) {
      case 'Add': assign(args.join(' + ')); break;
      case 'Subtract': assign(`${a} - ${b}`); break;
      case 'Multiply': assign(args.reduce((left, right) => `cMul(${left}, ${right})`)); break;
      case 'Negate': assign(`-(${a})`); break;
      case 'Divide': assign(`cDiv(${a}, ${b}, ok)`); break;
      case 'Complex': assign(`vec2(${a}.x, ${b}.x)`, `abs(${a}.y) < GRAPH_EPS && abs(${b}.y) < GRAPH_EPS`); break;
      case 'Power': assign(`cExp(cMul(${b}, cLog(${a}, ok)))`); break;
      case 'Square': assign(`cMul(${a}, ${a})`); break;
      case 'Sqrt': assign(`cSqrt(${a})`); break;
      case 'Ln': assign(`cLog(${a}, ok)`); break;
      case 'Log': assign(op.arity === 1 ? `cLog(${a}, ok)` : `cDiv(cLog(${a}, ok), cLog(${b}, ok), ok)`); break;
      case 'Exp': assign(`cExp(${a})`); break;
      case 'Sin': assign(`cSin(${a})`); break;
      case 'Cos': assign(`cCos(${a})`); break;
      case 'Tan': assign(`cDiv(cSin(${a}), cCos(${a}), ok)`); break;
      case 'Arcsin': assign(`cAsin(${a}, ok)`); break;
      case 'Arccos': assign(`vec2(1.5707963, 0.0) - cAsin(${a}, ok)`); break;
      case 'Arctan': assign(`cAtan(${a}, ok)`); break;
      case 'Sinh': assign(`cSinh(${a})`); break;
      case 'Cosh': assign(`cCosh(${a})`); break;
      case 'Tanh': assign(`cDiv(cSinh(${a}), cCosh(${a}), ok)`); break;
      case 'Arsinh': assign(`cLog(${a} + cSqrt(cMul(${a}, ${a}) + vec2(1.0, 0.0)), ok)`); break;
      case 'Arcosh': assign(`cLog(${a} + cMul(cSqrt(${a} + vec2(1.0, 0.0)), cSqrt(${a} - vec2(1.0, 0.0))), ok)`); break;
      case 'Artanh': assign(`0.5 * (cLog(vec2(1.0, 0.0) + ${a}, ok) - cLog(vec2(1.0, 0.0) - ${a}, ok))`); break;
      case 'Conjugate': assign(`vec2(${a}.x, -${a}.y)`); break;
      case 'Real': assign(`vec2(${a}.x, 0.0)`); break;
      case 'ImaginaryPart': assign(`vec2(${a}.y, 0.0)`); break;
      case 'Abs': assign(`vec2(cAbs(${a}), 0.0)`); break;
      case 'Arg': assign(`vec2((cSnap(${a}).x == 0.0 && cSnap(${a}).y == 0.0) ? 0.0 : atan(cSnap(${a}).y, cSnap(${a}).x), 0.0)`); break;
      default: throw new Error(`unreachable complex operator ${op.operator}`);
    }
  }
  const result = stack[0] ?? 'vec2(0.0)';
  return `vec2 graphComplex(vec2 z, out bool ok) {\n  ok = true;\n${lines.join('\n')}\n  vec2 graphResult = cSnap(${result});\n  ok = ok && abs(graphResult.x) < 3e38 && abs(graphResult.y) < 3e38;\n  return graphResult;\n}\n`;
}

/** Float32 reference interpreter with the GLSL program's exact rules. */
export function interpretGraphComplexProgramF32(
  program: GraphGpuComplexProgramV1,
  z: Complex,
  parameters: readonly number[] = [],
): Complex | null {
  const f = Math.fround;
  const eps = 1e-10;
  let ok = true;
  const snap = (a: Complex): Complex => ({
    re: Math.abs(a.re) < eps ? 0 : f(a.re), im: Math.abs(a.im) < eps ? 0 : f(a.im),
  });
  const mul = (a: Complex, b: Complex) => ({ re: f(a.re * b.re - a.im * b.im), im: f(a.re * b.im + a.im * b.re) });
  const div = (a: Complex, b: Complex) => {
    const d = f(b.re * b.re + b.im * b.im);
    ok = ok && d >= eps;
    return d >= eps ? { re: f((a.re * b.re + a.im * b.im) / d), im: f((a.im * b.re - a.re * b.im) / d) } : { re: 0, im: 0 };
  };
  const add = (a: Complex, b: Complex) => ({ re: f(a.re + b.re), im: f(a.im + b.im) });
  const sub = (a: Complex, b: Complex) => ({ re: f(a.re - b.re), im: f(a.im - b.im) });
  const exp = (a: Complex) => { const m = Math.exp(a.re); return { re: f(m * Math.cos(a.im)), im: f(m * Math.sin(a.im)) }; };
  const log = (a: Complex) => {
    const s = snap(a);
    if (s.re === 0 && s.im === 0) { ok = false; return { re: 0, im: 0 }; }
    return { re: f(Math.log(Math.hypot(s.re, s.im))), im: f(Math.atan2(s.im, s.re)) };
  };
  const sqrt = (a: Complex) => {
    if (a.im === 0 && a.re >= 0) return { re: f(Math.sqrt(a.re)), im: 0 };
    const m = Math.hypot(a.re, a.im);
    return snap({ re: Math.sqrt(Math.max((m + a.re) / 2, 0)), im: (a.im < 0 ? -1 : 1) * Math.sqrt(Math.max((m - a.re) / 2, 0)) });
  };
  const sin = (a: Complex) => ({ re: f(Math.sin(a.re) * Math.cosh(a.im)), im: f(Math.cos(a.re) * Math.sinh(a.im)) });
  const cos = (a: Complex) => ({ re: f(Math.cos(a.re) * Math.cosh(a.im)), im: f(-Math.sin(a.re) * Math.sinh(a.im)) });
  const sinh = (a: Complex) => ({ re: f(Math.sinh(a.re) * Math.cos(a.im)), im: f(Math.cosh(a.re) * Math.sin(a.im)) });
  const cosh = (a: Complex) => ({ re: f(Math.cosh(a.re) * Math.cos(a.im)), im: f(Math.sinh(a.re) * Math.sin(a.im)) });
  const one = { re: 1, im: 0 };
  const i = { re: 0, im: 1 };
  const asin = (a: Complex) => mul({ re: 0, im: -1 }, log(add(mul(i, a), sqrt(sub(one, mul(a, a))))));
  const stack: Complex[] = [];
  for (const op of program.ops) {
    let value: Complex;
    if (op.kind === 'z') value = { re: f(z.re), im: f(z.im) };
    else if (op.kind === 'constant') value = { re: f(op.value.re), im: f(op.value.im) };
    else if (op.kind === 'parameter') value = { re: f(parameters[op.index] ?? Number.NaN), im: 0 };
    else if (op.kind === 'power-integer') {
      const base = stack.pop()!;
      let remaining = Math.abs(op.exponent); let result = one; let factor = base;
      while (remaining > 0) {
        if (remaining % 2 === 1) result = mul(result, factor);
        remaining = Math.floor(remaining / 2);
        if (remaining > 0) factor = mul(factor, factor);
      }
      value = op.exponent < 0 ? div(one, result) : result;
    } else if (op.kind === 'root') {
      const s = snap(stack.pop()!);
      if (s.re === 0 && s.im === 0) value = { re: 0, im: 0 };
      else {
        const angle = Math.atan2(s.im, s.re) / op.degree; const m = Math.pow(Math.hypot(s.re, s.im), 1 / op.degree);
        value = { re: f(m * Math.cos(angle)), im: f(m * Math.sin(angle)) };
      }
    } else {
      const args = stack.splice(stack.length - op.arity, op.arity);
      const [a = one, b = one] = args;
      switch (op.operator) {
        case 'Add': value = args.reduce(add, { re: 0, im: 0 }); break;
        case 'Subtract': value = sub(a, b); break;
        case 'Multiply': value = args.slice(1).reduce(mul, a); break;
        case 'Negate': value = { re: -a.re, im: -a.im }; break;
        case 'Divide': value = div(a, b); break;
        case 'Complex': ok = ok && Math.abs(a.im) < eps && Math.abs(b.im) < eps; value = { re: a.re, im: b.re }; break;
        case 'Power': value = exp(mul(b, log(a))); break;
        case 'Square': value = mul(a, a); break;
        case 'Sqrt': value = sqrt(a); break;
        case 'Ln': value = log(a); break;
        case 'Log': value = op.arity === 1 ? log(a) : div(log(a), log(b)); break;
        case 'Exp': value = exp(a); break;
        case 'Sin': value = sin(a); break;
        case 'Cos': value = cos(a); break;
        case 'Tan': value = div(sin(a), cos(a)); break;
        case 'Arcsin': value = asin(a); break;
        case 'Arccos': value = sub({ re: f(Math.PI / 2), im: 0 }, asin(a)); break;
        case 'Arctan': { const iz = mul(i, a); value = mul({ re: 0, im: 0.5 }, sub(log(sub(one, iz)), log(add(one, iz)))); break; }
        case 'Sinh': value = sinh(a); break;
        case 'Cosh': value = cosh(a); break;
        case 'Tanh': value = div(sinh(a), cosh(a)); break;
        case 'Arsinh': value = log(add(a, sqrt(add(mul(a, a), one)))); break;
        case 'Arcosh': value = log(add(a, mul(sqrt(add(a, one)), sqrt(sub(a, one))))); break;
        case 'Artanh': { const d = sub(log(add(one, a)), log(sub(one, a))); value = { re: f(0.5 * d.re), im: f(0.5 * d.im) }; break; }
        case 'Conjugate': value = { re: a.re, im: -a.im }; break;
        case 'Real': value = { re: a.re, im: 0 }; break;
        case 'ImaginaryPart': value = { re: a.im, im: 0 }; break;
        case 'Abs': value = { re: f(Math.hypot(a.re, a.im)), im: 0 }; break;
        case 'Arg': { const s = snap(a); value = { re: s.re === 0 && s.im === 0 ? 0 : f(Math.atan2(s.im, s.re)), im: 0 }; break; }
        default: return null;
      }
    }
    value = snap(value);
    ok = ok && Math.abs(value.re) < 3e38 && Math.abs(value.im) < 3e38;
    stack.push(value);
  }
  const result = stack[0];
  return ok && result ? result : null;
}
