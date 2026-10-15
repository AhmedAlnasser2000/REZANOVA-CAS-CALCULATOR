/** Only the identical polynomial identity/branch layout is shared here. */
import type {ExecutionContext} from './execution';
import type {CantorPair, CantorAddition, CantorReduction, CantorMultiple, CantorBezout} from './cantor-arithmetic';
import * as w from './decision-wire-algebra';

export function cantorArithmeticEvidenceCodecs<P>(ctx: ExecutionContext, polynomial: w.EvidenceCodec<P>, integer: w.EvidenceCodec<bigint>,
  memo: <T>(name: string, codec: w.EvidenceCodec<T>) => w.EvidenceCodec<T> = (_name, codec) => codec) {
  const pair: w.EvidenceCodec<CantorPair<P>> = memo('cantor-pair', w.structure(ctx, {u: polynomial, v: polynomial, normQuotient: polynomial}));
  const bezout: w.EvidenceCodec<CantorBezout<P>> = w.structure(ctx, {gcd: polynomial, s: polynomial, t: polynomial});
  const reduction: w.EvidenceCodec<CantorReduction<P>> = w.structure(ctx, {input: pair, result: pair});
  const addition: w.EvidenceCodec<CantorAddition<P>> = memo('cantor-addition', w.structure(ctx, {
    composition: w.structure(ctx, {left: pair, right: pair, common: bezout, opposite: bezout,
      leftQuotient: polynomial, rightQuotient: polynomial, result: pair}), reductions: w.list(ctx, reduction), result: pair}));
  const multiple: w.EvidenceCodec<CantorMultiple<P>> = memo('cantor-multiple', w.structure(ctx, {input: pair, coefficient: integer, base: pair,
    steps: w.list(ctx, w.structure(ctx, {double: addition, add: w.optional(addition)})), result: pair}));
  return {pair, reduction, addition, multiple};
}
