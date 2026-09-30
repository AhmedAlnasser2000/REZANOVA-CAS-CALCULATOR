import { ptxGrowsToward, ptxRealDiscontinuities, type PtxFinderOptions } from './features';
import type { PtxRealFunction, PtxSolverPort } from './solver-port';
import type { PtxLevel } from './types';

// Asymptotes of y = f(x): vertical where |f| blows up (poles, and domain edges
// such as ln x at 0, from the defined side), horizontal and oblique from the
// end behaviour as x → ±∞. Rational functions get exact lines; everything else
// is numeric, taken from values that settle at large |x|.

/** Which ends a line belongs to: −1 is x → −∞ (or the left of a pole), 1 is x → +∞ (or its right). */
export type PtxSides = Array<-1 | 1>;

export type PtxAsymptote =
  | { kind: 'vertical'; x: number; sides: PtxSides; level: PtxLevel }
  | { kind: 'horizontal'; y: number; sides: PtxSides; level: PtxLevel }
  | { kind: 'oblique'; slope: number; intercept: number; sides: PtxSides; level: PtxLevel };

const FAR = [1e2, 1e3, 1e4, 1e5, 1e6, 1e7];

/** The value a sequence settles to, when its steps keep shrinking and the last is tiny. */
function settle(values: Array<number | undefined>) {
  if (values.some((value) => value === undefined || !Number.isFinite(value))) return undefined;
  const list = values as number[];
  const last = list.at(-1)!; const change = Math.abs(last - list.at(-2)!);
  const earlier = Math.abs(list.at(-2)! - list.at(-3)!);
  return change <= 1e-5 * Math.max(1, Math.abs(last)) && change <= earlier + 1e-15 ? { value: last, error: Math.max(change, 1e-12) } : undefined;
}

/** Keeps only the decimals the last settling step supports, so a limit of 1 reads as y = 1, not 1.000000042. */
function tidy(limit: { value: number; error: number }) {
  const decimals = Math.max(0, Math.min(12, Math.floor(-Math.log10(10 * limit.error))));
  const rounded = Number(limit.value.toFixed(decimals));
  return Math.abs(rounded) < 10 ** -decimals ? 0 : rounded;
}

function endBehaviour(f: PtxRealFunction, side: -1 | 1): PtxAsymptote | null {
  const xs = FAR.map((distance) => side * distance);
  const horizontal = settle(xs.map((x) => f(x)));
  if (horizontal !== undefined) return { kind: 'horizontal', y: tidy(horizontal), sides: [side], level: 'numeric-validated' };
  const slopeLimit = settle(xs.map((x) => { const value = f(x); return value === undefined ? undefined : value / x; }));
  if (slopeLimit === undefined || Math.abs(slopeLimit.value) < 1e-6) return null;
  const slope = tidy(slopeLimit);
  const intercept = settle(xs.map((x) => { const value = f(x); return value === undefined ? undefined : value - slope * x; }));
  return intercept === undefined ? null
    : { kind: 'oblique', slope, intercept: tidy(intercept), sides: [side], level: 'numeric-validated' };
}

function sameLine(a: PtxAsymptote, b: PtxAsymptote) {
  if (a.kind === 'horizontal' && b.kind === 'horizontal') return Math.abs(a.y - b.y) <= 1e-9 * Math.max(1, Math.abs(a.y));
  if (a.kind === 'oblique' && b.kind === 'oblique') return Math.abs(a.slope - b.slope) <= 1e-9 && Math.abs(a.intercept - b.intercept) <= 1e-9 * Math.max(1, Math.abs(a.intercept));
  return false;
}

export function ptxAsymptotes(f: PtxRealFunction, mathJson: unknown, variable: string, minimum: number, maximum: number,
  port: PtxSolverPort, parameters: Readonly<Record<string, number>>, options: PtxFinderOptions = {}): PtxAsymptote[] {
  const rational = port.rationalEndBehaviour(mathJson, variable, parameters);
  const found: PtxAsymptote[] = [];
  const span = maximum - minimum;
  for (const item of ptxRealDiscontinuities(f, mathJson, variable, minimum, maximum, port, parameters, options)) {
    if (item.kind === 'pole') found.push({ kind: 'vertical', x: item.x, sides: item.sides, level: rational ? 'exact-proved' : 'numeric-validated' });
  }
  // Domain edges (ln x at 0): f exists on one side only and blows up toward the edge.
  const steps = options.steps ?? 400;
  let previousX = minimum; let previous = f(minimum);
  for (let index = 1; index <= steps; index += 1) {
    const x = minimum + span * index / steps; const value = f(x);
    if ((previous === undefined) !== (value === undefined)) {
      let low = previousX; let high = x; const lowDefined = previous !== undefined;
      for (let pass = 0; pass < 60; pass += 1) { const middle = (low + high) / 2; if ((f(middle) !== undefined) === lowDefined) low = middle; else high = middle; }
      const edge = Math.abs(low) < 1e-12 * span ? 0 : Number(((low + high) / 2).toPrecision(12));
      const side: -1 | 1 = lowDefined ? -1 : 1;
      if (ptxGrowsToward(f, edge, side, span) && !found.some((line) => line.kind === 'vertical' && Math.abs(line.x - edge) < 1e-9 * (1 + Math.abs(edge)))) {
        found.push({ kind: 'vertical', x: edge, sides: [side], level: 'numeric-validated' });
      }
    }
    previousX = x; previous = value;
  }
  if (rational) {
    if (rational.kind === 'horizontal') found.push({ kind: 'horizontal', y: rational.y, sides: [-1, 1], level: 'exact-proved' });
    if (rational.kind === 'oblique') found.push({ kind: 'oblique', slope: rational.slope, intercept: rational.intercept, sides: [-1, 1], level: 'exact-proved' });
    return found;
  }
  const left = endBehaviour(f, -1); const right = endBehaviour(f, 1);
  if (left && right && sameLine(left, right)) found.push({ ...left, sides: [-1, 1] });
  else for (const end of [left, right]) if (end) found.push(end);
  return found;
}

/** "x = 1", "y = 2", "y = 2x − 1": the line's equation for labels. */
export function ptxAsymptoteLabel(asymptote: PtxAsymptote, format: (value: number) => string) {
  if (asymptote.kind === 'vertical') return `x = ${format(asymptote.x)}`;
  if (asymptote.kind === 'horizontal') return `y = ${format(asymptote.y)}`;
  const slope = asymptote.slope === 1 ? '' : asymptote.slope === -1 ? '−' : format(asymptote.slope);
  const intercept = asymptote.intercept === 0 ? '' : ` ${asymptote.intercept < 0 ? '−' : '+'} ${format(Math.abs(asymptote.intercept))}`;
  return `y = ${slope}x${intercept}`;
}
