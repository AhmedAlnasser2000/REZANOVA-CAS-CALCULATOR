import type { PtxRealFunction } from './solver-port';

// Every zero of a real function in [lo, hi], isolated with interval arithmetic
// (GRAPHING-PIECEWISE2). The interval is split until each piece is decided:
// its guaranteed range excludes 0 (no zero there), or the function is
// continuous and monotone on it with opposite signs at its ends (exactly one
// zero, then narrowed by bisection), or it is identically 0. Pieces where the
// function jumps or stops being defined are narrowed to their discontinuity.
// What is left undecided when the budget runs out is counted, never guessed:
// a caller that sees `undecided > 0` knows the list may be incomplete.

export type PtxIsolatedZero = {
  /** A bracket [lo, hi] holding the zero, a few ulps wide when proved. */
  lo: number;
  hi: number;
  x: number;
  /** Proved to be the only zero in its bracket; false for a touching zero (g ≥ 0 meeting 0), located but not proved. */
  proved: boolean;
};

export type PtxIsolation = {
  zeros: PtxIsolatedZero[];
  /** Ranges where the function is identically 0. */
  zeroRanges: Array<{ lo: number; hi: number }>;
  /** Points where the function jumps or its domain starts or ends. */
  discontinuities: number[];
  /** Pieces still undecided when the budget ran out (0 means the lists are complete). */
  undecided: number;
  evaluations: number;
};

const ZERO_WIDTH = 64 * Number.MIN_VALUE;
const finite = (value: { lo: number; hi: number }) => Number.isFinite(value.lo) && Number.isFinite(value.hi);

/** Discontinuities are found to the last bits of a double; their true place is usually short (3 for floor), so snap to 12 digits. */
function snap(at: number, span: number) {
  return Math.abs(at) < 1e-12 * span ? 0 : Number(at.toPrecision(12));
}

function tiny(lo: number, hi: number, span: number) {
  const middle = (lo + hi) / 2;
  return middle <= lo || middle >= hi || hi - lo <= Math.max(1e-13 * span, 8 * Number.EPSILON * Math.max(1, Math.abs(middle)));
}

/** A sign change on a continuous, monotone piece: narrowed by bisection on point values. */
function narrow(f: PtxRealFunction, lo: number, hi: number, lowSign: number) {
  for (let pass = 0; pass < 120; pass += 1) {
    const middle = (lo + hi) / 2;
    if (middle <= lo || middle >= hi) break;
    const value = f(middle);
    if (value === undefined) break;
    if (value === 0) return { lo: middle, hi: middle };
    if (Math.sign(value) === lowSign) lo = middle; else hi = middle;
  }
  return { lo, hi };
}

export function ptxIsolateRealZeros(f: PtxRealFunction, lo: number, hi: number, options: { budget?: number; isCancelled?: () => boolean } = {}): PtxIsolation | null {
  const enclose = f.enclose;
  if (!enclose || !(hi > lo)) return null;
  const span = hi - lo;
  const budget = options.budget ?? 4000;
  const result: PtxIsolation = { zeros: [], zeroRanges: [], discontinuities: [], undecided: 0, evaluations: 0 };
  // Depth-first from the left, so everything comes out in order.
  const stack: Array<[number, number]> = [[lo, hi]];
  const touching: Array<{ lo: number; hi: number }> = [];
  while (stack.length) {
    if (result.evaluations >= budget || options.isCancelled?.()) { result.undecided += stack.length; break; }
    const [a, b] = stack.pop()!;
    const { value, slope } = enclose(a, b); result.evaluations += 1;
    if (value.defined === 0) continue;
    const regular = value.defined === 2 && value.continuous && finite(value);
    if (regular && (value.lo > 0 || value.hi < 0)) continue;
    // Identically 0 (outward rounding widens an exact 0 by a few subnormals at most).
    if (regular && -value.lo <= ZERO_WIDTH && value.hi <= ZERO_WIDTH) {
      const last = result.zeroRanges.at(-1);
      if (last && last.hi >= a) last.hi = b; else result.zeroRanges.push({ lo: a, hi: b });
      continue;
    }
    if (regular && value.smooth && slope.defined === 2 && finite(slope) && (slope.lo > 0 || slope.hi < 0)) {
      // Monotone: the end values decide (enclosures at single points are a few ulps wide).
      const left = enclose(a, a).value; const right = enclose(b, b).value; result.evaluations += 2;
      if (left.defined === 2 && right.defined === 2) {
        const leftSign = left.lo > 0 ? 1 : left.hi < 0 ? -1 : 0;
        const rightSign = right.lo > 0 ? 1 : right.hi < 0 ? -1 : 0;
        if (leftSign !== 0 && leftSign === rightSign) continue;
        if (leftSign !== 0 && rightSign !== 0) {
          const bracket = narrow(f, a, b, leftSign);
          result.zeros.push({ ...bracket, x: (bracket.lo + bracket.hi) / 2, proved: true });
          continue;
        }
      }
    }
    if (tiny(a, b, span)) {
      if (!regular) {
        const at = snap((a + b) / 2, span);
        if (result.discontinuities.at(-1) !== at) result.discontinuities.push(at);
      } else {
        // A zero the range cannot separate (a double zero such as (x − 1)²): kept as a located, unproved zero.
        const last = touching.at(-1);
        if (last && last.hi >= a) last.hi = b; else touching.push({ lo: a, hi: b });
      }
      continue;
    }
    const middle = (a + b) / 2;
    stack.push([middle, b], [a, middle]);
  }
  for (const cluster of touching) {
    const x = (cluster.lo + cluster.hi) / 2;
    const at = f(x);
    // Only where the function really reaches (about) 0: a range that merely cannot exclude 0 is not a zero.
    if (at !== undefined && Math.abs(at) <= 1e-9) result.zeros.push({ lo: cluster.lo, hi: cluster.hi, x, proved: false });
    else if (at === undefined) result.undecided += 1;
  }
  result.zeros.sort((left, right) => left.x - right.x);
  return result;
}
