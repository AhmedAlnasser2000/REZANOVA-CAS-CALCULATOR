/** Identical arithmetic proof layouts only; domains retain separate authority. */
import type {ExecutionContext} from './execution';
import type {CantorPair, CantorComposition} from './cantor-arithmetic';
import type {BalancedDivisor, BalancedFlip, BalancedNormalization, BalancedAddition, BalancedInverse, BalancedMultiple} from './balanced-cantor-arithmetic';
import * as w from './decision-wire-algebra';

export function balancedArithmeticEvidenceCodecs<P>(ctx: ExecutionContext, p: w.EvidenceCodec<P>, integer: w.EvidenceCodec<bigint>,
  memo: <T>(name: string, codec: w.EvidenceCodec<T>) => w.EvidenceCodec<T> = (_name, codec) => codec) {
  const pair: w.EvidenceCodec<CantorPair<P>> = memo('balanced-pair', w.structure(ctx, {u: p, v: p, normQuotient: p}));
  const divisor: w.EvidenceCodec<BalancedDivisor<P>> = memo('balanced-divisor', w.structure(ctx, {pair, n: integer}));
  const flip: w.EvidenceCodec<BalancedFlip<P>> = w.structure(ctx, {method: w.literal(ctx, 'ordinary', 'plus', 'minus'), input: pair,
    interpolation: p, normQuotient: p, result: pair, plus: integer, minus: integer});
  const normalization: w.EvidenceCodec<BalancedNormalization<P>> = memo('balanced-normalization', w.structure(ctx, {input: pair, n: integer,
    ordinary: w.list(ctx, flip), infinity: w.list(ctx, flip), result: divisor}));
  const bezout = w.structure(ctx, {gcd: p, s: p, t: p});
  const composition: w.EvidenceCodec<CantorComposition<P>> = w.structure(ctx, {left: pair, right: pair, common: bezout, opposite: bezout, leftQuotient: p, rightQuotient: p, result: pair});
  const addition: w.EvidenceCodec<BalancedAddition<P>> = memo('balanced-addition', w.structure(ctx, {composition, normalization, result: divisor}));
  const inverse: w.EvidenceCodec<BalancedInverse<P>> = w.structure(ctx, {input: divisor, normalization, result: divisor});
  const multiple: w.EvidenceCodec<BalancedMultiple<P>> = memo('balanced-multiple', w.structure(ctx, {input: divisor, coefficient: integer, inverse: w.optional(inverse),
    steps: w.list(ctx, w.structure(ctx, {double: addition, add: w.optional(addition)})), result: divisor}));
  return {pair, divisor, normalization, addition, inverse, multiple};
}
