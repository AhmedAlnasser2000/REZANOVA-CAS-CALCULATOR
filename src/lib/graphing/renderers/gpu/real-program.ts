import type { GraphGpuRealOpV1, GraphGpuRealProgramV1 } from '../../contracts/gpu-types';
import type { CompiledGraphExpressionPlan } from '../../evaluator/types';

export type { GraphGpuRealProgramV1 } from '../../contracts/gpu-types';

// Translates a compiled real Graph evaluator plan into a GPU program: one op
// list consumed by both the GLSL emitter and a float32 reference interpreter.
// Semantics mirror `evaluator/evaluate.ts` (JavaScript Math) operator by
// operator, with explicit guards wherever GLSL leaves behaviour undefined.
// Output is visual evaluation only; it never feeds Graph mathematics.

export const GRAPH_GPU_REAL_OPERATORS = new Set([
  'Abs', 'Add', 'Arccos', 'Arcosh', 'Arcsin', 'Arctan', 'Arsinh', 'Artanh', 'Ceil', 'Cos', 'Cosh', 'Cot',
  'Csc', 'Divide', 'Exp', 'Floor', 'Ln', 'Log', 'Max', 'Min', 'Mod', 'Multiply', 'Negate', 'Power',
  'Rational', 'Root', 'Round', 'Sec', 'Sign', 'Sin', 'Sinh', 'Sqrt', 'Tan', 'Tanh',
]);

export type GraphGpuRealOp = GraphGpuRealOpV1;

export type GraphGpuTranslationRefusal = { ok: false; reason: string };

/** Largest finite magnitude trusted from float32 arithmetic (below FLT_MAX). */
export const GRAPH_GPU_FLOAT_LIMIT = 3e38;

function glslFloat(value: number) {
  if (!Number.isFinite(value)) return null;
  const text = Math.fround(value).toPrecision(9);
  return /[.e]/.test(text) ? text : `${text}.0`;
}

export function translateGraphRealPlan(
  plan: CompiledGraphExpressionPlan,
  coordinates: { x: string; y: string } = { x: 'x', y: 'y' },
  options: {
    /** GLSL function name; relations with several expressions need distinct names. */
    functionName?: string;
    /** Shared parameter slots when several expressions feed one shader. */
    parameterNames?: string[];
  } = {},
): GraphGpuRealProgramV1 | GraphGpuTranslationRefusal {
  const functionName = options.functionName ?? 'graphReal';
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(functionName)) return { ok: false, reason: 'invalid-function-name' };
  const parameterNames: string[] = options.parameterNames ?? [];
  const ops: GraphGpuRealOp[] = [];
  for (const instruction of plan.instructions) {
    if (instruction.kind === 'literal') {
      if (!Number.isFinite(Math.fround(instruction.value))) return { ok: false, reason: 'literal-outside-float32' };
      ops.push({ kind: 'literal', value: instruction.value });
    } else if (instruction.kind === 'symbol') {
      if (instruction.symbol === coordinates.x) ops.push({ kind: 'coordinate', axis: 'x' });
      else if (instruction.symbol === coordinates.y) ops.push({ kind: 'coordinate', axis: 'y' });
      else {
        let index = parameterNames.indexOf(instruction.symbol);
        if (index < 0) index = parameterNames.push(instruction.symbol) - 1;
        ops.push({ kind: 'parameter', index });
      }
    } else {
      if (!GRAPH_GPU_REAL_OPERATORS.has(instruction.operator)) {
        return { ok: false, reason: `unsupported-operator:${instruction.operator}` };
      }
      ops.push({ kind: 'operator', operator: instruction.operator, arity: instruction.arity });
    }
  }
  const glsl = emitRealGlsl(ops, functionName);
  if (!glsl.ok) return glsl;
  return { kind: 'real', key: `${plan.planId}@${plan.sourceRevision}`, ops, parameterNames, glsl: glsl.source };
}

export const GRAPH_GPU_REAL_PRELUDE = `
float graphJsPow(float a, float b, inout bool ok) {
  if (b == 0.0) return 1.0;
  if (a > 0.0) return exp2(b * log2(a));
  if (a == 0.0) { ok = ok && b > 0.0; return 0.0; }
  if (b != floor(b)) { ok = false; return 0.0; }
  float magnitude = exp2(b * log2(-a));
  return mod(b, 2.0) == 1.0 ? -magnitude : magnitude;
}
float graphJsRoot(float a, float n, inout bool ok) {
  if (a < 0.0 && n == floor(n) && mod(n, 2.0) == 1.0) return -graphJsPow(-a, 1.0 / n, ok);
  return graphJsPow(a, 1.0 / n, ok);
}
`;

function emitRealGlsl(ops: GraphGpuRealOp[], functionName: string): { ok: true; source: string } | GraphGpuTranslationRefusal {
  const lines: string[] = [];
  const stack: string[] = [];
  let next = 0;
  const assign = (expression: string, guard?: string) => {
    const name = `v${next}`;
    next += 1;
    if (guard) lines.push(`  ok = ok && (${guard});`);
    lines.push(`  float ${name} = ${expression};`);
    lines.push(`  ok = ok && abs(${name}) < ${GRAPH_GPU_FLOAT_LIMIT.toExponential()};`);
    stack.push(name);
  };
  for (const op of ops) {
    if (op.kind === 'literal') { stack.push(glslFloat(op.value)!); continue; }
    if (op.kind === 'coordinate') { stack.push(`p.${op.axis}`); continue; }
    if (op.kind === 'parameter') { stack.push(`uGraphParameters[${op.index}]`); continue; }
    if (stack.length < op.arity) return { ok: false, reason: 'invalid-plan' };
    const args = stack.splice(stack.length - op.arity, op.arity);
    const [a, b] = args;
    switch (op.operator) {
      case 'Add': assign(args.join(' + ')); break;
      case 'Multiply': assign(args.join(' * ')); break;
      case 'Max': assign(args.reduce((left, right) => `max(${left}, ${right})`)); break;
      case 'Min': assign(args.reduce((left, right) => `min(${left}, ${right})`)); break;
      case 'Negate': assign(`-(${a})`); break;
      case 'Abs': assign(`abs(${a})`); break;
      case 'Divide': case 'Rational': assign(`${a} / ${b}`, `${b} != 0.0`); break;
      case 'Mod': assign(`${a} - ${b} * trunc(${a} / ${b})`, `${b} != 0.0`); break;
      case 'Power': assign(`graphJsPow(${a}, ${b}, ok)`); break;
      case 'Root': assign(`graphJsRoot(${a}, ${b}, ok)`); break;
      case 'Sqrt': assign(`sqrt(max(${a}, 0.0))`, `${a} >= 0.0`); break;
      case 'Exp': assign(`exp(${a})`); break;
      case 'Ln': assign(`log(max(${a}, 1e-38))`, `${a} > 0.0`); break;
      case 'Log': assign(op.arity === 1
        ? `log(max(${a}, 1e-38)) * 0.4342944819`
        : `log(max(${a}, 1e-38)) / log(max(${b}, 1e-38))`,
      op.arity === 1 ? `${a} > 0.0` : `${a} > 0.0 && ${b} > 0.0 && ${b} != 1.0`); break;
      case 'Sin': assign(`sin(${a})`); break;
      case 'Cos': assign(`cos(${a})`); break;
      case 'Tan': assign(`tan(${a})`); break;
      case 'Cot': assign(`1.0 / tan(${a})`, `tan(${a}) != 0.0`); break;
      case 'Csc': assign(`1.0 / sin(${a})`, `sin(${a}) != 0.0`); break;
      case 'Sec': assign(`1.0 / cos(${a})`, `cos(${a}) != 0.0`); break;
      case 'Arcsin': assign(`asin(clamp(${a}, -1.0, 1.0))`, `abs(${a}) <= 1.0`); break;
      case 'Arccos': assign(`acos(clamp(${a}, -1.0, 1.0))`, `abs(${a}) <= 1.0`); break;
      case 'Arctan': assign(`atan(${a})`); break;
      case 'Sinh': assign(`sinh(${a})`); break;
      case 'Cosh': assign(`cosh(${a})`); break;
      case 'Tanh': assign(`tanh(${a})`); break;
      case 'Arsinh': assign(`asinh(${a})`); break;
      case 'Arcosh': assign(`acosh(max(${a}, 1.0))`, `${a} >= 1.0`); break;
      case 'Artanh': assign(`atanh(clamp(${a}, -0.99999994, 0.99999994))`, `abs(${a}) < 1.0`); break;
      case 'Floor': assign(`floor(${a})`); break;
      case 'Ceil': assign(`ceil(${a})`); break;
      case 'Round': assign(`floor(${a} + 0.5)`); break;
      case 'Sign': assign(`sign(${a})`); break;
      default: return { ok: false, reason: `unsupported-operator:${op.operator}` };
    }
  }
  if (stack.length !== 1) return { ok: false, reason: 'invalid-plan' };
  if (next === 0) {
    // A bare literal/coordinate still goes through the finiteness guard.
    lines.push(`  float v0 = ${stack[0]};`, `  ok = ok && abs(v0) < ${GRAPH_GPU_FLOAT_LIMIT.toExponential()};`);
    stack[0] = 'v0';
  }
  return {
    ok: true,
    source: `float ${functionName}(vec2 p, out bool ok) {\n  ok = true;\n${lines.join('\n')}\n  return ${stack[0]};\n}\n`,
  };
}

/**
 * Float32 reference interpreter with the GLSL program's exact domain rules.
 * Transcendentals are float64-then-rounded, so it bounds GPU driver error.
 */
export function interpretGraphRealProgramF32(
  program: GraphGpuRealProgramV1,
  x: number,
  y: number,
  parameters: readonly number[] = [],
): number | null {
  const f = Math.fround;
  const stack: number[] = [];
  let ok = true;
  const jsPow = (a: number, b: number) => {
    if (b === 0) return 1;
    if (a > 0) return f(Math.pow(a, b));
    if (a === 0) { ok = ok && b > 0; return 0; }
    if (b !== Math.floor(b)) { ok = false; return 0; }
    const magnitude = f(Math.pow(-a, b));
    return ((b % 2) + 2) % 2 === 1 ? -magnitude : magnitude;
  };
  for (const op of program.ops) {
    if (op.kind === 'literal') { stack.push(f(op.value)); continue; }
    if (op.kind === 'coordinate') { stack.push(f(op.axis === 'x' ? x : y)); continue; }
    if (op.kind === 'parameter') { stack.push(f(parameters[op.index] ?? Number.NaN)); continue; }
    const args = stack.splice(stack.length - op.arity, op.arity);
    const [a = 0, b = 0] = args;
    let value: number;
    switch (op.operator) {
      case 'Add': value = args.reduce((sum, item) => f(sum + item), 0); break;
      case 'Multiply': value = args.reduce((product, item) => f(product * item), 1); break;
      case 'Max': value = Math.max(...args); break;
      case 'Min': value = Math.min(...args); break;
      case 'Negate': value = -a; break;
      case 'Abs': value = Math.abs(a); break;
      case 'Divide': case 'Rational': ok = ok && b !== 0; value = a / b; break;
      case 'Mod': ok = ok && b !== 0; value = a - b * Math.trunc(f(a / b)); break;
      case 'Power': value = jsPow(a, b); break;
      case 'Root': value = a < 0 && Number.isInteger(b) && Math.abs(b % 2) === 1 ? -jsPow(-a, f(1 / b)) : jsPow(a, f(1 / b)); break;
      case 'Sqrt': ok = ok && a >= 0; value = Math.sqrt(Math.max(a, 0)); break;
      case 'Exp': value = Math.exp(a); break;
      case 'Ln': ok = ok && a > 0; value = Math.log(Math.max(a, 1e-38)); break;
      case 'Log':
        if (op.arity === 1) { ok = ok && a > 0; value = Math.log10(Math.max(a, 1e-38)); } else {
          ok = ok && a > 0 && b > 0 && b !== 1; value = Math.log(Math.max(a, 1e-38)) / Math.log(Math.max(b, 1e-38));
        }
        break;
      case 'Sin': value = Math.sin(a); break;
      case 'Cos': value = Math.cos(a); break;
      case 'Tan': value = Math.tan(a); break;
      case 'Cot': ok = ok && f(Math.tan(a)) !== 0; value = 1 / Math.tan(a); break;
      case 'Csc': ok = ok && f(Math.sin(a)) !== 0; value = 1 / Math.sin(a); break;
      case 'Sec': ok = ok && f(Math.cos(a)) !== 0; value = 1 / Math.cos(a); break;
      case 'Arcsin': ok = ok && Math.abs(a) <= 1; value = Math.asin(Math.max(-1, Math.min(1, a))); break;
      case 'Arccos': ok = ok && Math.abs(a) <= 1; value = Math.acos(Math.max(-1, Math.min(1, a))); break;
      case 'Arctan': value = Math.atan(a); break;
      case 'Sinh': value = Math.sinh(a); break;
      case 'Cosh': value = Math.cosh(a); break;
      case 'Tanh': value = Math.tanh(a); break;
      case 'Arsinh': value = Math.asinh(a); break;
      case 'Arcosh': ok = ok && a >= 1; value = Math.acosh(Math.max(a, 1)); break;
      case 'Artanh': ok = ok && Math.abs(a) < 1; value = Math.atanh(Math.max(-0.99999994, Math.min(0.99999994, a))); break;
      case 'Floor': value = Math.floor(a); break;
      case 'Ceil': value = Math.ceil(a); break;
      case 'Round': value = Math.floor(f(a + 0.5)); break;
      case 'Sign': value = Math.sign(a); break;
      default: return null;
    }
    value = f(value);
    ok = ok && Math.abs(value) < GRAPH_GPU_FLOAT_LIMIT;
    stack.push(value);
  }
  const result = stack[0];
  return ok && result !== undefined && Math.abs(result) < GRAPH_GPU_FLOAT_LIMIT ? result : null;
}
