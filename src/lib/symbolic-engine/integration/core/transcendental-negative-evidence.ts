/** Complete obstruction prefixes with distinct compact subsidiary families. */
import {demand, type ExecutionContext} from './execution';
import type {DifferentialElement as E, DifferentialBounds} from './differential-field';
import type {CertifiedTowerView} from './recursive-certified-tower';
import {requireArithmeticDomain, type TranscendentalDomain} from './transcendental-domain';
import {TRANSCENDENTAL_RULE, transcendentalDecisionConditions, verifyTranscendentalResiduePrefixWithin,
  type TranscendentalCandidate, type TranscendentalObstruction, type TranscendentalRemainder} from './transcendental-decision';
import type {DifferentialHermite} from './first-level-rational-hermite';
import type {TranscendentalResidue} from './transcendental-residue';
import {verifyTranscendentalPolynomialFamily, type TranscendentalPolynomialReduction} from './transcendental-polynomial';
import {verifyTranscendentalLaurentFamily, type TranscendentalLaurentReduction} from './transcendental-laurent';
import {completeCompactRecursiveParametricRdeWithin, verifyCompactRecursiveParametricRdeWithin, type CompactRecursiveParametricRde} from './compact-recursive-rde';
import {completeCompactRecursiveLimitedIntegrationWithin, verifyCompactRecursiveLimitedIntegrationWithin, type CompactRecursiveLimitedIntegration} from './compact-recursive-limited';
import {produceCompactTranscendentalCandidateWithin, checkCompactTranscendentalCandidateWithin,
  type CompactTranscendentalElementaryCandidate, type CompactTranscendentalElementary} from './transcendental-elementary-evidence';
import type {TranscendentalCondition} from './transcendental-conditions';
import {requireImmutableExactEvidence} from './owned-validation';

export interface CompactTranscendentalNegative {
  readonly kind: 'non-elementary'; readonly rule: typeof TRANSCENDENTAL_RULE; readonly format: 'compact-obstruction-v2';
  readonly domain: TranscendentalDomain; readonly input: E; readonly stage: 'logarithmic' | 'exponential';
  readonly hermite: DifferentialHermite; readonly residue: TranscendentalResidue|null; readonly remainder: TranscendentalRemainder|null;
  readonly polynomial: TranscendentalPolynomialReduction<CompactRecursiveLimitedIntegration>|null;
  readonly laurent: TranscendentalLaurentReduction<CompactRecursiveParametricRde>|null;
  readonly parent: CompactTranscendentalNegative|null; readonly obstruction: TranscendentalObstruction;
  readonly conditions: readonly TranscendentalCondition[];
}
export type CompactTranscendentalDecisionCandidate = CompactTranscendentalElementaryCandidate | CompactTranscendentalNegative;
export type CompactTranscendentalIntegrationDecision = CompactTranscendentalElementary | CompactTranscendentalNegative;


/** Retained differential search is reused; only rational rank evidence is built. */
export function compactTranscendentalNegativeWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, source: TranscendentalCandidate, bounds: DifferentialBounds): CompactTranscendentalNegative {
  demand(source.kind === 'non-elementary' && source.stage !== 'rational' && source.hermite !== null && source.obstruction !== null, 'verification-failed', 'complete negative source prefix');
  const polynomial = source.polynomial === null ? null : (() => {
    ctx.allocate(source.polynomial.steps.length + 1);
    const steps = source.polynomial.steps.map(step => {
      const old = step.limited.rde, rde = completeCompactRecursiveParametricRdeWithin(ctx, view.parent!, old.a, old.b, old.forcing, old.homogeneous, bounds);
      const limited = completeCompactRecursiveLimitedIntegrationWithin(ctx, view.parent!, step.leading, [view.rate!], rde, bounds); ctx.allocate(8);
      return Object.freeze({...step, limited});
    });
    ctx.allocate(5); return Object.freeze({...source.polynomial, steps: Object.freeze(steps)});
  })();
  const laurent = source.laurent === null ? null : (() => {
    ctx.allocate(source.laurent.steps.length + 1);
    const steps = source.laurent.steps.map(step => {
      const old = step.rde, rde = completeCompactRecursiveParametricRdeWithin(ctx, view.parent!, old.a, old.b, old.forcing, old.homogeneous, bounds); ctx.allocate(5);
      return Object.freeze({...step, rde});
    });
    ctx.allocate(6); return Object.freeze({...source.laurent, steps: Object.freeze(steps)});
  })();
  const parent = source.parent === null ? null : compactTranscendentalNegativeWithin(ctx, view.parent!, source.parent.input, source.parent, bounds);
  const core = {kind: 'non-elementary' as const, rule: TRANSCENDENTAL_RULE, format: 'compact-obstruction-v2' as const,
    domain: source.domain, input: source.input, stage: source.stage, hermite: source.hermite, residue: source.residue, remainder: source.remainder,
    polynomial, laurent, parent, obstruction: source.obstruction};
  const conditions = transcendentalDecisionConditions(ctx, core); ctx.allocate(14); const proof = Object.freeze({...core, conditions});
  verifyCompactTranscendentalNegativeWithin(ctx, view, input, proof, bounds); requireImmutableExactEvidence(ctx, proof); return proof;
}
export function verifyCompactTranscendentalNegativeWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalNegative, bounds: DifferentialBounds): void {
  const d = proof.domain; requireArithmeticDomain(ctx, d, bounds); demand(d.view === view && d.field === view.owner, 'domain-mismatch', 'compact negative supplied certified view'); d.field.assert(ctx, input);
  demand(proof.kind === 'non-elementary' && proof.rule === TRANSCENDENTAL_RULE && proof.format === 'compact-obstruction-v2'
    && d.field.equal(ctx, input, proof.input) && view.parent !== null, 'verification-failed', 'compact negative complete original request/rule');
  demand(proof.stage === (view.monomial === 'primitive' ? 'logarithmic' : 'exponential'), 'verification-failed', 'compact negative recursive stage');
  const normal = verifyTranscendentalResiduePrefixWithin(ctx, d, input, proof.hermite, proof.residue, proof.remainder, bounds);
  let kind: TranscendentalObstruction['kind'], index: number|null;
  if (normal !== null) {
    kind = 'normal-residue'; index = normal;
    demand(proof.polynomial === null && proof.laurent === null && proof.parent === null, 'verification-failed', 'compact normal obstruction later work unperformed');
  } else {
    demand(proof.remainder !== null, 'verification-failed', 'complete compact residue subtraction'); let parentInput: E|null;
    if (view.monomial === 'primitive') {
      demand(proof.polynomial !== null && proof.laurent === null, 'verification-failed', 'compact polynomial coverage');
      verifyTranscendentalPolynomialFamily(ctx, d, proof.remainder.value, proof.polynomial, bounds, verifyCompactRecursiveLimitedIntegrationWithin);
      kind = 'logarithmic-coefficient'; index = proof.polynomial.failure; parentInput = proof.polynomial.remainder;
    } else {
      demand(proof.polynomial === null && proof.laurent !== null, 'verification-failed', 'compact Laurent coverage');
      verifyTranscendentalLaurentFamily(ctx, d, proof.remainder.value, proof.laurent, bounds, verifyCompactRecursiveParametricRdeWithin);
      kind = 'exponential-component'; index = proof.laurent.failure; parentInput = proof.laurent.remainder;
    }
    if (index !== null) demand(proof.parent === null, 'verification-failed', 'compact failed component subsequent parent unsolved');
    else {
      demand(proof.parent !== null && parentInput !== null, 'verification-failed', 'compact propagated parent obstruction coverage');
      verifyCompactTranscendentalNegativeWithin(ctx, view.parent, parentInput, proof.parent, bounds); kind = 'parent-decision';
    }
  }
  demand(proof.obstruction.kind === kind && proof.obstruction.index === index && proof.obstruction.level === d.field.height, 'verification-failed', 'compact checked Liouville obstruction location');
  const conditions = transcendentalDecisionConditions(ctx, proof); demand(conditions.length === proof.conditions.length, 'verification-failed', 'compact negative retained conditions');
  for (let i = 0; i < conditions.length; i++) demand(conditions[i].category === proof.conditions[i].category && conditions[i].path === proof.conditions[i].path
    && d.field.equal(ctx, conditions[i].value, proof.conditions[i].value), 'verification-failed', 'compact negative exact condition provenance');
}
export function produceCompactTranscendentalDecisionCandidateWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): CompactTranscendentalDecisionCandidate {
  const value = produceCompactTranscendentalCandidateWithin(ctx, view, input, bounds);
  return value.kind === 'elementary' ? value : compactTranscendentalNegativeWithin(ctx, view, input, value, bounds);
}
export function checkCompactTranscendentalDecisionCandidateWithin(ctx: ExecutionContext, view: CertifiedTowerView, input: E, value: CompactTranscendentalDecisionCandidate, bounds: DifferentialBounds): CompactTranscendentalIntegrationDecision {
  if (value.kind === 'non-elementary') {verifyCompactTranscendentalNegativeWithin(ctx, view, input, value, bounds); requireImmutableExactEvidence(ctx, value); return value;}
  const proof = checkCompactTranscendentalCandidateWithin(ctx, view, input, value, bounds); demand(proof.kind === 'elementary', 'verification-failed', 'compact positive check'); return proof;
}
export function produceCompactTranscendentalDecisionCandidate(ctx: ExecutionContext, view: CertifiedTowerView, input: E, bounds: DifferentialBounds): CompactTranscendentalDecisionCandidate {
  return ctx.operation(() => produceCompactTranscendentalDecisionCandidateWithin(ctx, view, input, bounds));
}
export function checkCompactTranscendentalDecisionCandidate(ctx: ExecutionContext, view: CertifiedTowerView, input: E, value: CompactTranscendentalDecisionCandidate, bounds: DifferentialBounds): CompactTranscendentalIntegrationDecision {
  return ctx.operation(() => checkCompactTranscendentalDecisionCandidateWithin(ctx, view, input, value, bounds));
}
export function verifyCompactTranscendentalNegative(ctx: ExecutionContext, view: CertifiedTowerView, input: E, proof: CompactTranscendentalNegative, bounds: DifferentialBounds): void {
  ctx.operation(() => verifyCompactTranscendentalNegativeWithin(ctx, view, input, proof, bounds));
}
