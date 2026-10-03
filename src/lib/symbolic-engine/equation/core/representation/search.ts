import type { ExecutionContext } from '../execution';

/**
 * Termination tools for rewrite search. There is no depth or node limit:
 * iterative deepening runs depth 1, 2, 3, … until it finds a goal, proves
 * the reachable space exhausted, or the execution context stops it.
 *
 * Exhaustion is proven by the visited set: a state is re-expanded only when
 * reached with more remaining depth than before, so once the depth bound
 * exceeds the number of distinct reachable states no frontier node is cut
 * off and the search reports `exhausted` (cyclic rule sets terminate).
 */
export interface SearchSpace<S> {
  readonly hash: (state: S) => string;
  readonly successors: (state: S) => readonly S[];
  readonly goal: (state: S) => boolean;
}

export type SearchResult<S> =
  | { readonly kind: 'found'; readonly path: readonly S[]; readonly depth: number }
  | { readonly kind: 'exhausted'; readonly states: number };

/** Hash-keyed visited set remembering the largest remaining depth each state was expanded with. */
export class VisitedSet {
  readonly #best = new Map<string, number>();
  get size(): number { return this.#best.size; }
  has(hash: string): boolean { return this.#best.has(hash); }
  /** True when the state must be expanded (first visit, or more remaining depth than before). */
  enter(hash: string, remaining: number): boolean {
    const prior = this.#best.get(hash);
    if (prior !== undefined && prior >= remaining) return false;
    this.#best.set(hash, remaining);
    return true;
  }
}

export function iterativeDeepening<S>(ctx: ExecutionContext, start: S, space: SearchSpace<S>): SearchResult<S> {
  for (let bound = 0; ; bound++) {
    ctx.tick();
    const visited = new VisitedSet();
    let cutoff = false;
    // Explicit stack of (state, remaining depth, next successor index).
    const path: S[] = [start];
    const frames: { state: S; remaining: number; next: number; successors: readonly S[] | undefined }[] = [];
    if (space.goal(start)) return { kind: 'found', path: [start], depth: 0 };
    visited.enter(space.hash(start), bound);
    frames.push({ state: start, remaining: bound, next: 0, successors: undefined });
    while (frames.length) {
      ctx.tick();
      const top = frames[frames.length - 1];
      if (top.remaining === 0) {
        if (space.successors(top.state).length > 0) cutoff = true;
        frames.pop(); path.pop();
        continue;
      }
      top.successors ??= space.successors(top.state);
      if (top.next >= top.successors.length) { frames.pop(); path.pop(); continue; }
      const child = top.successors[top.next++];
      ctx.allocate(1);
      if (space.goal(child)) return { kind: 'found', path: [...path, child], depth: path.length };
      if (!visited.enter(space.hash(child), top.remaining - 1)) continue;
      frames.push({ state: child, remaining: top.remaining - 1, next: 0, successors: undefined });
      path.push(child);
    }
    if (!cutoff) return { kind: 'exhausted', states: visited.size };
  }
}
