import type { CanonicalIntegrationRestriction } from '../../../types/calculator/canonical-result-integration';
import { buildCanonicalResultDocument } from '../../result-contract/current';
import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import type { DifferentialField, DifferentialElement as E, DifferentialBounds } from '../../symbolic-engine/integration/core/differential-field';
import { verifyExponentialRationalDecision, type ExponentialRationalDecision } from '../../symbolic-engine/integration/core/exponential-rational-decision';
import { freshName, projectQPolynomial, projectElement, projectFieldPolynomial, type FieldBindings } from './exponential-math';
import { checkSourceTarget } from './source-target';
import { normalizationRestrictions, type IntegrationSourceProof } from './normalization-result';

export function exponentialDecisionResult(ctx: ExecutionContext, field: DifferentialField, input: E,
  decision: ExponentialRationalDecision, bounds: DifferentialBounds, source?: IntegrationSourceProof) {
  verifyExponentialRationalDecision(ctx, field, input, decision, bounds);
  return ctx.operation(() => {
    const base = field.parent!, variable = base.fractions!.ring.variable, used = new Set([variable]);
    const generator = freshName('t', used), integrationConstant = freshName('C', used);
    if (source) {demand(source.owner === base, 'domain-mismatch', 'result source owner'); checkSourceTarget(ctx, source, input);}
    const bindings: FieldBindings = new Map([[base, variable], [field, generator]]);
    const construction = {kind: 'rational-exponential' as const, generator,
      argument: projectElement(ctx, base, field.admission!.argument, bindings)};
    const restrictions: CanonicalIntegrationRestriction[] = [...(source ? normalizationRestrictions(ctx, source) : []), ...decision.conditions.map(c => ({kind: 'nonzero' as const,
      value: projectElement(ctx, field, c.value, bindings), origins: [{category: c.category === 'construction' ? 'argument-denominator' as const
        : c.category === 'outer-denominator' ? c.path.startsWith('input') ? 'input-denominator' as const : 'primitive-denominator' as const
        : c.category, path: c.path}]}))];
    if (decision.kind === 'non-elementary') return buildCanonicalResultDocument({outcomeKind: 'success', title: 'Verified non-elementary', warnings: [],
      primary: {kind: 'non-elementary', variable, subject: projectElement(ctx, field, input, bindings), construction,
        supportedClass: 'rational-in-one-rational-exponential', obstruction: decision.obstruction === 'laurent' ? 'laurent-component' : 'nonconstant-residue', restrictions}});
    const terms = decision.primitive.terms.map(term => {
      const rootVariable = freshName('a', used);
      return {rootVariable, modulus: projectQPolynomial(ctx, term.modulus, rootVariable),
        weight: projectQPolynomial(ctx, term.weight, rootVariable),
        argument: projectFieldPolynomial(ctx, decision.domain.fz, term.argument, rootVariable, bindings),
        norm: projectElement(ctx, field, term.norm, bindings)};
    });
    return buildCanonicalResultDocument({outcomeKind: 'success', title: 'Verified antiderivative',
      warnings: ['Formal local complex primitive; logarithm choices differ locally by constants.'],
      primary: {kind: 'exponential-antiderivative', semantics: 'formal-local-complex', variable, integrationConstant, construction,
        fieldPart: projectElement(ctx, field, decision.primitive.fieldPart, bindings), terms, restrictions}});
  });
}
