import { demand, type ExecutionContext } from './execution';
import { rationalField } from './field';
import { type Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import type { PolynomialDomain } from './polynomial-domain';
import { type FormalPrimitiveDomain, type QPolynomial, type QRationalFunction, type RootLogTerm, type BivariatePolynomial } from './formal-primitive';
import { SquareFreeQuotientAlgebra, type QuotientElement, type UnitAnalysis } from './quotient-algebra';
import { subresultants, verifySubresultants, type SubresultantCertificate } from './subresultant';
import { squareFree, verifySquareFree, type SquareFreeDecomposition } from './polynomial-square-free';
import { monicDivide, verifyMonicDivision, type MonicDivision } from './monic-division';

export type ResidueAlgebra = SquareFreeQuotientAlgebra<Rational>;
export type ComponentRing = PolynomialRing<QuotientElement<Rational>, ResidueAlgebra>;
export type ComponentPolynomial = Polynomial<QuotientElement<Rational>, ResidueAlgebra>;
export type BivariatePRS = SubresultantCertificate<QPolynomial, PolynomialDomain<Rational>>;
/** Flat preorder tree. Split children are factor then complement; no recursive traversal. */
export interface ResiduePartitionNode {
  readonly algebra: ResidueAlgebra;
  readonly analyses: readonly UnitAnalysis<Rational>[];
}
export interface LrtComponent {
  readonly node: number;
  readonly specializedDegree: number;
  readonly index: number;
  readonly ring: ComponentRing;
  readonly normalization: UnitAnalysis<Rational> | null;
  readonly argument: ComponentPolynomial;
  readonly denominatorDivision: MonicDivision<QuotientElement<Rational>, ResidueAlgebra>;
  readonly residueDivision: MonicDivision<QuotientElement<Rational>, ResidueAlgebra>;
  readonly term: RootLogTerm;
}
export interface LrtGroup {
  readonly nodes: readonly ResiduePartitionNode[];
  readonly components: readonly LrtComponent[];
}
export interface LrtCertificate {
  readonly prs: BivariatePRS;
  readonly decomposition: SquareFreeDecomposition<Rational>;
  readonly groups: readonly LrtGroup[];
}
export function lrtInputs(ctx: ExecutionContext, owner: FormalPrimitiveDomain, residual: QRationalFunction) {
  owner.fractions.assert(ctx, residual);
  const z = owner.z.make(ctx, [rationalField.fromInteger(ctx, 0n), rationalField.fromInteger(ctx, 1n)]);
  ctx.allocate(residual.denominator.coefficients.length);
  const denominator = owner.arguments.make(ctx, residual.denominator.coefficients.map(c => owner.z.constant(ctx, c)));
  const derivative = owner.x.derivative(ctx, residual.denominator);
  ctx.allocate(Math.max(derivative.coefficients.length, residual.numerator.coefficients.length));
  const coefficients: QPolynomial[] = [];
  for (let j = 0; j < Math.max(derivative.coefficients.length, residual.numerator.coefficients.length); j++) {
    ctx.tick(); coefficients.push(owner.z.subtract(ctx, owner.z.constant(ctx, residual.numerator.coefficients[j] ?? rationalField.fromInteger(ctx, 0n)),
      owner.z.scale(ctx, z, derivative.coefficients[j] ?? rationalField.fromInteger(ctx, 0n))));
  }
  return { denominator, residue: owner.arguments.make(ctx, coefficients), z };
}
export function specializeComponent(ctx: ExecutionContext, ring: ComponentRing, input: BivariatePolynomial): ComponentPolynomial {
  ctx.allocate(input.coefficients.length);
  return ring.make(ctx, input.coefficients.map(c => ring.domain.make(ctx, c)));
}
export function lrtReduce(ctx: ExecutionContext, owner: FormalPrimitiveDomain, residual: QRationalFunction): LrtCertificate {
  demand(!owner.fractions.isZero(ctx, residual), 'invalid-input', 'LRT requires nonzero residual');
  const { denominator, residue, z } = lrtInputs(ctx, owner, residual);
  const prs = subresultants(ctx, owner.arguments, denominator, residue);
  const n = owner.x.degree(ctx, residual.denominator);
  demand(owner.z.degree(ctx, prs.resultant) === n, 'verification-failed', 'residue resultant degree');
  const decomposition = squareFree(ctx, owner.z, prs.resultant);
  const groups: LrtGroup[] = []; ctx.allocate(decomposition.factors.length);
  for (const { factor, multiplicity } of decomposition.factors) {
    const nodes: ResiduePartitionNode[] = [], components: LrtComponent[] = [], pending = [factor]; ctx.allocate(3);
    while (pending.length) {
      ctx.tick(); const modulus = pending.pop()!, algebra = new SquareFreeQuotientAlgebra(ctx, owner.z, modulus);
      const analyses: UnitAnalysis<Rational>[] = []; ctx.allocate(residue.coefficients.length + 2);
      let degree = residue.coefficients.length - 1;
      for (; degree >= 0; degree--) {
        const analysis = algebra.analyzeUnit(ctx, algebra.make(ctx, residue.coefficients[degree])); analyses.push(analysis);
        if (analysis.kind !== 'zero') break;
      }
      ctx.allocate(1); const node = nodes.length; nodes.push(Object.freeze({ algebra, analyses: Object.freeze(analyses) }));
      const last = analyses.at(-1);
      if (last?.kind === 'nonunit') { ctx.allocate(2); pending.push(last.split.complement, last.split.factor); continue; }
      ctx.allocate(4); const ring: ComponentRing = new PolynomialRing(algebra, owner.x.variable);
      let argument: ComponentPolynomial, normalization: UnitAnalysis<Rational> | null = null;
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
      const term = owner.term(ctx, modulus, z, owner.arguments.make(ctx, argument.coefficients.map(c => c.representative)));
      components.push(Object.freeze({ node, specializedDegree: degree, index: multiplicity, ring, normalization, argument, denominatorDivision, residueDivision, term }));
    }
    ctx.allocate(2); groups.push(Object.freeze({ nodes: Object.freeze(nodes), components: Object.freeze(components) }));
  }
  ctx.allocate(3); const result = Object.freeze({ prs, decomposition, groups: Object.freeze(groups) });
  verifyLrt(ctx, owner, residual, result); return result;
}

export function verifyLrt(ctx: ExecutionContext, owner: FormalPrimitiveDomain, residual: QRationalFunction, proof: LrtCertificate): void {
  demand(!owner.fractions.isZero(ctx, residual), 'verification-failed', 'zero residual has no LRT');
  const { denominator, residue, z } = lrtInputs(ctx, owner, residual), n = owner.x.degree(ctx, residual.denominator);
  verifySubresultants(ctx, owner.arguments, denominator, residue, proof.prs);
  demand(owner.z.degree(ctx, proof.prs.resultant) === n, 'verification-failed', 'residue resultant degree');
  verifySquareFree(ctx, owner.z, proof.prs.resultant, proof.decomposition);
  demand(proof.groups.length === proof.decomposition.factors.length, 'verification-failed', 'residue group coverage');
  for (let g = 0; g < proof.groups.length; g++) {
    ctx.tick(); const { factor, multiplicity } = proof.decomposition.factors[g], group = proof.groups[g], pending = [factor];
    ctx.allocate(group.nodes.length + group.components.length + 1); let componentIndex = 0;
    for (let nodeIndex = 0; nodeIndex < group.nodes.length; nodeIndex++) {
      ctx.tick(); const expected = pending.pop(), node = group.nodes[nodeIndex], algebra = node.algebra;
      demand(expected !== undefined && algebra.ring === owner.z && owner.z.equal(ctx, expected, algebra.modulus), 'verification-failed', 'residue partition coverage/order');
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
      const ring = c.ring; demand(ring.domain === algebra && ring.variable === owner.x.variable, 'domain-mismatch', 'LRT component ring');
      const a = specializeComponent(ctx, ring, denominator), b = specializeComponent(ctx, ring, residue);
      demand(ring.degree(ctx, b) === degree && ring.degree(ctx, c.argument) === multiplicity, 'verification-failed', 'specialized degrees');
      if (multiplicity === n) {
        demand(c.normalization === null && ring.isZero(ctx, b) && ring.equal(ctx, c.argument, a), 'verification-failed', 'highest-degree LRT selection');
      } else {
        demand(multiplicity > 0 && multiplicity < n, 'verification-failed', 'residue multiplicity range');
        for (let j = 0; j < multiplicity; j++) {
          ctx.tick(); const lower = proof.prs.indexed[j];
          demand(lower !== undefined && ring.isZero(ctx, specializeComponent(ctx, ring, lower.polynomial)), 'verification-failed', 'lower subresultant must vanish');
        }
        const entry = proof.prs.indexed[multiplicity]; demand(entry !== undefined, 'verification-failed', 'LRT indexed selection missing');
        const selected = specializeComponent(ctx, ring, entry.polynomial);
        demand(ring.degree(ctx, selected) === multiplicity && c.normalization?.kind === 'unit', 'verification-failed', 'LRT selected degree/unit');
        algebra.verifyUnit(ctx, ring.leading(ctx, selected), c.normalization);
        demand(ring.equal(ctx, c.argument, ring.scale(ctx, selected, c.normalization.inverse)), 'verification-failed', 'LRT monic normalization');
      }
      verifyMonicDivision(ctx, ring, a, c.argument, c.denominatorDivision); verifyMonicDivision(ctx, ring, b, c.argument, c.residueDivision);
      demand(ring.isZero(ctx, c.denominatorDivision.remainder) && ring.isZero(ctx, c.residueDivision.remainder), 'verification-failed', 'LRT common divisor');
      owner.verifyTerm(ctx, c.term);
      demand(owner.z.equal(ctx, c.term.modulus, algebra.modulus) && algebra.equal(ctx, algebra.make(ctx, c.term.weight), algebra.make(ctx, z)),
        'verification-failed', 'LRT root coverage/weight');
      ctx.allocate(c.argument.coefficients.length);
      demand(owner.arguments.equal(ctx, c.term.argument, owner.arguments.make(ctx, c.argument.coefficients.map(v => v.representative))),
        'verification-failed', 'LRT logarithm argument');
    }
    demand(pending.length === 0 && componentIndex === group.components.length, 'verification-failed', 'incomplete/duplicated component coverage');
  }
}
