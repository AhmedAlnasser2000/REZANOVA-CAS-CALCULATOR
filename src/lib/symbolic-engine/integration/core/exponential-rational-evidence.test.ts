import { beforeAll, describe, expect, it, vi, afterEach } from 'vitest';
import { bounds } from './differential-test-support';
import { exponentialSetup } from './__tests__/exponential-rational-fixtures';
import { ExecutionContext } from './execution';
import { integrateExponentialRational, verifyExponentialRationalDecision } from './exponential-rational-decision';
import { encodeExponentialRationalDecision, decodeExponentialRationalDecision } from './exponential-rational-wire';
import * as reduction from './exponential-rational-hermite';
import * as residue from './exponential-rational-residue';
import * as sum from './exponential-sum-decision';
import * as primitive from './exponential-rational-primitive';

afterEach(() => vi.restoreAllMocks());
// Mutable wire objects are adversarial inputs; all access here is test-only.
type Mutable = { [key: string]: Mutable } & Mutable[];
describe('complete saved exponential rational evidence', () => {
  let s: ReturnType<typeof exponentialSetup>, data: unknown, input: ReturnType<typeof exponentialSetup>['t'];
  beforeAll(() => {
    s = exponentialSetup(); input = s.v([1], [1, 2, 1]);
    const out = integrateExponentialRational(s.ctx, s.F, input, bounds);
    data = encodeExponentialRationalDecision(s.ctx, s.F, input, out, bounds);
  });
  const cases: readonly [string, (v: Mutable) => void][] = [
    ['missing block', v => { v.hermite.blocks.pop(); }],
    ['missing step', v => { v.hermite.blocks[0].steps.pop(); }],
    ['altered Hermite derivative', v => { v.hermite.blocks[0].steps[0].derivative.derivative = v.hermite.fieldPart; }],
    ['wrong reduction numerator', v => { v.hermite.blocks[0].steps[0].numerator = v.hermite.normalDenominator; }],
    ['changed normal factor', v => { v.hermite.decomposition.factors.pop(); }],
    ['wrong resultant scaling', v => { v.residue.scalar = v.residue.coefficients[0].derivative; }],
    ['missing PRS index', v => { v.residue.prs.indexed.pop(); }],
    ['altered residue derivative', v => { v.residue.coefficients[0].derivative = v.residue.scalar; }],
    ['missing residue group', v => { v.residue.groups.pop(); }],
    ['missing partition node', v => { v.residue.groups[0].nodes.pop(); }],
    ['duplicated component', v => { v.residue.groups[0].components.push(v.residue.groups[0].components[0]); }],
    ['missing degree analysis', v => { v.residue.groups[0].nodes[0].analyses.pop(); }],
    ['wrong selected index', v => { v.residue.groups[0].components[0].index = 0 as unknown as Mutable; }],
    ['wrong monic division', v => { v.residue.groups[0].components[0].denominatorDivision.remainder = v.residue.groups[0].components[0].argument; }],
    ['missing residue logarithm', v => { v.remainder.logarithms.terms.pop(); }],
    ['missing logarithmic trace', v => { v.remainder.derivative.terms[0].trace.columns.pop(); }],
    ['wrong logarithmic weight', v => { v.remainder.logarithms.terms[0].weight = v.remainder.logarithms.terms[0].modulus; }],
    ['missing final root term', v => { v.primitive.terms.pop(); }],
    ['missing final coefficient proof', v => { v.derivative.terms[0].coefficients.pop(); }],
    ['missing retained condition', v => { v.conditions.pop(); }],
    ['duplicated retained condition', v => { v.conditions.push(v.conditions[0]); }],
    ['missing nested rational evidence', v => { v.sum.rational = null as unknown as Mutable; }],
  ];
  it.each(cases)('rejects %s', (_name, mutate) => {
    const bad = structuredClone(data) as Mutable; mutate(bad);
    expect(() => decodeExponentialRationalDecision(new ExecutionContext(s.ctx.limits), s.F, input, bad, bounds)).toThrow();
  });
  it('has fresh proof state after a successful check on the same context', () => {
    const ctx = new ExecutionContext(s.ctx.limits), replay = decodeExponentialRationalDecision(ctx, s.F, input, data, bounds);
    verifyExponentialRationalDecision(ctx, s.F, input, replay, bounds);
    expect(() => verifyExponentialRationalDecision(ctx, s.F, input, { ...replay, conditions: [] }, bounds)).toThrow();
  });
});
describe('exponential decision exhaustion and obstruction authority', () => {
  it.each(['construction', 'hermite', 'residue', 'sum', 'final'])('returns no decision when exhausted during %s', stage => {
    const s = exponentialSetup(), input = s.v([1], [1, 1]);
    const exhausted = () => s.ctx.exhaust(`test-${stage}`);
    if (stage === 'hermite') vi.spyOn(reduction, 'differentialHermite').mockImplementation(exhausted);
    if (stage === 'residue') vi.spyOn(residue, 'exponentialResidues').mockImplementation(exhausted);
    if (stage === 'sum') vi.spyOn(sum, 'integrateExponentialSum').mockImplementation(exhausted);
    if (stage === 'final') {
      const original = primitive.verifyExponentialPrimitive;
      vi.spyOn(primitive, 'verifyExponentialPrimitive').mockImplementation((ctx, p, target, proof, b) => {
        if (s.F.equal(ctx, target, input)) ctx.exhaust('test-final'); return original(ctx, p, target, proof, b);
      });
    }
    const ctx = stage === 'construction' ? new ExecutionContext({ ...s.ctx.limits, work: 3 }) : s.ctx;
    expect(() => integrateExponentialRational(ctx, s.F, input, bounds)).toThrow(/resource-limit/);
  });
  it('checks decoding and standalone proof budgets', () => {
    const s = exponentialSetup(), input = s.v([1], [1, 1]), out = integrateExponentialRational(s.ctx, s.F, input, bounds);
    const data = encodeExponentialRationalDecision(s.ctx, s.F, input, out, bounds);
    expect(() => decodeExponentialRationalDecision(new ExecutionContext({ ...s.ctx.limits, allocation: 300 }), s.F, input, data, bounds)).toThrow(/resource-limit/);
    expect(() => verifyExponentialRationalDecision(new ExecutionContext({ ...s.ctx.limits, work: 100 }), s.F, input, out, bounds)).toThrow(/resource-limit/);
  });
  it('rejects promoting an absent residue witness or missing Laurent proof to non-elementarity', () => {
    const s = exponentialSetup(), input = s.F.make(s.ctx, [s.c(1)], [s.x, s.c(1)]), out = integrateExponentialRational(s.ctx, s.F, input, bounds);
    expect(() => verifyExponentialRationalDecision(s.ctx, s.F, input, { ...out, residue: null }, bounds)).toThrow();
    const second = s.F.multiply(s.ctx, s.F.embed(s.ctx, s.p([1], [0, 1])), s.t), negative = integrateExponentialRational(s.ctx, s.F, second, bounds);
    expect(() => verifyExponentialRationalDecision(s.ctx, s.F, second, { ...negative, residue: out.residue }, bounds)).toThrow();
  });
});
