import { describe, expect, it, vi } from 'vitest';
import { setup, bounds } from './differential-test-support';
import { buildExponential, buildLogarithm } from './differential-admission';
import * as admission from './differential-admission';
import * as derivative from './differential-derivative';
import * as factor from './recursive-polynomial-factorization';
import * as linear from './linear-system';
import * as comparison from './recursive-coefficient-system';
import * as descent from './recursive-logarithmic-descent';
import * as relations from './recursive-logarithmic-relations';
import { CertifiedTowerView } from './recursive-certified-tower';
import { DifferentialField } from './differential-field';
import { encodeRecursiveLogarithmicDerivativeRelations as encode, decodeRecursiveLogarithmicDerivativeRelations as decode } from './recursive-logarithmic-relations-wire';
import { packRecursiveArtifactGraph, unpackRecursiveArtifactGraph } from './recursive-artifact-graph';

type Data = {[key: string]: any}; // eslint-disable-line @typescript-eslint/no-explicit-any
const copy = (data: unknown): Data => JSON.parse(JSON.stringify(data)) as Data;
function fixture(hyper: boolean, argumentScale = 1) {
  const s = setup(), base = CertifiedTowerView.rationalFunctions(s.ctx, s.f, bounds), argument = s.p([0, argumentScale]);
  const a = hyper ? buildExponential(s.ctx, s.f, 't', [argument], bounds) : buildLogarithm(s.ctx, s.f, 't', argument, bounds);
  if (a.status !== 'supported') throw Error('fixture admission');
  return {...s, owner: a.field, view: CertifiedTowerView.firstLevel(s.ctx, base, a.field, a.field.admission!, bounds), t: a.field.generator(s.ctx)};
}
describe('recursive logarithmic relation replay and restrictions', () => {
  it.each([false, true])('checks relation and no-relation artifacts with all producers disabled (hyper=%s)', hyper => {
    const s = fixture(hyper), g = s.owner.add(s.ctx, s.t, s.owner.embed(s.ctx, s.x));
    const positive = s.owner.exactDivide(s.ctx, derivative.differentiate(s.ctx, s.owner, g).derivative, g);
    for (const input of [positive, s.owner.inverse(s.ctx, g)]) {
      const e = relations.solveRecursiveLogarithmicDerivativeRelations(s.ctx, s.view, [input], bounds), data = encode(s.ctx, s.view, [input], e, bounds);
      const t = fixture(hyper), tr = t.owner.fractions!.ring;
      // Bind exact coefficients by the codec replay; expected input is built independently.
      const gg = t.owner.add(t.ctx, t.t, t.owner.embed(t.ctx, t.x));
      const expected = s.owner.equal(s.ctx, input, positive) ? t.owner.exactDivide(t.ctx, derivative.differentiate(t.ctx, t.owner, gg).derivative, gg) : t.owner.inverse(t.ctx, gg);
      const forbidden = () => { throw Error('producer during recursive replay'); };
      vi.spyOn(relations, 'solveRecursiveLogarithmicDerivativeRelations').mockImplementation(forbidden);
      vi.spyOn(relations, 'solveRecursiveLogarithmicRelationsWithin').mockImplementation(forbidden);
      vi.spyOn(descent, 'produceLogarithmicDescent').mockImplementation(forbidden);
      vi.spyOn(factor, 'factorRecursivePolynomial').mockImplementation(forbidden);
      vi.spyOn(linear, 'solveLinearSystem').mockImplementation(forbidden);
      vi.spyOn(comparison, 'descendCoefficientSystem').mockImplementation(forbidden);
      vi.spyOn(derivative, 'differentiate').mockImplementation(forbidden);
      vi.spyOn(admission, 'buildExponential').mockImplementation(forbidden);
      vi.spyOn(admission, 'buildLogarithm').mockImplementation(forbidden);
      vi.spyOn(DifferentialField, 'certified').mockImplementation(forbidden);
      try {
        const replay = decode(t.ctx, t.view, [expected], copy(data), bounds);
        expect(replay.basis.length).toBe(e.basis.length); expect(replay.view).toBe(t.view);
        expect(encode(t.ctx, t.view, [expected], replay, bounds)).toEqual(data);
        expect(tr.variable).toBe('t');
      } finally { vi.restoreAllMocks(); }
    }
  });
  it('rejects equal derivatives with changed complete logarithm arguments', () => {
    const s = fixture(false), input = s.owner.embed(s.ctx, s.p([1], [0, 1])), e = relations.solveRecursiveLogarithmicDerivativeRelations(s.ctx, s.view, [input], bounds);
    const data = encode(s.ctx, s.view, [input], e, bounds), t = fixture(false, 2), expected = t.owner.embed(t.ctx, t.p([1], [0, 1]));
    expect(() => decode(t.ctx, t.view, [expected], data, bounds)).toThrow('verification-failed');
  });
  it('retains exponent/log argument and every nested coefficient denominator by path', () => {
    const s = fixture(false), input = s.owner.make(s.ctx, [s.p([1], [1, 1]), s.p([1])], [s.p([1], [2, 1]), s.p([1])]);
    const e = relations.solveRecursiveLogarithmicDerivativeRelations(s.ctx, s.view, [input], bounds);
    expect(e.conditions.some(c => c.path === 'input.0.numerator.0')).toBe(true);
    expect(e.conditions.some(c => c.path === 'input.0.denominator.0')).toBe(true);
    expect(e.conditions.some(c => c.kind === 'logarithm-argument')).toBe(true);
    const data = copy(encode(s.ctx, s.view, [input], e, bounds)), bad = copy(unpackRecursiveArtifactGraph(s.ctx, data.payload, bounds));
    bad.decision.conditions.pop(); expect(() => decode(s.ctx, s.view, [input], {...data, payload: packRecursiveArtifactGraph(s.ctx, bad, bounds)}, bounds)).toThrow('verification-failed');
  });
  it('rejects mutated parent coverage, normality, indices, signs, support and flags', () => {
    const s = fixture(true), input = s.owner.fromInteger(s.ctx, 1n), e = relations.solveRecursiveLogarithmicDerivativeRelations(s.ctx, s.view, [input], bounds), data = encode(s.ctx, s.view, [input], e, bounds);
    const mutations = [
      (d: Data) => { d.decision.basis[0].index = '2'; },
      (d: Data) => { d.decision.basis[0].powers[0] = String(-BigInt(d.decision.basis[0].powers[0])); },
      (d: Data) => { d.decision.descent.lower = []; },
      (d: Data) => { d.decision.parent.basis = []; },
      (d: Data) => { delete d.decision.descent.comparison.rows; },
      (d: Data) => { d.construction[1].rule.coefficients = []; },
      (d: Data) => { d.decision.verified = true; },
    ];
    for (const [index, mutate] of mutations.entries()) {
      const outer = copy(data), bad = copy(unpackRecursiveArtifactGraph(s.ctx, outer.payload, bounds)); mutate(bad);
      expect(() => decode(s.ctx, s.view, [input], {...outer, payload: packRecursiveArtifactGraph(s.ctx, bad, bounds)}, bounds), `mutation ${index}`).toThrow();
    }
  });
});
