import { demand, type ExecutionContext } from '../execution';
import { rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { compareReal, type RealRootOf } from '../algebraic/root-of';
import { enclose, minusInverseE } from './enclosure';
import { angleLinearIsZero } from './angles';
import { algebraicLogIsZero } from './log-zero';
import { asRoot, evaluateExact, type ExactValue } from './evaluate';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Exact signs and order of real number-only expressions.
 *
 * Exact evaluation decides algebraic values. Otherwise certified enclosures are
 * refined (precision doubling) until 0 is excluded, which terminates for every
 * nonzero value and runs only under the budget. Callers must ask only about
 * values that are provably nonzero by structure or by transcendence theorems
 * (Lindemann–Weierstrass, Gelfond–Schneider, Baker); a zero that is not
 * recognized exactly would refine until the typed `resource` stop.
 */
export const START_BITS = 32;

export function exactSign(ctx: ExecutionContext, v: ExactValue): -1 | 0 | 1 {
  if (v.kind === 'rational') return v.value.numerator === 0n ? 0 : v.value.numerator < 0n ? -1 : 1;
  demand(v.root.kind === 'real', 'invalid-input', 'sign of a non-real value');
  return compareReal(ctx, v.root, asRoot(ctx, { kind: 'rational', value: rational(ctx, 0n) }) as RealRootOf) as -1 | 1;
}

export function realSign(store: ExpressionStore, id: ExprId): -1 | 0 | 1 {
  const ctx = store.ctx;
  const e = evaluateExact(store, id, 'real');
  if (e.kind === 'exact') return exactSign(ctx, e.value);
  demand(e.kind === 'not-exact' && e.reason !== 'free-symbol', 'invalid-input', `sign of an undefined or symbolic value: ${'detail' in e ? e.detail : ''}`);
  // Exact zeros that exact evaluation cannot see (π-multiples and arcs of algebraic numbers) are recognized
  // before refining, unless a first enclosure already excludes 0.
  let tested = false;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    if (bits > START_BITS && !tested) {
      tested = true;
      if (angleLinearIsZero(store, id) === true || algebraicLogIsZero(store, id) === true) return 0;
    }
    const b = enclose(store, id, bits);
    if (b.kind === 'bounds') {
      if (b.lo.numerator > 0n) return 1;
      if (b.hi.numerator < 0n) return -1;
      continue;
    }
    if (b.kind === 'unknown') continue;
    return demand(false, 'invalid-input', `cannot enclose: ${b.detail}`) as never;
  }
}

export function realCompare(store: ExpressionStore, a: ExprId, b: ExprId): -1 | 0 | 1 {
  return a === b ? 0 : realSign(store, store.sub(a, b));
}

/** Position of a real value relative to −1/e (never equal for algebraic values, by Lindemann–Weierstrass). */
export function compareWithMinusInverseE(store: ExpressionStore, id: ExprId): -1 | 1 {
  const ctx = store.ctx;
  for (let bits = START_BITS; ; bits *= 2) {
    ctx.tick();
    const b = enclose(store, id, bits), t = minusInverseE(ctx, bits);
    if (b.kind === 'bounds') {
      if (compareRational(ctx, b.hi, t.lo) < 0) return -1;
      if (compareRational(ctx, t.hi, b.lo) < 0) return 1;
      continue;
    }
    if (b.kind === 'unknown') continue;
    return demand(false, 'invalid-input', `cannot enclose: ${b.detail}`) as never;
  }
}
