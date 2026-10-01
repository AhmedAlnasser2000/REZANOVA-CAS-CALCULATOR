import type { PtxComplexFunction, PtxSolverPort } from './solver-port';

// Counting zeros and poles of a meromorphic z-map (PTX-ENGINE1, gate E8).
// The argument principle: as z goes once round a box's edge, f(z) winds
// round 0 exactly (zeros − poles inside) times. Each piece of the edge is
// accepted only when a guaranteed enclosure of f over it excludes 0, so f
// turns by less than half a turn along it and adding up the turns cannot
// miscount. A box on which f is bounded holds no pole, so its winding is its
// number of zeros; one on which 1/f is bounded holds no zero.

export type PtxComplexBox = { reMin: number; reMax: number; imMin: number; imMax: number };
type Enclose = NonNullable<ReturnType<NonNullable<PtxSolverPort['complexEnclosure']>>>;

const excludesZero = (rectangle: { re: { lo: number; hi: number }; im: { lo: number; hi: number } }) =>
  rectangle.re.lo > 0 || rectangle.re.hi < 0 || rectangle.im.lo > 0 || rectangle.im.hi < 0;

/**
 * 1/f written so its enclosure stays finite where f has a pole: b/a for a/b,
 * cot for tan, cos for sec, a⁻ⁿ for aⁿ, products term by term.
 */
export function ptxReciprocalExpression(node: unknown): unknown {
  if (!Array.isArray(node)) return ['Divide', 1, node];
  const [head, ...rest] = node as [string, ...unknown[]];
  if ((head === 'Divide' || head === 'Rational') && rest.length === 2) return ['Divide', rest[1], rest[0]];
  if (head === 'Power' && rest.length === 2 && typeof rest[1] === 'number' && Number.isInteger(rest[1])) return ['Power', rest[0], -rest[1]];
  if (head === 'Multiply') return ['Multiply', ...rest.map(ptxReciprocalExpression)];
  const swap: Record<string, string> = { Tan: 'Cot', Cot: 'Tan', Sec: 'Cos', Csc: 'Sin', Cos: 'Sec', Sin: 'Csc' };
  if (swap[head] && rest.length === 1) return [swap[head], rest[0]];
  return ['Divide', 1, node];
}

/** The winding number of f round the box's edge, or null when f may vanish on (or too near) it. */
export function ptxWindingNumber(f: PtxComplexFunction, enclose: Enclose, box: PtxComplexBox, budget = { segments: 4000 }): number | null {
  const corners = [
    { re: box.reMin, im: box.imMin }, { re: box.reMax, im: box.imMin },
    { re: box.reMax, im: box.imMax }, { re: box.reMin, im: box.imMax },
  ];
  const size = Math.max(box.reMax - box.reMin, box.imMax - box.imMin);
  let turn = 0;
  for (let side = 0; side < 4; side += 1) {
    const from = corners[side]!; const to = corners[(side + 1) % 4]!;
    const stack: Array<[number, number]> = [[0, 1]];
    while (stack.length) {
      const [s0, s1] = stack.pop()!;
      const a = { re: from.re + (to.re - from.re) * s0, im: from.im + (to.im - from.im) * s0 };
      const b = { re: from.re + (to.re - from.re) * s1, im: from.im + (to.im - from.im) * s1 };
      const piece = enclose({ reMin: Math.min(a.re, b.re), reMax: Math.max(a.re, b.re), imMin: Math.min(a.im, b.im), imMax: Math.max(a.im, b.im) });
      if (piece && piece.bounded && excludesZero(piece)) {
        const fa = f(a); const fb = f(b);
        if (!fa || !fb) return null;
        let change = Math.atan2(fb.im, fb.re) - Math.atan2(fa.im, fa.re);
        if (change > Math.PI) change -= 2 * Math.PI; else if (change <= -Math.PI) change += 2 * Math.PI;
        turn += change;
        continue;
      }
      budget.segments -= 1;
      if (budget.segments <= 0 || (s1 - s0) * size < 1e-12 * Math.max(1, size)) return null;
      const middle = (s0 + s1) / 2;
      stack.push([middle, s1], [s0, middle]);
    }
  }
  const winding = turn / (2 * Math.PI);
  return Math.abs(winding - Math.round(winding)) < 1e-6 ? Math.round(winding) : null;
}

/**
 * Exactly how many zeros and poles (with multiplicity) f has in the region,
 * by splitting it into boxes until each one's winding is attributed: to zeros
 * where f is bounded on the box, to poles where 1/f is. Null when some box
 * cannot be settled within the budget (zeros on an edge, a zero and a pole
 * too close together).
 */
export function ptxCountZerosAndPoles(f: PtxComplexFunction, enclose: Enclose, encloseReciprocal: Enclose, region: PtxComplexBox,
  options: { maxBoxes?: number; isCancelled?: () => boolean } = {}) {
  // Nudge the outer edge off round numbers, where zeros like z = 1 or z = i often sit.
  const pad = 1e-7 * Math.max(region.reMax - region.reMin, region.imMax - region.imMin);
  const outer = { reMin: region.reMin - pad * 1.37, reMax: region.reMax + pad * 0.71, imMin: region.imMin - pad * 0.53, imMax: region.imMax + pad * 1.13 };
  const budget = { segments: 20000 };
  let zeros = 0; let poles = 0; let boxes = 0;
  const stack = [outer];
  while (stack.length) {
    if (options.isCancelled?.() || (boxes += 1) > (options.maxBoxes ?? 600)) return null;
    const box = stack.pop()!;
    const winding = ptxWindingNumber(f, enclose, box, budget);
    const values = enclose(box); const inverse = encloseReciprocal(box);
    if (winding !== null) {
      if (values?.bounded) { zeros += winding; continue; }
      if (inverse?.bounded) { poles -= winding; continue; }
    }
    // Split off-centre so new edges avoid the symmetric points zeros like to sit on.
    const reCut = box.reMin + (box.reMax - box.reMin) * 0.4871; const imCut = box.imMin + (box.imMax - box.imMin) * 0.5173;
    if (box.reMax - box.reMin < 1e-9 * Math.max(1, Math.abs(reCut))) return null;
    stack.push({ ...box, reMax: reCut, imMax: imCut }, { ...box, reMin: reCut, imMax: imCut },
      { ...box, reMax: reCut, imMin: imCut }, { ...box, reMin: reCut, imMin: imCut });
  }
  return { zeros, poles };
}

/** A zero is proved inside a small box round it when f is bounded there and winds round 0 once (or its multiplicity). */
export function ptxProveComplexZero(f: PtxComplexFunction, enclose: Enclose, at: { re: number; im: number }, radius: number) {
  for (const r of [radius, 16 * radius, 256 * radius]) {
    const box = { reMin: at.re - r, reMax: at.re + r, imMin: at.im - r, imMax: at.im + r };
    const values = enclose(box);
    if (!values?.bounded) continue;
    const winding = ptxWindingNumber(f, enclose, box, { segments: 400 });
    if (winding !== null && winding > 0) return { radius: r, multiplicity: winding };
  }
  return null;
}
