import { rMultiply } from '../algebra/rational';
import { expandDeep } from './angles';
import { enclose } from './enclosure';
import { kernelNormalForm } from './kernel-identity';
import type { ExprId, ExpressionStore } from './expression';

/**
 * Folds of a defined number-only real value that the canonical builders keep for domain reasons or cannot see
 * by structure alone. Each preserves the value of a defined expression:
 * - 0·t → 0 when t has a certified enclosure (t is defined, so the product is 0);
 * - (u^a)^n → u^{a·n} for an integer n (principal powers: (e^{a·Log u})^n = e^{n·a·Log u});
 * - exp(c·log A + rest) → A^c·exp(rest) when c is an integer (e^{Log A} = A for every defined A) or A > 0;
 * - a function argument → its kernel normal form when that is strictly smaller (kernel-identity.ts: sums of
 *   products expanded, radical relations applied, so sin(−½ − ½√u + (½ + ½√u)²) → sin(¼u − ¼));
 * then sums are expanded at every level (expandDeep), so the builders' folds apply to what the rewrites expose
 * (sin(−π/2 + 0·L) → −1, ln(1 + e^{ln(e² − 1)}) → 2). Repeated to a fixed point: folding the result again gives
 * the same id. `positive` decides A > 0 for a defined number-only A (a sign test).
 */
export function foldDefined(store: ExpressionStore, id: ExprId, positive: (id: ExprId) => boolean): ExprId {
  for (let current = expandDeep(store, id); ;) {
    store.ctx.tick();
    const next = expandDeep(store, foldOnce(store, current, positive));
    if (next === current) return current;
    current = next;
  }
}

function defined(store: ExpressionStore, id: ExprId): boolean {
  return store.freeSymbols(id).length === 0 && enclose(store, id, 64).kind === 'bounds';
}

function foldOnce(store: ExpressionStore, id: ExprId, positive: (id: ExprId) => boolean): ExprId {
  const ctx = store.ctx, done = new Map<ExprId, ExprId>();
  for (const n of store.postorder([id])) {
    ctx.tick();
    const node = store.node(n), get = (c: ExprId) => done.get(c) as ExprId;
    let rebuilt: ExprId;
    if (node.kind === 'add') rebuilt = store.add(...node.args.map(get));
    else if (node.kind === 'mul') {
      const args = node.args.map(get);
      const zero = args.some(a => store.numberValue(a)?.numerator === 0n);
      rebuilt = zero && args.every(a => store.numberValue(a) !== undefined || defined(store, a)) ? store.integer(0) : store.mul(...args);
    } else if (node.kind === 'pow') {
      const base = get(node.base), exponent = get(node.exponent), n2 = store.numberValue(exponent), inner = store.node(base);
      const a = inner.kind === 'pow' ? store.numberValue(inner.exponent) : undefined;
      rebuilt = inner.kind === 'pow' && a && n2 && n2.denominator === 1n && defined(store, base)
        ? store.pow(inner.base, store.number(rMultiply(ctx, a, n2)))
        : store.pow(base, exponent);
    } else if (node.kind === 'apply' && node.fn === 'exp') rebuilt = foldExpLogs(store, normalArgument(store, get(node.arg)), positive);
    else if (node.kind === 'apply') rebuilt = store.apply(node.fn, normalArgument(store, get(node.arg)));
    else rebuilt = n;
    done.set(n, rebuilt);
  }
  return done.get(id) as ExprId;
}

/** A function argument in its kernel normal form when that is strictly smaller (so repeating this ends). */
function normalArgument(store: ExpressionStore, arg: ExprId): ExprId {
  if (store.numberValue(arg) || !defined(store, arg)) return arg;
  const normal = kernelNormalForm(store, arg);
  return normal !== undefined && store.postorder([normal]).length < store.postorder([arg]).length ? normal : arg;
}

/** exp(Σ terms) with every c·log A term (c an integer, or A > 0) taken out as A^c. */
function foldExpLogs(store: ExpressionStore, arg: ExprId, positive: (id: ExprId) => boolean): ExprId {
  const node = store.node(arg), kept: ExprId[] = [], factors: ExprId[] = [];
  for (const t of node.kind === 'add' ? node.args : [arg]) {
    const tn = store.node(t);
    const [c, inner] = tn.kind === 'mul' && tn.args.length === 2 && store.numberValue(tn.args[0]) ? [store.numberValue(tn.args[0]), tn.args[1]] : [undefined, t];
    const a = store.node(inner);
    const usable = a.kind === 'apply' && a.fn === 'log' && defined(store, a.arg) && ((c === undefined || c.denominator === 1n) || positive(a.arg));
    if (usable && a.kind === 'apply') factors.push(c === undefined ? a.arg : store.pow(a.arg, store.number(c)));
    else kept.push(t);
  }
  if (factors.length === 0) return store.exp(arg);
  return store.mul(...factors, store.exp(store.add(store.integer(0), ...kept)));
}
