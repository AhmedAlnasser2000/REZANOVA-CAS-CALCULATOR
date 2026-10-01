// The neighbouring doubles of a number, for outward-rounded interval
// arithmetic: the graph evaluator's interval backend and PTX's proofs share
// them. IEEE + − × ÷ and √ are correctly rounded, so stepping one double
// outward after each makes a computed bound safe.

const buffer = new Float64Array(1);
const words = new Uint32Array(buffer.buffer);
const LOW = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1 ? 0 : 1;
const HIGH = 1 - LOW;

/** The next double above x. */
export function nextUp(x: number) {
  if (Number.isNaN(x) || x === Infinity) return x;
  if (x === 0) return Number.MIN_VALUE;
  buffer[0] = x;
  if (x > 0) { words[LOW] = (words[LOW]! + 1) >>> 0; if (words[LOW] === 0) words[HIGH] = (words[HIGH]! + 1) >>> 0; }
  else { if (words[LOW] === 0) words[HIGH] = (words[HIGH]! - 1) >>> 0; words[LOW] = (words[LOW]! - 1) >>> 0; }
  return buffer[0];
}

/** The next double below x. */
export function nextDown(x: number) { return -nextUp(-x); }

/** A closed interval [lo, hi] for proofs. */
export type RoundedInterval = { lo: number; hi: number };

export const roundedPoint = (value: number): RoundedInterval => ({ lo: value, hi: value });

export function roundedAdd(a: RoundedInterval, b: RoundedInterval): RoundedInterval {
  const lo = a.lo + b.lo; const hi = a.hi + b.hi;
  return { lo: Number.isNaN(lo) ? -Infinity : nextDown(lo), hi: Number.isNaN(hi) ? Infinity : nextUp(hi) };
}

export function roundedSubtract(a: RoundedInterval, b: RoundedInterval): RoundedInterval {
  return roundedAdd(a, { lo: -b.hi, hi: -b.lo });
}

export function roundedMultiply(a: RoundedInterval, b: RoundedInterval): RoundedInterval {
  const product = (p: number, q: number) => (p === 0 || q === 0 ? 0 : p * q);
  const values = [product(a.lo, b.lo), product(a.lo, b.hi), product(a.hi, b.lo), product(a.hi, b.hi)];
  return { lo: nextDown(Math.min(...values)), hi: nextUp(Math.max(...values)) };
}
