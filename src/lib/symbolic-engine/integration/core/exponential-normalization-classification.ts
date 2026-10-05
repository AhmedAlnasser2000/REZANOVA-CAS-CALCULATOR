import { demand, type ExecutionContext } from './execution';
import type { DifferentialField, DifferentialElement as E } from './differential-field';
import { scalarValue } from './differential-admission';
import { integerGcd, rational, type Rational } from './rational';
import type { ExponentialClassification, ExponentialFraction, ExponentialPowerTerm } from './exponential-normalization-types';

/** Shift both supports by one denominator monomial; this removes irrelevant Laurent units. */
export function classifyExponentialFraction(ctx: ExecutionContext, owner: DifferentialField, basis: readonly E[], f: ExponentialFraction): ExponentialClassification {
  const ring = f.numerator.ring; ring.assert(ctx, f.numerator); ring.assert(ctx, f.denominator);
  demand(f.denominator.terms.length > 0 && ring.arity === basis.length, 'verification-failed', 'classification denominator');
  if (ring.isZero(ctx, f.numerator)) return Object.freeze({kind: 'rational', value: owner.fromInteger(ctx, 0n)});
  const anchor = f.denominator.terms[0].powers;
  ctx.allocate(f.numerator.terms.length + f.denominator.terms.length + 5);
  const terms = [...f.numerator.terms, ...f.denominator.terms];
  const arguments_: E[] = [];
  for (const term of terms) {
    let argument = owner.fromInteger(ctx, 0n);
    for (let i = 0; i < basis.length; i++) {
      ctx.tick(); const n = BigInt(term.powers[i]) - BigInt(anchor[i]); ctx.integer(n);
      argument = owner.add(ctx, argument, owner.multiply(ctx, basis[i], owner.fromInteger(ctx, n)));
    }
    arguments_.push(argument);
  }
  const first = arguments_.find(a => !owner.isZero(ctx, a));
  if (!first) return Object.freeze({kind: 'rational', value: owner.exactDivide(ctx,
    f.numerator.terms[0].coefficient, f.denominator.terms[0].coefficient)});
  if (scalarValue(ctx, owner, first)) return Object.freeze({kind: 'unsupported', reason: 'constant-extension'});
  const ratios: Rational[] = []; let lcm = 1n;
  for (const a of arguments_) {
    const ratio = scalarValue(ctx, owner, owner.exactDivide(ctx, a, first));
    if (!ratio) return Object.freeze({kind: 'unsupported', reason: 'independent-families'});
    ratios.push(ratio); lcm = ctx.multiply(ctx.quotient(lcm, integerGcd(ctx, lcm, ratio.denominator)), ratio.denominator);
  }
  ctx.allocate(ratios.length * 3 + 4);
  let powers = ratios.map(r => ctx.multiply(r.numerator, ctx.quotient(lcm, r.denominator)));
  let gcd = 0n; for (const n of powers) gcd = integerGcd(ctx, gcd, n);
  let argument = owner.multiply(ctx, first, owner.embed(ctx, owner.parent!.scalar(ctx, rational(ctx, gcd, lcm))));
  demand(argument.kind === 'fraction', 'domain-mismatch', 'classification rational argument');
  const lead = scalarValue(ctx, owner.parent!, argument.value.numerator.coefficients.at(-1)!)!;
  const sign = lead.numerator < 0n ? -1n : 1n;
  if (sign < 0n) argument = owner.negate(ctx, argument);
  powers = powers.map(n => ctx.multiply(sign, ctx.quotient(n, gcd)));
  const output = (start: number, end: number): readonly ExponentialPowerTerm[] => {
    ctx.allocate((end - start) * 2);
    const out = terms.slice(start, end).map((t, i) => Object.freeze({power: powers[start + i], coefficient: t.coefficient}));
    out.sort((a, b) => { ctx.tick(); return a.power < b.power ? -1 : a.power > b.power ? 1 : 0; });
    return Object.freeze(out);
  };
  return Object.freeze({kind: 'exponential', argument, numerator: output(0, f.numerator.terms.length), denominator: output(f.numerator.terms.length, terms.length)});
}
export function verifyExponentialClassification(ctx: ExecutionContext, owner: DifferentialField, expected: ExponentialClassification, given: ExponentialClassification): void {
  demand(given !== null && typeof given === 'object' && given.kind === expected.kind, 'verification-failed', 'normalization classification');
  if (expected.kind === 'rational' && given.kind === 'rational') {
    demand(owner.equal(ctx, expected.value, given.value), 'verification-failed', 'rational classification'); return;
  }
  if (expected.kind === 'unsupported' && given.kind === 'unsupported') {
    demand(expected.reason === given.reason, 'verification-failed', 'unsupported classification'); return;
  }
  demand(expected.kind === 'exponential' && given.kind === 'exponential', 'verification-failed', 'exponential classification');
  demand(owner.equal(ctx, expected.argument, given.argument), 'verification-failed', 'classification original exponent');
  for (const side of ['numerator', 'denominator'] as const) {
    demand(Array.isArray(given[side]) && expected[side].length === given[side].length, 'verification-failed', 'classification support coverage');
    for (let i = 0; i < expected[side].length; i++) {
      ctx.tick(); ctx.integer(given[side][i].power);
      demand(given[side][i].power === expected[side][i].power && owner.equal(ctx, given[side][i].coefficient, expected[side][i].coefficient),
        'verification-failed', 'classification coefficient');
    }
  }
}
