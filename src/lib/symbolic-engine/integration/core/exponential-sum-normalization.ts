import { demand, type ExecutionContext } from './execution';
import { assertDifferentialFieldOwner, type DifferentialField, type DifferentialElement as E } from './differential-field';
import { requireRationalVariable, scalarValue } from './differential-admission';
import type { ExponentialSumInput, ExponentialSumNormalization } from './exponential-sum-types';

export function checkSumInput(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput): void {
  assertDifferentialFieldOwner(ctx, owner); requireRationalVariable(ctx, owner);
  demand(input !== null && typeof input === 'object' && Array.isArray(input.terms), 'invalid-input', 'sum input');
  owner.assert(ctx, input.rationalPart); ctx.tick(input.terms.length);
  for (const term of input.terms) {
    demand(term !== null && typeof term === 'object', 'invalid-input', 'sum input term');
    owner.assert(ctx, term.coefficient); owner.assert(ctx, term.argument);
  }
}
export function copySumInput(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput): ExponentialSumInput {
  checkSumInput(ctx, owner, input); ctx.allocate(2 + 3 * input.terms.length);
  return Object.freeze({ rationalPart: input.rationalPart,
    terms: Object.freeze(input.terms.map(t => Object.freeze({ coefficient: t.coefficient, argument: t.argument }))) });
}
export function normalizeSum(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput): ExponentialSumNormalization {
  checkSumInput(ctx, owner, input);
  const groups: { argument: E; coefficient: E; indices: number[] }[] = []; ctx.allocate(2);
  for (let i = 0; i < input.terms.length; i++) {
    ctx.tick(); const term = input.terms[i]; let group: typeof groups[number] | undefined;
    for (const g of groups) { ctx.tick(); if (owner.equal(ctx, term.argument, g.argument)) { group = g; break; } }
    if (group) { group.coefficient = owner.add(ctx, group.coefficient, term.coefficient); ctx.allocate(1); group.indices.push(i); }
    else { ctx.allocate(5); groups.push({ argument: term.argument, coefficient: term.coefficient, indices: [i] }); }
  }
  let rationalPart = input.rationalPart;
  for (const g of groups) { ctx.tick(); if (owner.isZero(ctx, g.argument)) rationalPart = owner.add(ctx, rationalPart, g.coefficient); }
  ctx.allocate(groups.length);
  const result = Object.freeze({ groups: Object.freeze(groups.map(g => Object.freeze({ ...g, indices: Object.freeze(g.indices) }))), rationalPart });
  verifySumNormalization(ctx, owner, input, result); return result;
}
/** Replay the partition and sums, not the producer's grouping search. */
export function verifySumNormalization(ctx: ExecutionContext, owner: DifferentialField, input: ExponentialSumInput, evidence: ExponentialSumNormalization): readonly number[] {
  checkSumInput(ctx, owner, input);
  demand(Array.isArray(evidence.groups) && evidence.groups.length <= input.terms.length, 'verification-failed', 'sum group count');
  ctx.allocate(input.terms.length + evidence.groups.length);
  const seen = new Uint8Array(input.terms.length), active: number[] = []; let rational = input.rationalPart, first = -1;
  for (let g = 0; g < evidence.groups.length; g++) {
    ctx.tick(); const group = evidence.groups[g]; owner.assert(ctx, group.argument); owner.assert(ctx, group.coefficient);
    demand(Array.isArray(group.indices) && group.indices.length > 0 && group.indices.length <= input.terms.length,
      'verification-failed', 'sum group indices');
    demand(group.indices[0] > first, 'verification-failed', 'sum group order'); first = group.indices[0];
    for (let j = 0; j < g; j++) { ctx.tick(); demand(!owner.equal(ctx, group.argument, evidence.groups[j].argument), 'verification-failed', 'duplicate sum group'); }
    let coefficient = owner.fromInteger(ctx, 0n), previous = -1;
    for (const i of group.indices) {
      ctx.tick(); demand(Number.isSafeInteger(i) && i > previous && i < input.terms.length && !seen[i], 'verification-failed', 'sum input coverage');
      previous = i; seen[i] = 1;
      demand(owner.equal(ctx, input.terms[i].argument, group.argument), 'verification-failed', 'sum group argument');
      coefficient = owner.add(ctx, coefficient, input.terms[i].coefficient);
    }
    demand(owner.equal(ctx, coefficient, group.coefficient), 'verification-failed', 'sum group coefficient');
    if (owner.isZero(ctx, group.argument)) rational = owner.add(ctx, rational, coefficient);
    else if (!owner.isZero(ctx, coefficient)) active.push(g);
  }
  for (const v of seen) { ctx.tick(); demand(v === 1, 'verification-failed', 'missing sum input'); }
  demand(owner.equal(ctx, rational, evidence.rationalPart), 'verification-failed', 'sum rational normalization');
  return Object.freeze(active);
}
export function sumUnsupported(ctx: ExecutionContext, owner: DifferentialField, normalization: ExponentialSumNormalization,
  active: readonly number[]): 'constant-exponent' | undefined {
  for (const i of active) { ctx.tick(); if (scalarValue(ctx, owner, normalization.groups[i].argument)) return 'constant-exponent'; }
  return undefined;
}
