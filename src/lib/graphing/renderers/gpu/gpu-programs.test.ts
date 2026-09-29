import { describe, expect, it } from 'vitest';
import { createComplexNumericEvaluator } from '../../../equation/complex-domain-public';
import type { GraphExpressionIR } from '../../contracts';
import { compileGraphExpression, createGraphExpressionEvaluator } from '../../evaluator';
import { compileGraphComplexPlan } from '../../evaluator/complex-plan';
import { buildGraphGpuComplexLocusProgram, GRAPH_GPU_COMPLEX_LOCUS_MAX_CLAUSES } from './complex-locus';
import { interpretGraphComplexProgramF32, translateGraphComplexMapping } from './complex-program';
import { interpretGraphRealProgramF32, translateGraphRealPlan } from './real-program';

// Semantic parity: the float32 reference interpreters (which carry exactly the
// GLSL programs' domain rules) must agree with the CPU authorities on where an
// expression is defined, and on its value within float32 tolerance.

const REAL_CASES: Array<[string, GraphExpressionIR['mathJson']]> = [
  ['circle', ['Add', ['Power', 'x', 2], ['Power', 'y', 2]]],
  ['rational', ['Divide', ['Add', 'x', 1], ['Add', ['Multiply', 'x', 'y'], -1]]],
  ['negative-base power', ['Power', ['Add', 'x', -1], 3]],
  ['non-integer power', ['Power', 'x', ['Rational', 1, 3]]],
  ['variable exponent', ['Power', 'y', ['Add', ['Sin', 'x'], ['Negate', ['Cos', 'x']]]]],
  ['odd root', ['Root', 'x', 3]],
  ['even root', ['Root', 'x', 4]],
  ['sqrt domain', ['Sqrt', ['Add', 4, ['Negate', ['Power', 'x', 2]]]]],
  ['logs', ['Add', ['Ln', 'x'], ['Log', 'y'], ['Log', 'x', ['Add', 'y', 3]]]],
  ['js modulo', ['Mod', ['Multiply', 3, 'x'], ['Add', 'y', 0.5]]],
  ['rounding', ['Add', ['Round', ['Multiply', 2, 'x']], ['Floor', 'y'], ['Ceil', 'x'], ['Sign', 'y']]],
  ['reciprocal trig', ['Add', ['Sec', 'x'], ['Csc', 'y'], ['Cot', ['Add', 'x', 'y']]]],
  ['inverse trig', ['Add', ['Arcsin', ['Divide', 'x', 2]], ['Arccos', ['Divide', 'y', 3]], ['Arctan', 'x']]],
  ['hyperbolic', ['Add', ['Sinh', 'x'], ['Cosh', 'y'], ['Tanh', ['Multiply', 'x', 'y']]]],
  ['inverse hyperbolic', ['Add', ['Arsinh', 'x'], ['Arcosh', ['Add', 'y', 2]], ['Artanh', ['Divide', 'x', 3]]]],
  ['extrema and abs', ['Max', ['Abs', 'x'], ['Min', 'y', 1, ['Exp', ['Negate', 'x']]]]],
  ['nested log', ['Sin', ['Ln', ['Add', ['Cos', 'y'], 'x']]]],
  ['parameter', ['Add', ['Multiply', 'a', 'x'], 'y']],
];

function grid(values: number[]) {
  return values.flatMap((x) => values.map((y) => [x, y] as const));
}
const REAL_POINTS = grid([-3, -2.5, -1.75, -1, -0.5, -0.25, 0, 0.3, 0.5, 1, 1.25, 2, 2.5, 3]);

describe('Graph GPU real program parity', () => {
  it.each(REAL_CASES)('%s matches the CPU evaluator domain and value', (_name, mathJson) => {
    const freeSymbols = [...new Set(JSON.stringify(mathJson).match(/"[a-z]"/g)?.map((symbol) => symbol.slice(1, -1)) ?? [])];
    const compiled = compileGraphExpression({ planId: 'gpu-parity', sourceRevision: 1, expression: { mathJson, freeSymbols } });
    if (!compiled.ok) throw new Error(compiled.stopReason.detailCode);
    const program = translateGraphRealPlan(compiled.plan);
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program.glsl).toContain('float graphReal(vec2 p, out bool ok)');
    const cpu = createGraphExpressionEvaluator(compiled.plan);
    const parameters = program.parameterNames.map(() => 1.5);
    let compared = 0;
    for (const [x, y] of REAL_POINTS) {
      const reference = cpu.evaluate({ x, y, a: 1.5 });
      const gpu = interpretGraphRealProgramF32(program, x, y, parameters);
      if (reference.status === 'finite' && Math.abs(reference.value) > 1e30) continue;
      expect(gpu === null, `domain at (${x}, ${y})`).toBe(reference.status !== 'finite');
      if (reference.status === 'finite' && gpu !== null) {
        expect(Math.abs(gpu - reference.value), `value at (${x}, ${y})`).toBeLessThanOrEqual(2e-5 * Math.max(1, Math.abs(reference.value)));
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('refuses operators outside the whitelist instead of guessing', () => {
    const plan = { planId: 'p', sourceRevision: 1, requiredSymbols: ['x'], samplingHints: { periodic: [] },
      instructions: [{ kind: 'symbol' as const, symbol: 'x' }, { kind: 'operator' as const, operator: 'Gamma', arity: 1 }] };
    expect(translateGraphRealPlan(plan)).toEqual({ ok: false, reason: 'unsupported-operator:Gamma' });
  });
});

const COMPLEX_CASES: Array<[string, unknown]> = [
  ['quadratic', ['Add', ['Power', 'z', 2], 1]],
  ['reciprocal', ['Divide', 1, 'z']],
  ['negative integer power', ['Power', ['Add', 'z', ['Complex', 0, -1]], -3]],
  ['shifted log', ['Log', ['Add', 'z', -1]]],
  ['log base', ['Log', 'z', ['Complex', 2, 1]]],
  ['sqrt', ['Sqrt', ['Add', ['Multiply', ['Complex', 0, 2], 'z'], 1]]],
  ['cube root', ['Root', 'z', 3]],
  ['principal power', ['Power', ['Add', 'z', -1], ['Complex', 0, 1]]],
  ['rational power', ['Power', 'z', ['Rational', 1, 2]]],
  ['exp and trig', ['Add', ['Exp', 'z'], ['Sin', 'z'], ['Cos', ['Multiply', 2, 'z']]]],
  ['tangent', ['Tan', 'z']],
  ['hyperbolic', ['Add', ['Sinh', 'z'], ['Cosh', 'z'], ['Tanh', 'z']]],
  ['inverse trig', ['Add', ['Arcsin', 'z'], ['Arccos', 'z'], ['Arctan', ['Divide', 'z', 2]]]],
  ['inverse hyperbolic', ['Add', ['Arsinh', 'z'], ['Arcosh', 'z'], ['Artanh', ['Divide', 'z', 2]]]],
  ['non-holomorphic', ['Add', ['Conjugate', 'z'], ['Real', 'z'], ['ImaginaryPart', 'z'], ['Abs', 'z'], ['Arg', 'z']]],
  ['rational function', ['Divide', ['Power', 'z', 3], ['Add', ['Power', 'z', 2], 4]]],
  ['subtract and parameter', ['Subtract', ['Multiply', 'a', 'z'], ['Complex', 1, 2]]],
];

// Off-axis points keep every sample away from principal cuts, where float32
// rounding may legitimately pick the other side.
const COMPLEX_POINTS = grid([-2.3, -1.4, -0.7, -0.2, 0.35, 0.9, 1.6, 2.2])
  .map(([re, im]) => ({ re, im: im + 0.013 }));

describe('Graph GPU complex program parity', () => {
  it.each(COMPLEX_CASES)('%s matches the public complex evaluator', (name, mathJson) => {
    const program = translateGraphComplexMapping(mathJson, { key: `parity:${name}` });
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program.glsl).toContain('vec2 graphComplex(vec2 z, out bool ok)');
    const cpu = createComplexNumericEvaluator({ expressionMathJson: mathJson, target: 'z', parameters: { a: 1.5 } });
    const parameters = program.parameterNames.map(() => 1.5);
    let compared = 0;
    for (const point of COMPLEX_POINTS) {
      const reference = cpu.evaluateAt(point);
      const gpu = interpretGraphComplexProgramF32(program, point, parameters);
      const referenceFinite = reference.status === 'finite' && reference.value !== null;
      if (referenceFinite && Math.hypot(reference.value!.re, reference.value!.im) > 1e30) continue;
      expect(gpu === null, `domain at ${point.re}+${point.im}i`).toBe(!referenceFinite);
      if (referenceFinite && gpu) {
        const scale = Math.max(1, Math.hypot(reference.value!.re, reference.value!.im));
        expect(Math.hypot(gpu.re - reference.value!.re, gpu.im - reference.value!.im), `value at ${point.re}+${point.im}i`)
          .toBeLessThanOrEqual(5e-5 * scale);
        compared += 1;
      }
    }
    expect(compared).toBeGreaterThan(0);
  });

  it('matches undefined points exactly at poles and log zeros', () => {
    for (const [mathJson, point] of [
      [['Divide', 1, 'z'], { re: 0, im: 0 }],
      [['Ln', ['Add', 'z', -1]], { re: 1, im: 0 }],
      [['Power', ['Add', 'z', ['Complex', 0, -1]], -2], { re: 0, im: 1 }],
    ] as Array<[unknown, { re: number; im: number }]>) {
      const program = translateGraphComplexMapping(mathJson, { key: 'pole' });
      if (!('kind' in program)) throw new Error(program.reason);
      expect(interpretGraphComplexProgramF32(program, point)).toBeNull();
      expect(createComplexNumericEvaluator({ expressionMathJson: mathJson, target: 'z' }).evaluateAt(point).status).not.toBe('finite');
    }
  });

  it('refuses unsupported complex operators', () => {
    expect(translateGraphComplexMapping(['Gamma', 'z'], { key: 'g' })).toEqual({ ok: false, reason: 'unsupported-operator:Gamma' });
    expect(translateGraphComplexMapping(['Root', 'z', 'a'], { key: 'r' })).toEqual({ ok: false, reason: 'unsupported-root-degree' });
  });
});

// Loci: the sides of a clause are compiled by the same translator, so their float32
// values must match the CPU locus authority (`compileGraphComplexPlan`), and the
// composed clause function must carry the operator direction and the jump guard.
const LOCUS_SIDES: Array<[string, unknown]> = [
  ['distance', ['Abs', ['Add', 'z', -1]]],
  ['bisector', ['Abs', ['Add', 'z', ['Complex', 0, 1]]]],
  ['argument', ['Arg', 'z']],
  ['real part of a square', ['Real', ['Power', 'z', 2]]],
  ['imaginary part with a slider', ['Multiply', 'a', ['ImaginaryPart', 'z']]],
  ['modulus of a conjugate product', ['Abs', ['Multiply', 'z', ['Conjugate', 'z']]]],
];

describe('Graph GPU complex locus programs', () => {
  it.each(LOCUS_SIDES)('%s side matches the CPU locus evaluator', (name, mathJson) => {
    const program = translateGraphComplexMapping(mathJson, { key: `locus:${name}` });
    if (!('kind' in program)) throw new Error(program.reason);
    const cpu = compileGraphComplexPlan(mathJson, { a: 1.5 });
    if (!cpu.ok) throw new Error(cpu.reason);
    for (const point of COMPLEX_POINTS) {
      const reference = cpu.plan.evaluate(point);
      const gpu = interpretGraphComplexProgramF32(program, point, program.parameterNames.map(() => 1.5));
      expect(gpu === null, `domain at ${point.re}+${point.im}i`).toBe(reference === null);
      if (reference && gpu) {
        expect(Math.abs(gpu.re - reference.re), `value at ${point.re}+${point.im}i`).toBeLessThanOrEqual(5e-5 * Math.max(1, Math.abs(reference.re)));
      }
    }
  });

  it('builds one clause function per clause with the operator direction and shared sliders', () => {
    const program = buildGraphGpuComplexLocusProgram([
      { left: ['Abs', 'z'], operator: '<', right: 'a' },
      { left: 'a', operator: '>=', right: ['Real', 'z'] },
    ], { key: 'locus', fillsRegion: true });
    if (!('kind' in program)) throw new Error(program.reason);
    expect(program).toMatchObject({ kind: 'complex', clauseCount: 2, strict: [true, false], fillsRegion: true, parameterNames: ['a'] });
    expect(program.glsl).toContain('float graphClause0(vec2 p, out bool ok)');
    expect(program.glsl).toContain('float graphClause1(vec2 p, out bool ok)');
    expect(program.glsl).toContain('return l.x - r.x;');
    expect(program.glsl).toContain('return r.x - l.x;');
    expect(program.glsl).toContain('vec2 graphComplex(vec2 z, out bool ok)');
  });

  it('refuses unsupported operators, empty clause lists and too many clauses', () => {
    expect(buildGraphGpuComplexLocusProgram([{ left: ['Gamma', 'z'], operator: '=', right: 1 }], { key: 'g', fillsRegion: false }))
      .toEqual({ ok: false, reason: 'unsupported-operator:Gamma' });
    expect(buildGraphGpuComplexLocusProgram([], { key: 'none', fillsRegion: false })).toEqual({ ok: false, reason: 'no-clauses' });
    const clauses = Array.from({ length: GRAPH_GPU_COMPLEX_LOCUS_MAX_CLAUSES + 1 }, () => ({ left: ['Abs', 'z'], operator: '<' as const, right: 3 }));
    expect(buildGraphGpuComplexLocusProgram(clauses, { key: 'many', fillsRegion: true })).toEqual({ ok: false, reason: 'too-many-clauses' });
  });
});
