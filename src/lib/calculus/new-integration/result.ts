import type { CanonicalResultDocument } from '../../../types/calculator/canonical-result-current';
import type { SerializableMathJson } from '../../../types/calculator';
import { buildCanonicalResultDocument } from '../../result-contract/current';
import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { FormalPrimitiveDomain, type QPolynomial, type QRationalFunction } from '../../symbolic-engine/integration/core/formal-primitive';
import { verifyRationalDecision, type RationalDecision } from '../../symbolic-engine/integration/core/rational-decision';
import { checkSourceTarget } from './source-target';
import { fromRationalPrimitiveInput } from '../../symbolic-engine/integration/core/exponential-sum-bridge';
import { normalizationRestrictions, type IntegrationSourceProof } from './normalization-result';
import { fractionTree, polynomialTree, provenMath, treeFraction } from './exact-math';

export function rationalDecisionResult(ctx: ExecutionContext, owner: FormalPrimitiveDomain, input: QRationalFunction,
  decision: RationalDecision, sourceExclusions: readonly QPolynomial[] = [], source?: IntegrationSourceProof): CanonicalResultDocument {
  verifyRationalDecision(ctx, owner, input, decision);
  return ctx.operation(() => {
    if (source) checkSourceTarget(ctx, source, fromRationalPrimitiveInput(ctx, source.owner, owner, input));
    const x = owner.x.variable;
    const fresh = (base: string, used: Set<string>) => {let name = base, i = 0; while (used.has(name)) name = `${base}_${++i}`; used.add(name); return name;};
    const used = new Set([x]), constant = fresh('C', used);
    const polynomial = (p: QPolynomial, variable = x) => {
      p.ring.assert(ctx, p);
      const tree = polynomialTree(ctx, p, variable);
      const o = new FormalPrimitiveDomain(variable, variable === 'z' ? 'r' : 'z');
      const rebound = o.x.make(ctx, p.coefficients);
      demand(o.fractions.equal(ctx, treeFraction(ctx, o, tree), o.fractions.make(ctx, rebound, o.x.one(ctx))), 'verification-failed', 'polynomial projection');
      return provenMath(ctx, tree);
    };
    const rationalTree = fractionTree(ctx, decision.primitive.rationalPart, x);
    demand(owner.fractions.equal(ctx, treeFraction(ctx, owner, rationalTree), decision.primitive.rationalPart), 'verification-failed', 'rational projection');
    const conditions = {
      sourceExclusions: sourceExclusions.map(p => {owner.x.assert(ctx, p); demand(!owner.x.isZero(ctx, p), 'invalid-input', 'zero source exclusion'); return polynomial(p);}),
      inputDenominator: polynomial(decision.conditions.inputDenominator),
      rationalDenominator: polynomial(decision.conditions.rationalDenominator),
      logNorms: decision.conditions.logNorms.map(p => polynomial(p)),
    };
    const common = {outcomeKind: 'success' as const, title: 'Verified antiderivative', warnings: ['Formal local complex primitive; logarithm choices differ locally by constants.']};
    const terms = decision.primitive.terms.map((t, index) => {
      const rootVariable = fresh('a', used);
      // Each bivariate coefficient is independently round-tripped in its bound root variable.
      const coefficients = t.argument.coefficients.map(c => polynomial(c, rootVariable));
      const parts: SerializableMathJson[] = coefficients.map((c, i) => i === 0 ? c.mathJson : ['Multiply', c.mathJson, i === 1 ? x : ['Power', x, i]]);
      const argumentTree: SerializableMathJson = parts.length === 1 ? parts[0] : ['Add', ...parts];
      return {rootVariable, modulus: polynomial(t.modulus, rootVariable), weight: polynomial(t.weight, rootVariable), argument: provenMath(ctx, argumentTree), norm: conditions.logNorms[index]};
    });
    return buildCanonicalResultDocument({...common, primary: {kind: 'rational-antiderivative', semantics: 'formal-local-complex', variable: x,
      integrationConstant: constant, rationalPart: provenMath(ctx, rationalTree), terms, restrictions: [
        ...(source ? normalizationRestrictions(ctx, source) : []),
        ...conditions.sourceExclusions.map((value, i) => ({kind: 'nonzero' as const, value, origins: [{category: 'source' as const, path: `source.${i}`}]})),
        {kind: 'nonzero', value: conditions.inputDenominator, origins: [{category: 'input-denominator', path: 'input.denominator'}]},
        {kind: 'nonzero', value: conditions.rationalDenominator, origins: [{category: 'primitive-denominator', path: 'primitive.denominator'}]},
        ...conditions.logNorms.map((value, i) => ({kind: 'nonzero' as const, value, origins: [{category: 'log-norm' as const, path: `primitive.log.${i}`}]})),
      ]}});

  });
}
