import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { type EP, FirstLevelRationalDomain } from './first-level-rational-domain';
import { type FirstLevelLogTerm, firstLevelLogTerm, verifyFirstLevelLogTerm } from './first-level-rational-primitive';
import { descendConstantPolynomial, residueInputs, selectionArgument } from './first-level-rational-residue-algebra';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { PolynomialDomain } from './polynomial-domain';
import { SquareFreeQuotientAlgebra, type QuotientElement, type UnitAnalysis } from './quotient-algebra';
import { type SubresultantCertificate } from './subresultant';
import { type SquareFreeDecomposition } from './polynomial-square-free';
import { monicDivide, verifyMonicDivision, type MonicDivision } from './monic-division';

export type ResidueAlgebra = SquareFreeQuotientAlgebra<E>;
export type ComponentRing = PolynomialRing<QuotientElement<E>, ResidueAlgebra>;
export type ComponentPolynomial = Polynomial<QuotientElement<E>, ResidueAlgebra>;
export type BivariatePRS = SubresultantCertificate<EP, PolynomialDomain<E>>;
/** Flat preorder tree. Split children are factor then complement; no recursive traversal. */
export interface ResiduePartitionNode {
  readonly algebra: ResidueAlgebra;
  readonly analyses: readonly UnitAnalysis<E>[];
}
export interface LrtComponent<D extends FirstLevelRationalDomain = FirstLevelRationalDomain> {
  readonly node: number;
  readonly specializedDegree: number;
  readonly index: number;
  readonly ring: ComponentRing;
  readonly normalization: UnitAnalysis<E> | null;
  readonly argument: ComponentPolynomial;
  readonly denominatorDivision: MonicDivision<QuotientElement<E>, ResidueAlgebra>;
  readonly residueDivision: MonicDivision<QuotientElement<E>, ResidueAlgebra>;
  readonly term: FirstLevelLogTerm<D>;
}
export interface LrtGroup<D extends FirstLevelRationalDomain = FirstLevelRationalDomain> {
  readonly nodes: readonly ResiduePartitionNode[];
  readonly components: readonly LrtComponent<D>[];
}
export function specializeComponent(ctx: ExecutionContext, ring: ComponentRing, input: Polynomial<EP, PolynomialDomain<E>>): ComponentPolynomial {
  ctx.allocate(input.coefficients.length);
  return ring.make(ctx, input.coefficients.map(c => ring.domain.make(ctx, c)));
}
export function selectFirstLevelResidues<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: D, residual: E, dn: EP, prs: BivariatePRS, decomposition: SquareFreeDecomposition<import('./rational').Rational>): readonly LrtGroup<D>[] {
  const { denominator, residue } = residueInputs(ctx, owner, residual, dn);
  demand(residual.kind === 'fraction', 'domain-mismatch', 'residual fraction');
  const n = owner.t.degree(ctx, residual.value.denominator);
  const groups: LrtGroup<D>[] = []; ctx.allocate(decomposition.factors.length);
  for (const { factor, multiplicity } of decomposition.factors) {
    const nodes: ResiduePartitionNode[] = [], components: LrtComponent<D>[] = [], pending = [owner.lift(ctx, factor, owner.kz)]; ctx.allocate(3);
    while (pending.length) {
      ctx.tick(); const modulus = pending.pop()!, algebra = new SquareFreeQuotientAlgebra(ctx, owner.kz, modulus);
      const analyses: UnitAnalysis<E>[] = []; ctx.allocate(residue.coefficients.length + 2);
      let degree = residue.coefficients.length - 1;
      for (; degree >= 0; degree--) {
        const analysis = algebra.analyzeUnit(ctx, algebra.make(ctx, residue.coefficients[degree])); analyses.push(analysis);
        if (analysis.kind !== 'zero') break;
      }
      ctx.allocate(1); const node = nodes.length; nodes.push(Object.freeze({ algebra, analyses: Object.freeze(analyses) }));
      const last = analyses.at(-1);
      if (last?.kind === 'nonunit') { ctx.allocate(2); pending.push(last.split.complement, last.split.factor); continue; }
      ctx.allocate(4); const ring: ComponentRing = new PolynomialRing(algebra, owner.t.variable);
      let argument: ComponentPolynomial, normalization: UnitAnalysis<E> | null = null;
      if (multiplicity === n) argument = specializeComponent(ctx, ring, denominator);
      else {
        const selected = prs.indexed[multiplicity]; demand(selected !== undefined, 'verification-failed', 'missing LRT index');
        const specialized = specializeComponent(ctx, ring, selected.polynomial);
        demand(ring.degree(ctx, specialized) === multiplicity, 'verification-failed', 'LRT selected degree');
        normalization = algebra.analyzeUnit(ctx, ring.leading(ctx, specialized));
        demand(normalization.kind === 'unit', 'verification-failed', 'LRT leading coefficient must be a unit');
        argument = ring.scale(ctx, specialized, normalization.inverse);
      }
      const denominatorDivision = monicDivide(ctx, ring, specializeComponent(ctx, ring, denominator), argument);
      const residueDivision = monicDivide(ctx, ring, specializeComponent(ctx, ring, residue), argument);
      ctx.allocate(argument.coefficients.length + 8);
      const term = firstLevelLogTerm(ctx, owner, descendConstantPolynomial(ctx, owner, modulus),
        owner.z.make(ctx, [owner.z.domain.fromInteger(ctx, 0n), owner.z.domain.fromInteger(ctx, 1n)]), selectionArgument(ctx, owner, argument));
      components.push(Object.freeze({ node, specializedDegree: degree, index: multiplicity, ring, normalization, argument, denominatorDivision, residueDivision, term }));
    }
    ctx.allocate(2); groups.push(Object.freeze({ nodes: Object.freeze(nodes), components: Object.freeze(components) }));
  }
  const result = Object.freeze(groups); verifyFirstLevelSelection(ctx, owner, residual, dn, prs, decomposition, result); return result;
}

export function verifyFirstLevelSelection<D extends FirstLevelRationalDomain>(ctx: ExecutionContext, owner: D, residual: E, dn: EP,
  prs: BivariatePRS, decomposition: SquareFreeDecomposition<import('./rational').Rational>, groups: readonly LrtGroup<D>[]): void {
  const { denominator, residue, z } = residueInputs(ctx, owner, residual, dn);
  demand(residual.kind === 'fraction', 'domain-mismatch', 'residual fraction');
  const n = owner.t.degree(ctx, residual.value.denominator);
  demand(groups.length === decomposition.factors.length, 'verification-failed', 'residue group coverage');
  for (let g = 0; g < groups.length; g++) {
    ctx.tick(); const { factor, multiplicity } = decomposition.factors[g], group = groups[g], pending = [owner.lift(ctx, factor, owner.kz)];
    ctx.allocate(group.nodes.length + group.components.length + 1); let componentIndex = 0;
    for (let nodeIndex = 0; nodeIndex < group.nodes.length; nodeIndex++) {
      ctx.tick(); const expected = pending.pop(), node = group.nodes[nodeIndex], algebra = node.algebra;
      demand(expected !== undefined && algebra.ring === owner.kz && owner.kz.equal(ctx, expected, algebra.modulus), 'verification-failed', 'residue partition coverage/order');
      descendConstantPolynomial(ctx, owner, algebra.modulus);
      let degree = residue.coefficients.length - 1;
      demand(node.analyses.length <= degree + 1, 'verification-failed', 'partition analysis length');
      for (let j = 0; j < node.analyses.length; j++, degree--) {
        const analysis = node.analyses[j]; algebra.verifyUnit(ctx, algebra.make(ctx, residue.coefficients[degree]), analysis);
        if (analysis.kind !== 'zero') { demand(j === node.analyses.length - 1, 'verification-failed', 'partition must stop at nonzero coefficient'); break; }
      }
      const last = node.analyses.at(-1);
      demand(degree === -1 || last?.kind === 'unit' || last?.kind === 'nonunit', 'verification-failed', 'incomplete specialization analysis');
      if (last?.kind === 'nonunit') { ctx.allocate(2); pending.push(last.split.complement, last.split.factor); continue; }
      const c = group.components[componentIndex++];
      demand(c !== undefined && c.node === nodeIndex && c.specializedDegree === degree && c.index === multiplicity,
        'verification-failed', 'LRT component index/degree');
      const ring = c.ring; demand(ring.domain === algebra && ring.variable === owner.t.variable, 'domain-mismatch', 'LRT component ring');
      const a = specializeComponent(ctx, ring, denominator), b = specializeComponent(ctx, ring, residue);
      demand(ring.degree(ctx, b) === degree && ring.degree(ctx, c.argument) === multiplicity, 'verification-failed', 'specialized degrees');
      demand(multiplicity > 0 && multiplicity <= n, 'verification-failed', 'residue multiplicity range');
      for (let j = 0; j < multiplicity; j++) {
        ctx.tick(); const lower = prs.indexed[j];
        demand(lower !== undefined && ring.isZero(ctx, specializeComponent(ctx, ring, lower.polynomial)), 'verification-failed', 'lower subresultant must vanish');
      }
      if (multiplicity === n) {
        // Total differentiation preserves degree in t. B can be a nonzero
        // multiple of N; the checked monic division below proves the boundary.
        demand(c.normalization === null && ring.equal(ctx, c.argument, a), 'verification-failed', 'highest-degree LRT selection');
      } else {
        const entry = prs.indexed[multiplicity]; demand(entry !== undefined, 'verification-failed', 'LRT indexed selection missing');
        const selected = specializeComponent(ctx, ring, entry.polynomial);
        demand(ring.degree(ctx, selected) === multiplicity && c.normalization?.kind === 'unit', 'verification-failed', 'LRT selected degree/unit');
        algebra.verifyUnit(ctx, ring.leading(ctx, selected), c.normalization);
        demand(ring.equal(ctx, c.argument, ring.scale(ctx, selected, c.normalization.inverse)), 'verification-failed', 'LRT monic normalization');
      }
      verifyMonicDivision(ctx, ring, a, c.argument, c.denominatorDivision); verifyMonicDivision(ctx, ring, b, c.argument, c.residueDivision);
      demand(ring.isZero(ctx, c.denominatorDivision.remainder) && ring.isZero(ctx, c.residueDivision.remainder), 'verification-failed', 'LRT common divisor');
      verifyFirstLevelLogTerm(ctx, owner, c.term);
      demand(owner.kz.equal(ctx, owner.lift(ctx, c.term.modulus, owner.kz), algebra.modulus) && algebra.equal(ctx, algebra.make(ctx, owner.lift(ctx, c.term.weight, owner.kz)), algebra.make(ctx, z)),
        'verification-failed', 'LRT root coverage/weight');
      ctx.allocate(c.argument.coefficients.length);
      demand(owner.fz.equal(ctx, c.term.argument, selectionArgument(ctx, owner, c.argument)),
        'verification-failed', 'LRT logarithm argument');
    }
    demand(pending.length === 0 && componentIndex === group.components.length, 'verification-failed', 'incomplete/duplicated component coverage');
  }
}
