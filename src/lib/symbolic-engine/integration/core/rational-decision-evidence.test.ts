import { beforeAll, describe, expect, it, vi } from 'vitest';
import { context, poly } from './test-support';
import { FormalPrimitiveDomain } from './formal-primitive';
import { integrateRational, verifyRationalDecision, type RationalDecision } from './rational-decision';
import { decodeRationalDecision, encodeRationalDecision, type RationalDecisionWire } from './rational-decision-wire';
import { hermiteReduce, verifyHermite } from './hermite-reduction';
import { monicDivide, verifyMonicDivision } from './monic-division';
import { PolynomialRing } from './polynomial';
import { SquareFreeQuotientAlgebra } from './quotient-algebra';
import * as hermiteModule from './hermite-reduction';
import * as lrtModule from './lrt-reduction';
import * as prsModule from './subresultant';

const profile = { work: 20_000_000_000, allocation: 1_000_000_000_000, integerBits: 2048, degree: 256 };
const run = () => context(profile);
function fixture(n: number[], d: number[]) {
  const ctx = run(), owner = new FormalPrimitiveDomain('x', 'z');
  const input = owner.fractions.make(ctx, poly(ctx, owner.x, n), poly(ctx, owner.x, d));
  return { ctx, owner, input };
}
function change(wire: RationalDecisionWire, path: (string | number)[], value: unknown): unknown {
  const result: unknown = JSON.parse(JSON.stringify(wire));
  let target = result as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string | number, unknown>;
  target[path.at(-1)!] = value; return result;
}
function get(wire: RationalDecisionWire, path: (string | number)[]): unknown {
  let value: unknown = wire;
  for (const key of path) value = (value as Record<string | number, unknown>)[key];
  return value;
}

describe('Hermite identities and ring monic division', () => {
  it('known rational part of 1/(x²+1)² and mutation of a reduction step', () => {
    const { ctx, owner, input } = fixture([1], [1, 0, 2, 0, 1]);
    const proof = hermiteReduce(ctx, owner, input);
    const expected = owner.fractions.make(ctx, poly(ctx, owner.x, [0, 1]), poly(ctx, owner.x, [2, 0, 2]));
    expect(owner.fractions.equal(ctx, proof.rationalPart, expected)).toBe(true);
    const block = proof.blocks[0], step = block.steps[0];
    expect(() => verifyHermite(ctx, owner, input, { ...proof, blocks: [{ ...block, steps: [{ ...step, nextNumerator: owner.x.zero(ctx) }] }] })).toThrow(/verification-failed/);
    expect(() => verifyHermite(ctx, owner, input, { ...proof, blocks: [] })).toThrow(/verification-failed/);
  });
  it('repeated linear and irreducible factors with mixed multiplicities', () => {
    const { ctx, owner } = fixture([0], [1]), r = owner.x, f = owner.fractions;
    const v = poly(ctx, r, [-1, 1]), w = poly(ctx, r, [1, 0, 1]);
    const input = f.make(ctx, poly(ctx, r, [2, 3]), r.multiply(ctx, r.power(ctx, v, 3), r.power(ctx, w, 2)));
    const result = integrateRational(ctx, owner, input);
    expect(result.hermite.decomposition.factors.map(v => v.multiplicity)).toEqual([2, 3]);
  }, 120000);
  it('division over a ring with zero divisors uses only a monic divisor', () => {
    const ctx = run(), owner = new FormalPrimitiveDomain('x', 'z');
    const algebra = new SquareFreeQuotientAlgebra(ctx, owner.z, poly(ctx, owner.z, [-1, 0, 1]));
    const r = new PolynomialRing(algebra, 'x'), nonunit = algebra.make(ctx, poly(ctx, owner.z, [-1, 1]));
    const a = r.make(ctx, [nonunit, algebra.fromInteger(ctx, 1n)]), b = r.make(ctx, [nonunit, algebra.fromInteger(ctx, 1n)]);
    const proof = monicDivide(ctx, r, a, b);
    expect(r.equal(ctx, proof.quotient, r.one(ctx))).toBe(true);
    expect(() => verifyMonicDivision(ctx, r, a, b, { ...proof, quotient: r.zero(ctx) })).toThrow(/verification-failed/);
    expect(() => monicDivide(ctx, r, a, r.constant(ctx, nonunit))).toThrow(/invalid-input/);
    expect(() => monicDivide(ctx, r, a, r.zero(ctx))).toThrow(/division-by-zero/);
  });
  it('normalizes nonmonic source construction and rejects foreign ownership', () => {
    const { ctx, owner, input } = fixture([2], [2, 0, 2]);
    const decision = integrateRational(ctx, owner, input);
    expect(owner.x.equal(ctx, decision.conditions.inputDenominator, poly(ctx, owner.x, [1, 0, 1]))).toBe(true);
    const other = new FormalPrimitiveDomain('x', 'z');
    expect(() => integrateRational(ctx, other, input)).toThrow(/domain-mismatch/);
  });
  it('retains source denominator and rational denominator after derivative cancellation', () => {
    const { ctx, owner, input } = fixture([-1], [0, 0, 1]);
    const d = integrateRational(ctx, owner, input);
    expect(owner.x.equal(ctx, d.conditions.inputDenominator, poly(ctx, owner.x, [0, 0, 1]))).toBe(true);
    expect(owner.x.equal(ctx, d.conditions.rationalDenominator, poly(ctx, owner.x, [0, 1]))).toBe(true);
    expect(d.lrt).toBeNull(); expect(d.primitive.terms).toHaveLength(0);
  });
  it('multiple multiplicity groups and highest-degree selection', () => {
    const { ctx, owner } = fixture([0], [1]), r = owner.x, f = owner.fractions;
    let input = f.fromInteger(ctx, 0n);
    for (const [pole, residue] of [[0, 1], [1, 1], [2, 2]]) input = f.add(ctx, input, f.make(ctx, poly(ctx, r, [residue]), poly(ctx, r, [-pole, 1])));
    const result = integrateRational(ctx, owner, input);
    expect(result.lrt?.decomposition.factors.map(v => v.multiplicity)).toEqual([1, 2]);
    const repeated = f.make(ctx, poly(ctx, r, [0, 1]), poly(ctx, r, [-1, 0, 1]));
    const highest = integrateRational(ctx, owner, repeated);
    expect(highest.lrt?.groups[0].components[0].index).toBe(2);
    expect(highest.lrt?.groups[0].components[0].normalization).toBeNull();
    expect(highest.primitive.terms).toHaveLength(1);
  }, 120000);
  it('seeded independently differentiated rational/logarithmic inputs', () => {
    let seed = 271828;
    const next = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
    for (let i = 0; i < 5; i++) {
      const { ctx, owner } = fixture([0], [1]), r = owner.x, f = owner.fractions;
      const pole = next() % 5 - 2, a = next() % 7 + 1, b = next() % 5 + 1;
      const v = poly(ctx, r, [-pole, 1]);
      // Derivative of a/(x-pole) + b*log(x-pole) + x³/3.
      const input = f.add(ctx, f.add(ctx, f.make(ctx, poly(ctx, r, [-a]), r.power(ctx, v, 2)), f.make(ctx, poly(ctx, r, [b]), v)),
        f.make(ctx, poly(ctx, r, [0, 0, 1]), r.one(ctx)));
      const decision = integrateRational(ctx, owner, input);
      expect(f.equal(ctx, decision.derivative.derivative, input)).toBe(true);
    }
  }, 120000);
});

describe('full decision artifacts and adversarial replay', () => {
  const base = fixture([1], [1, 0, 1]);
  let decision: RationalDecision, wire: RationalDecisionWire;
  beforeAll(() => { decision = integrateRational(base.ctx, base.owner, base.input); wire = encodeRationalDecision(base.ctx, base.owner, decision); }, 120000);
  it('round-trips every certificate with fresh ownership without invoking producers', () => {
    const ctx = run(), owner = new FormalPrimitiveDomain('x', 'z');
    const input = owner.fractions.make(ctx, poly(ctx, owner.x, [1]), poly(ctx, owner.x, [1, 0, 1]));
    const spies = [vi.spyOn(hermiteModule, 'hermiteReduce'), vi.spyOn(lrtModule, 'lrtReduce'), vi.spyOn(prsModule, 'subresultants')];
    for (const spy of spies) spy.mockImplementation(() => { throw new Error('producer invoked during replay'); });
    try {
      const restored = decodeRationalDecision(ctx, owner, input, JSON.parse(JSON.stringify(wire)));
      expect(encodeRationalDecision(ctx, owner, restored)).toEqual(wire);
      expect(Object.isFrozen(restored)).toBe(true); expect(restored.primitive.owner).toBe(owner);
    } finally { for (const spy of spies) spy.mockRestore(); }
  }, 120000);
  it('rejects wrong explicit input and incompatible variables', () => {
    expect(() => decodeRationalDecision(run(), base.owner, base.owner.fractions.fromInteger(base.ctx, 2n), wire)).toThrow(/verification-failed/);
    expect(() => decodeRationalDecision(run(), base.owner, base.input, change(wire, ['variable'], 't'))).toThrow(/domain-mismatch/);
  });
  const mutations: [string, (string | number)[], unknown][] = [
    ['Hermite multiplicity', ['hermite', 'decomposition', 'factors', 0, 'multiplicity'], 2],
    ['PRS index', ['lrt', 'prs', 'indexed', 1, 'index'], 0],
    ['component index', ['lrt', 'groups', 0, 'components', 0, 'index'], 2],
    ['specialization degree', ['lrt', 'groups', 0, 'components', 0, 'specializedDegree'], -1],
    ['missing components', ['lrt', 'groups', 0, 'components'], []],
    ['unit kind', ['lrt', 'groups', 0, 'components', 0, 'normalization', 'kind'], 'zero'],
    ['trace coverage', ['derivative', 'terms', 0, 'trace', 'columns'], []],
    ['log norm conditions', ['conditions', 'logNorms'], []],
    ['final inverse coverage', ['derivative', 'terms'], []],
    ['Hermite extra evidence', ['hermite', 'unexpected'], true],
    ['malformed nested evidence', ['lrt', 'prs', 'steps', 0, 'pseudo'], []],
    ['noncanonical coefficient', ['hermite', 'polynomialPrimitive', 'coefficients'], [{ version: 1, kind: 'rational', domain: 'Q', value: { numerator: '0', denominator: '1' } }]],
  ];
  for (const [name, path, value] of mutations) it(`rejects ${name}`, () => {
    expect(() => decodeRationalDecision(run(), base.owner, base.input, change(wire, path, value))).toThrow();
  });
  it('rejects altered scaling, division evidence, weight, trace, inverse, target and condition polynomials', () => {
    const onePolynomial = get(wire, ['conditions', 'rationalDenominator']);
    const zeroFraction = get(wire, ['hermite', 'rationalPart']);
    for (const [path, value] of [
      [['lrt', 'prs', 'steps', 0, 'divisor', 'coefficients'], []],
      [['lrt', 'groups', 0, 'components', 0, 'normalization', 'inverse', 'coefficients'], []],
      [['lrt', 'groups', 0, 'components', 0, 'denominatorDivision', 'quotient', 'coefficients'], []],
      [['primitive', 'terms', 0, 'weight', 'coefficients'], []],
      [['derivative', 'terms', 0, 'trace', 'trace'], zeroFraction],
      [['derivative', 'terms', 0, 'inverse', 'inverse', 'coefficients'], []],
      [['derivative', 'derivative'], zeroFraction],
      [['conditions', 'inputDenominator'], onePolynomial],
    ] as [ (string | number)[], unknown ][]) expect(() => decodeRationalDecision(run(), base.owner, base.input, change(wire, path, value))).toThrow();
  }, 120000);
  it('rejects oversized arrays, accessors, sparse arrays and cyclic malformed evidence', () => {
    expect(() => decodeRationalDecision(context({ allocation: 5 }), base.owner, base.input, wire)).toThrow(/resource-limit/);
    const bad = { ...wire }; Object.defineProperty(bad, 'hermite', { enumerable: true, get() { throw new Error('accessor executed'); } });
    expect(() => decodeRationalDecision(run(), base.owner, base.input, bad)).toThrow(/invalid-input/);
    const sparse = new Array(2); expect(() => decodeRationalDecision(run(), base.owner, base.input, { ...wire, normEvidence: sparse })).toThrow(/invalid-input/);
    const cycle: unknown[] = []; cycle.push(cycle);
    expect(() => decodeRationalDecision(run(), base.owner, base.input, { ...wire, normEvidence: cycle })).toThrow(/invalid-input/);
  });
  it('exhausts during construction, decoding, and the final verification step without success', () => {
    expect(() => integrateRational(context({ work: 30 }), base.owner, base.input)).toThrow(/resource-limit/);
    const verification = run(); verifyRationalDecision(verification, base.owner, base.input, decision);
    expect(() => verifyRationalDecision(context({ ...profile, work: verification.usage.work - 1 }), base.owner, base.input, decision)).toThrow(/resource-limit/);
    const decoding = run(); decodeRationalDecision(decoding, base.owner, base.input, wire);
    expect(() => decodeRationalDecision(context({ ...profile, work: decoding.usage.work - 1 }), base.owner, base.input, wire)).toThrow(/resource-limit/);
  }, 120000);
});


describe('split derivations and nontrivial artifact shapes', () => {
  it('retains original indices through degree loss; rejects altered splits and duplicated coverage', () => {
    const { ctx, owner, input } = fixture([2, -8, 3], [0, 2, -3, 1]);
    const decision = integrateRational(ctx, owner, input), wire = encodeRationalDecision(ctx, owner, decision);
    const group = decision.lrt!.groups[0];
    expect(decision.lrt!.prs.inputDegrees).toEqual([3, 2]);
    expect(group.nodes).toHaveLength(3);
    expect(group.components.map(c => c.specializedDegree)).toEqual([1, 2]);
    expect(group.components.map(c => c.index)).toEqual([1, 1]);
    expect(group.nodes[0].analyses[0].kind).toBe('nonunit');
    expect(encodeRationalDecision(ctx, owner, decodeRationalDecision(ctx, owner, input, JSON.parse(JSON.stringify(wire))))).toEqual(wire);
    const nodes = get(wire, ['lrt', 'groups', 0, 'nodes']) as unknown[];
    const components = get(wire, ['lrt', 'groups', 0, 'components']) as unknown[];
    for (const altered of [
      change(wire, ['lrt', 'groups', 0, 'nodes'], [nodes[0], nodes[2], nodes[1]]),
      change(wire, ['lrt', 'groups', 0, 'nodes'], [nodes[0], nodes[1], nodes[1]]),
      change(wire, ['lrt', 'groups', 0, 'components'], [components[0], components[0]]),
      change(wire, ['lrt', 'groups', 0, 'nodes', 0, 'analyses', 0, 'split', 'factor'], get(wire, ['lrt', 'groups', 0, 'nodes', 0, 'modulus'])),
      change(wire, ['lrt', 'groups', 0, 'nodes', 1, 'analyses'], []),
      change(wire, ['lrt', 'groups', 0, 'nodes', 1, 'analyses', 0], { kind: 'unit' }),
    ]) expect(() => decodeRationalDecision(run(), owner, input, altered)).toThrow();
  }, 120000);
  it('round-trips zero, polynomial, repeated-pole, abnormal-drop and highest-selection decisions', () => {
    for (const [n, d] of [[[0], [1]], [[2, 3], [1]], [[1], [1, 0, 2, 0, 1]], [[1], [1, 0, 0, 0, 1]], [[0, 1], [-1, 0, 1]]]) {
      const { ctx, owner, input } = fixture(n, d), decision = integrateRational(ctx, owner, input);
      const wire = encodeRationalDecision(ctx, owner, decision), restored = decodeRationalDecision(ctx, owner, input, JSON.parse(JSON.stringify(wire)));
      expect(encodeRationalDecision(ctx, owner, restored)).toEqual(wire);
      if (decision.lrt === null) expect(restored.primitive.terms).toHaveLength(0);
    }
  }, 120000);
  it('monic division handles zero, constants, lower and equal degrees and a nonzero remainder', () => {
    const { ctx, owner } = fixture([0], [1]), r = owner.x;
    for (const [a, b, q, rem] of [
      [[], [1], [], []], [[3, 2], [1], [3, 2], []], [[1], [0, 1], [], [1]],
      [[1, 2], [0, 1], [2], [1]], [[1, 0, 1], [0, 1], [0, 1], [1]],
    ]) {
      const proof = monicDivide(ctx, r, poly(ctx, r, a), poly(ctx, r, b));
      expect(r.equal(ctx, proof.quotient, poly(ctx, r, q))).toBe(true);
      expect(r.equal(ctx, proof.remainder, poly(ctx, r, rem))).toBe(true);
    }
  });
});
