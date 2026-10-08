import { demand } from '../execution';
import type { ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import type { CadCell, Decomposition } from './decompose';
import { fiberRoots } from './fiber';
import { asRoot } from '../representation/evaluate';
import { compareReal, type RealRootOf } from '../algebraic/root-of';

/**
 * The cell of a decomposition that contains a point, and the formula's truth there (EQUATION-SEMIALGEBRAIC1). At
 * each level the point's coordinate is placed among the stack's sections, each recomputed at the point itself: the
 * index-th real root of the section's polynomial over (p₁ … p_{k−1}) — the defining polynomials are delineable over
 * the parent cell, so the root with that index is the same section.
 */
const compare = (store: ExpressionStore, a: ExactValue, b: ExactValue) => compareReal(store.ctx, asRoot(store.ctx, a) as RealRootOf, asRoot(store.ctx, b) as RealRootOf);

export function locate(store: ExpressionStore, d: Decomposition, point: readonly ExactValue[]): { readonly cell: CadCell; readonly truth: boolean } {
  demand(point.length === d.free, 'invalid-input', 'a point of the wrong dimension');
  let cell = d.root;
  for (;;) {
    store.ctx.tick();
    if (cell.truth !== undefined) return { cell, truth: cell.truth };
    const k = cell.level + 1, stack = cell.children as readonly CadCell[], p = point[k - 1];
    let next: CadCell | undefined;
    for (let i = 1; i < stack.length; i += 2) {
      const s = stack[i].sections[0];
      const roots = fiberRoots(store, s.poly, k, point.slice(0, k - 1));
      demand(roots !== 'nullified' && roots.length === s.count, 'verification-failed', 'a section polynomial is not delineable at the point');
      const c = compare(store, p, roots[s.index - 1]);
      if (c < 0) { next = stack[i - 1]; break; }
      if (c === 0) { next = stack[i]; break; }
    }
    cell = next ?? stack[stack.length - 1];
  }
}
