import { demand, type ExecutionContext } from './execution';
import type { DifferentialElement as E } from './differential-field';
import { recursiveConditions, certifiedTowerConditionSources, type RecursiveConditionSource } from './recursive-conditions';
import { recursiveConstructionArgument } from './recursive-differential-admission';
import type { TranscendentalDomain } from './transcendental-domain';
import type { FirstLevelCondition } from './first-level-rational-conditions';
import type { TranscendentalPrimitive } from './transcendental-primitive';
export type TranscendentalCondition = FirstLevelCondition;
export function transcendentalConditions(ctx: ExecutionContext, d: TranscendentalDomain, input: E, primitive?: TranscendentalPrimitive): readonly TranscendentalCondition[] {
  const construction = certifiedTowerConditionSources(ctx, d.view); ctx.allocate(construction.length + 1);
  const sources: RecursiveConditionSource[] = [...construction, {path: 'input', value: input}];
  for (let v = d.view; v.parent; v = v.parent) {
    if (v.proof.kind === 'first-level' && v.proof.admission.kind === 'exponential') {
      ctx.allocate(v.proof.admission.arguments.length);
      for (let i = 0; i < v.proof.admission.arguments.length; i++) sources.push({path: `construction.${v.owner.height}.alias.${i}`, value: v.proof.admission.arguments[i]});
    }
    const a = v.proof.kind === 'first-level' ? v.proof.admission.argument : v.proof.kind === 'recursive' ? recursiveConstructionArgument(v.proof.admission.construction) : null;
    if (v.monomial === 'primitive' && a?.kind === 'fraction') for (const side of ['numerator', 'denominator'] as const) {
      ctx.allocate(4); sources.push({path: `construction.${v.owner.height}.argument.${side}`, value: a.owner.make(ctx, a.value[side].coefficients), nonzero: true});
    }
  }
  if (primitive) {
    demand(primitive.domain === d, 'domain-mismatch', 'primitive condition owner'); ctx.allocate(primitive.terms.length + 1);
    sources.push({path: 'primitive.field', value: primitive.fieldPart});
    for (let i = 0; i < primitive.terms.length; i++) {
      const t = primitive.terms[i]; ctx.allocate(t.argument.coefficients.length + 1);
      for (let j = 0; j < t.argument.coefficients.length; j++) sources.push({path: `primitive.log.${i}.argument.${j}`, value: t.argument.coefficients[j]});
      sources.push({path: `primitive.log.${i}.norm`, value: t.norm, nonzero: true});
    }
  }
  const entries = recursiveConditions(ctx, d.field, sources); ctx.allocate(entries.length);
  return Object.freeze(entries.map(e => {
    const category = e.path.startsWith('construction.') ? 'construction' : e.path.includes('.norm') && e.kind === 'logarithm-argument' ? 'log-norm'
      : e.path.includes('.numerator.') || e.path.includes('.denominator.') ? 'coefficient-denominator' : 'outer-denominator';
    demand(!d.field.isZero(ctx, e.value), 'verification-failed', 'zero evaluation restriction'); ctx.allocate(3); return Object.freeze({category, path: e.path, value: e.value});
  }));
}
export function verifyTranscendentalConditions(ctx: ExecutionContext, d: TranscendentalDomain, input: E, primitive: TranscendentalPrimitive | undefined, supplied: readonly TranscendentalCondition[]): void {
  const expected = transcendentalConditions(ctx, d, input, primitive);
  demand(expected.length === supplied.length, 'verification-failed', 'complete transcendental condition coverage');
  for (let i = 0; i < expected.length; i++) demand(expected[i].category === supplied[i].category && expected[i].path === supplied[i].path
    && d.field.equal(ctx, expected[i].value, supplied[i].value), 'verification-failed', 'transcendental condition provenance/value');
}
