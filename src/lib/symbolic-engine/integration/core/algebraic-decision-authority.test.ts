import { beforeAll, describe, it, expect } from 'vitest';
import { base, fresh, bounds } from './__tests__/algebraic-support';
import { ExecutionContext } from './execution';
import { certifyAlgebraicConstantField } from './algebraic-constant-field';
import { certifyAlgebraicCurve, type AlgebraicCurveView } from './algebraic-curve';
import { integrateAlgebraic, verifyAlgebraicDecision, type AlgebraicDecision } from './algebraic-decision';
import { encodeAlgebraicDecision, decodeAlgebraicDecision } from './algebraic-decision-wire';
import { packAlgebraicArtifactData, unpackAlgebraicArtifactData } from './algebraic-artifact-keys';
import { verifyAlgebraicLogarithmicConstructionWithin } from './algebraic-logarithmic-construction';
import { replayRationalGcdEvidence, recordRationalGcdEvidence } from './rational-gcd-evidence';
import { splitAlgebraicResiduesWithin } from './algebraic-residue-splitting';
import { combineAlgebraicResiduesWithin } from './algebraic-residue-relations';
import { constructAlgebraicLogarithmsWithin } from './algebraic-logarithmic-construction';
import { constructAlgebraicExtension } from './algebraic-field';
import { AlgebraicDivisorWireContext } from './algebraic-divisor-wire-context';
import { algebraicConstantQuotientCodec, algebraicPrimitiveCodec } from './algebraic-primitive-wire';

describe('complete integration authority, requests and limits', () => {
  let b: ReturnType<typeof base>, curve: AlgebraicCurveView<ReturnType<typeof base>['x']>, input: ReturnType<typeof base>['x'], proof: AlgebraicDecision<typeof input>, data: {tag: string; version: number; payload: unknown};
  beforeAll(() => { b = base(); curve = certifyAlgebraicCurve(b.ctx, b.field, certifyAlgebraicConstantField(b.ctx, b.field, bounds), bounds); input = b.field.inverse(b.ctx, b.x); proof = integrateAlgebraic(fresh(), curve, input, bounds); data = encodeAlgebraicDecision(fresh(), curve, input, proof, bounds) as typeof data; }, 250000);
  it.each([
    ['rule', ['common', 'rule'], 'trusted'], ['conditions', ['common', 'conditions'], []],
    ['residue coverage', ['common', 'reduction', 'residues', 'entries'], []],
    ['rational rank', ['relations', 'evidence', 'basisIndices'], []], ['rational system', ['relations', 'evidence', 'system', 'matrix'], []],
    ['coordinates', ['relations', 'evidence', 'coordinates'], []], ['positive denominator', ['relations', 'evidence', 'denominator'], '-1'],
    ['combined divisors', ['relations', 'evidence', 'divisors'], []], ['splitting roots', ['relations', 'splitting', 'splitting', 'roots'], []],
    ['residue conversion', ['relations', 'splitting', 'indices'], []], ['logarithm coverage', ['logarithms', 'components'], []],
    ['principal multiple', ['logarithms', 'components', 0, 'torsion', 'order'], '0'],
    ['argument', ['logarithms', 'components', 0, 'common', 'argument'], null], ['logarithm weight', ['logarithms', 'components', 0, 'common', 'weight'], null],
    ['trace factors', ['primitive', 'terms'], []], ['independent traces', ['derivative', 'terms'], []],
    ['exactness coverage', ['exact', 'space', 'basis'], []], ['flag', ['verified'], true],
  ] as const)('rejects altered %s in fresh artifact replay', (_name, path, value) => {
    const body = structuredClone(unpackAlgebraicArtifactData(fresh(), data.payload, bounds)) as {evidence: Record<string | number, unknown>}; let node = body.evidence;
    for (const key of path.slice(0, -1)) { expect(node[key]).toBeDefined(); node = node[key] as typeof node; } node[path[path.length - 1]] = value;
    expect(() => decodeAlgebraicDecision(fresh(), curve, input, {...data, payload: packAlgebraicArtifactData(fresh(), body, bounds)}, bounds)).toThrow();
  }, 250000);
  it('rejects invented non-torsion flags without an actual checked obstruction', () => {
    if (proof.kind !== 'elementary' || proof.logarithms.kind !== 'complete') throw Error('positive fixture'); const logs = proof.logarithms, relations = proof.relations;
    const no = {...logs, kind: 'non-torsion' as const, obstruction: -1, later: 'unperformed' as const, components: Object.freeze([])};
    const ctx = fresh(); expect(() => ctx.operation(() => replayRationalGcdEvidence(ctx, proof.arithmetic!, () => verifyAlgebraicLogarithmicConstructionWithin(ctx, curve, relations, no, bounds)))).toThrow('verification-failed');
  });
  it('binds expected inputs, owners, constructions and canonical version', () => {
    expect(() => decodeAlgebraicDecision(fresh(), curve, b.x, data, bounds)).toThrow('domain-mismatch');
    expect(() => integrateAlgebraic(fresh(), curve, base().x, bounds)).toThrow('domain-mismatch');
    const other = base('z'), foreign = certifyAlgebraicCurve(other.ctx, other.field, certifyAlgebraicConstantField(other.ctx, other.field, bounds), bounds);
    expect(() => decodeAlgebraicDecision(fresh(), foreign, other.field.inverse(other.ctx, other.x), data, bounds)).toThrow();
    expect(() => decodeAlgebraicDecision(fresh(), curve, input, {...data, version: 2}, bounds)).toThrow('invalid-input');
    expect(() => decodeAlgebraicDecision(fresh(), curve, input, {...data, trusted: true}, bounds)).toThrow('invalid-input');
    expect(Object.isFrozen(proof)).toBe(true);
  });
  it('starts fresh proof scopes and keeps exhaustion sticky without a verdict', () => {
    const reused = fresh(); verifyAlgebraicDecision(reused, curve, input, proof, bounds); const first = reused.usage.work; verifyAlgebraicDecision(reused, curve, input, proof, bounds); expect(reused.usage.work).toBe(first * 2);
    for (const patch of [{work: 1}, {allocation: 1}]) for (const run of [c => integrateAlgebraic(c, curve, input, bounds), c => verifyAlgebraicDecision(c, curve, input, proof, bounds), c => encodeAlgebraicDecision(c, curve, input, proof, bounds), c => decodeAlgebraicDecision(c, curve, input, data, bounds)] as ((c: ExecutionContext) => unknown)[]) {
      const ctx = new ExecutionContext({...fresh().limits, ...patch}); expect(() => run(ctx)).toThrow('resource-limit'); expect(() => ctx.tick()).toThrow('resource-limit');
    }
    for (const patch of [{artifactDepth: 1}, {artifactNodes: 1}, {artifactBytes: 1}]) expect(() => decodeAlgebraicDecision(fresh(), curve, input, data, {...bounds, ...patch})).toThrow('resource-limit');
  }, 250000);
  it('charges every new subsidiary stage to its enclosing cumulative context', () => {
    if (proof.kind !== 'elementary' || proof.reduction.kind !== 'simple-poles') throw Error('positive fixture');
    const reduction = proof.reduction, relations = proof.relations, split = relations.splitting;
    const operations = [c => splitAlgebraicResiduesWithin(c, curve, reduction.remainder, reduction.residues, bounds), c => combineAlgebraicResiduesWithin(c, split, bounds), c => constructAlgebraicLogarithmsWithin(c, curve, relations, bounds)] as ((c: ExecutionContext) => unknown)[];
    for (const run of operations) { const ctx = new ExecutionContext({...fresh().limits, work: 1}); expect(() => ctx.operation(() => run(ctx))).toThrow('resource-limit'); expect(() => ctx.tick()).toThrow('resource-limit'); }
  });
  it('keeps exact expected owners binding on shared codec cache hits', () => {
    if (proof.kind !== 'elementary') throw Error('positive fixture'); const p = proof.primitive, q = p.terms[0].quotient, C = q.relative.target, other = constructAlgebraicExtension(b.ctx, C.ring, C.construction.relation, bounds);
    const ctx = fresh(); ctx.operation(() => recordRationalGcdEvidence(ctx, () => {
      const s = new AlgebraicDivisorWireContext(ctx, bounds), codec = algebraicConstantQuotientCodec(s, curve, C), raw = codec.encode(q); codec.decode(raw);
      expect(() => algebraicConstantQuotientCodec(s, curve, other).encode(q)).toThrow('domain-mismatch'); expect(() => algebraicConstantQuotientCodec(s, curve, other).decode(raw)).toThrow('domain-mismatch');
      algebraicPrimitiveCodec(s, curve, C).encode(p); expect(() => algebraicPrimitiveCodec(s, curve, other).encode(p)).toThrow('domain-mismatch');
    }, proof.arithmetic));
  }, 250000);
});
