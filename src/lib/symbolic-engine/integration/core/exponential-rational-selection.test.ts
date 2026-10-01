import { expect, it } from 'vitest';
import { exponentialSetup } from './__tests__/exponential-rational-fixtures';
import { bounds } from './differential-test-support';
import { ExponentialRationalDomain } from './exponential-rational-domain';
import { integrateExponentialRational } from './exponential-rational-decision';
import { residueInputs, descendConstantPolynomial } from './exponential-rational-residue-algebra';
import { selectExponentialResidues, verifyExponentialSelection } from './exponential-rational-selection';
import { subresultants } from './subresultant';
import { squareFree } from './polynomial-square-free';

it('preserves abnormal PRS drops and highest-index boundary evidence', () => {
  const s = exponentialSetup(), out = integrateExponentialRational(s.ctx, s.F, s.v([0, 0, 0, 3], [1, 0, 0, 1]), bounds);
  expect(out.kind).toBe('elementary');
  expect(out.residue!.prs.steps.some(v => v.next.coefficients.length === 1)).toBe(true);
  expect(out.residue!.groups[0].components[0].index).toBe(3);
});
it('checks degree-loss partitions algebraically over Q(x), without mislabeling them admitted differential inputs', () => {
  const s = exponentialSetup(), { ctx, F } = s, d = new ExponentialRationalDomain(ctx, F, bounds);
  // A synthetic elimination input exercises the shared specialization machinery.
  // Actual monic normal denominators have lc(DN)=degree(N)*r', so their
  // nonzero-residue components cannot lose B's leading term in this field.
  const input = F.add(ctx, F.add(ctx, s.v([1], [0, 1]), s.v([3], [-1, 1])), s.v([-1], [-2, 1]));
  if (input.kind !== 'fraction') throw Error('fixture');
  const dn = d.t.derivative(ctx, input.value.denominator), inputs = residueInputs(ctx, d, input, dn);
  const prs = subresultants(ctx, d.elimination, inputs.denominator, inputs.residue);
  const decomposition = squareFree(ctx, d.z, descendConstantPolynomial(ctx, d, prs.resultant));
  const groups = selectExponentialResidues(ctx, d, input, dn, prs, decomposition);
  verifyExponentialSelection(ctx, d, input, dn, prs, decomposition, groups);
  expect(groups.some(g => g.nodes.some(n => n.analyses.at(-1)?.kind === 'nonunit'))).toBe(true);
  expect(groups.flatMap(g => g.components).some(c => c.specializedDegree < prs.inputDegrees[1])).toBe(true);
  const bad = groups.map(g => ({ ...g, components: [...g.components, ...g.components] }));
  expect(() => verifyExponentialSelection(ctx, d, input, dn, prs, decomposition, bad)).toThrow();
});
