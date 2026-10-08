/** Complete sidecar construction replay bound to explicit expected native owners. */
import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialBounds } from './differential-field';
import { verifyAdmission, type FunctionAdmission } from './differential-admission';
import { factorCoefficientDomain } from './factorization-domain';
import { normalizationInteger, normalizationKind } from './exponential-normalization-wire-values';
import { CertifiedTowerView, verifyCertifiedTowerWithin } from './recursive-certified-tower';
import { recursiveAdmissionEvidenceCodec } from './recursive-differential-admission-wire';
import { recursiveConstructionArgument, verifyRecursiveAdmissionEvidenceWithin } from './recursive-differential-admission';
import * as w from './decision-wire-algebra';

export function firstLevelAdmissionEvidenceCodec(ctx: ExecutionContext, parent: DifferentialField, bounds: DifferentialBounds): w.EvidenceCodec<FunctionAdmission> {
  const element = factorCoefficientDomain(ctx, parent, bounds.towerHeight).codec(ctx), scalar = factorCoefficientDomain(ctx, parent.parent!, 0).codec(ctx);
  const p = w.polynomial(ctx, parent.fractions!.ring, scalar), decomposition = w.squareFreeEvidence(ctx, p, scalar), integer = normalizationInteger(ctx);
  const common = {argument: element, derivative: w.structure(ctx, {input: element, derivative: element}), denominator: decomposition, conditions: w.list(ctx, p)};
  const exp = w.structure(ctx, {...common, kind: w.literal(ctx, 'exponential'), obstruction: w.literal(ctx, 'polynomial-part', 'finite-pole'),
    arguments: w.list(ctx, element), exponents: w.list(ctx, integer)});
  const log = w.structure(ctx, {...common, kind: w.literal(ctx, 'logarithmic'), semantics: w.literal(ctx, 'chosen-local-log'), numerator: decomposition,
    residueSide: w.literal(ctx, 'numerator', 'denominator'), residue: integer});
  return {encode(value) { return value.kind === 'exponential' ? exp.encode(value) : log.encode(value); },
    decode(value) { if (normalizationKind(value) === 'exponential') return exp.decode(value);
      demand(normalizationKind(value) === 'logarithmic', 'invalid-input', 'stored first-level admission kind'); return log.decode(value); }};
}
function levels(ctx: ExecutionContext, view: CertifiedTowerView): readonly CertifiedTowerView[] {
  const out: CertifiedTowerView[] = []; for (let v: CertifiedTowerView | null = view; v; v = v.parent) { ctx.tick(); ctx.allocate(1); out.push(v); }
  return out.reverse();
}
export function encodeCertifiedTowerSnapshot(ctx: ExecutionContext, view: CertifiedTowerView, bounds: DifferentialBounds): unknown {
  verifyCertifiedTowerWithin(ctx, view, bounds); const vs = levels(ctx, view); ctx.allocate(vs.length);
  return Object.freeze(vs.map(v => {
    const owner = v.owner, coefficient = factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx), rule = w.polynomial(ctx, owner.fractions!.ring, coefficient).encode(owner.rule!);
    ctx.allocate(4);
    if (v.proof.kind === 'base') return Object.freeze({kind: 'base', variable: owner.fractions!.ring.variable, rule});
    if (v.proof.kind === 'first-level') return Object.freeze({kind: 'first-level', variable: owner.fractions!.ring.variable, rule,
      admission: firstLevelAdmissionEvidenceCodec(ctx, owner.parent!, bounds).encode(v.proof.admission)});
    return Object.freeze({kind: 'recursive', variable: owner.fractions!.ring.variable, rule,
      admission: recursiveAdmissionEvidenceCodec(ctx, v.parent!, owner, bounds).encode(v.proof.admission)});
  }));
}
/** No admission or differential-field constructor is called. Mathematical proof is replayed. */
export function replayCertifiedTowerSnapshot(ctx: ExecutionContext, view: CertifiedTowerView, data: unknown, bounds: DifferentialBounds): void {
  verifyCertifiedTowerWithin(ctx, view, bounds); const expected = levels(ctx, view), actual = w.array(ctx, data);
  demand(actual.length === expected.length, 'verification-failed', 'stored tower height/coverage');
  for (let i = 0; i < expected.length; i++) {
    const v = expected[i], owner = v.owner;
    const raw = w.record(ctx, actual[i], v.proof.kind === 'base' ? ['kind', 'variable', 'rule'] : ['kind', 'variable', 'rule', 'admission']);
    demand(raw.kind === v.proof.kind && raw.variable === owner.fractions!.ring.variable, 'domain-mismatch', 'stored tower construction kind/name');
    const coefficient = factorCoefficientDomain(ctx, owner.parent!, bounds.towerHeight).codec(ctx), p = w.polynomial(ctx, owner.fractions!.ring, coefficient).decode(raw.rule);
    demand(owner.fractions!.ring.equal(ctx, owner.rule!, p), 'verification-failed', 'stored complete derivation rule');
    if (v.proof.kind === 'first-level') {
      const a = firstLevelAdmissionEvidenceCodec(ctx, owner.parent!, bounds).decode(raw.admission);
      verifyAdmission(ctx, owner, a);
      demand(a.kind === v.proof.admission.kind && owner.parent!.equal(ctx, a.argument, v.proof.admission.argument), 'verification-failed', 'stored original logarithm/exponent argument');
    }
    if (v.proof.kind === 'recursive') {
      const a = recursiveAdmissionEvidenceCodec(ctx, v.parent!, owner, bounds).decode(raw.admission);
      verifyRecursiveAdmissionEvidenceWithin(ctx, v.parent!, owner, v.proof.admission.construction, a, bounds);
      demand(a.outcome === 'admitted' && a.construction.kind === v.proof.admission.construction.kind && owner.parent!.equal(ctx,
        recursiveConstructionArgument(a.construction), recursiveConstructionArgument(v.proof.admission.construction)), 'verification-failed', 'stored complete recursive construction');
    }
  }
}
