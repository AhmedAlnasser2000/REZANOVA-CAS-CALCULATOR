import type { ExprId, ExpressionStore } from '../representation/expression';
import { toDouble, approximateInverse } from './interval';

/**
 * Floating-point evaluation for the systems solver's guesses (EQUATION-CERTIFIED-NUMERICS1 PR B). Nothing
 * computed here is trusted: a Newton guess only says where to try the exact Krawczyk test. NaN marks a value
 * outside the domain or a construct without a double counterpart.
 */
export function evaluateDouble(store: ExpressionStore, id: ExprId, env: ReadonlyMap<string, number>): number {
  const out = new Map<ExprId, number>();
  for (const n of store.postorder([id])) {
    const node = store.node(n), get = (c: ExprId) => out.get(c) as number;
    let v: number;
    switch (node.kind) {
      case 'number': v = toDouble(node.value); break;
      case 'symbol': v = env.get(node.name) ?? NaN; break;
      case 'constant': v = node.name === 'pi' ? Math.PI : NaN; break;
      case 'add': v = node.args.reduce((s, a) => s + get(a), 0); break;
      case 'mul': v = node.args.reduce((s, a) => s * get(a), 1); break;
      case 'pow': {
        const b = get(node.base), e = store.numberValue(node.exponent);
        if (e && e.denominator !== 1n && e.denominator % 2n === 1n && b < 0) v = -Math.pow(-b, toDouble(e));
        else v = Math.pow(b, get(node.exponent));
        break;
      }
      case 'apply': {
        const a = get(node.arg);
        switch (node.fn) {
          case 'exp': v = Math.exp(a); break;
          case 'log': v = a > 0 ? Math.log(a) : NaN; break;
          case 'sin': v = Math.sin(a); break;
          case 'cos': v = Math.cos(a); break;
          case 'tan': v = Math.tan(a); break;
          case 'asin': v = Math.asin(a); break;
          case 'acos': v = Math.acos(a); break;
          case 'atan': v = Math.atan(a); break;
          case 'abs': v = Math.abs(a); break;
          default: v = NaN;
        }
        break;
      }
      default: v = NaN; // algebraic and isolated values never occur in a system's equations
    }
    out.set(n, v);
  }
  return out.get(id) as number;
}

/**
 * Newton's method in doubles from `start`, staying inside `[lo, hi]` per coordinate: the converged point, or
 * undefined when it leaves the box, meets a singular Jacobian or does not settle within a few dozen steps
 * (a guess that fails is not an answer: the caller splits the box instead).
 */
export function newtonGuess(
  store: ExpressionStore, fs: readonly ExprId[], jacobian: readonly (readonly ExprId[])[], vars: readonly string[],
  start: readonly number[], lo: readonly number[], hi: readonly number[],
): number[] | undefined {
  let x = [...start];
  for (let step = 0; step < 40; step++) {
    store.ctx.tick();
    const env = new Map(vars.map((v, i) => [v, x[i]] as const));
    const F = fs.map(f => evaluateDouble(store, f, env)), J = jacobian.map(row => row.map(d => evaluateDouble(store, d, env)));
    if (!F.every(Number.isFinite) || !J.every(r => r.every(Number.isFinite))) return undefined;
    const inv = approximateInverse(J);
    if (!inv) return undefined;
    const dx = inv.map(row => row.reduce((s, c, j) => s + c * F[j], 0));
    x = x.map((v, i) => v - dx[i]);
    if (!x.every((v, i) => v >= lo[i] && v <= hi[i])) return undefined;
    if (dx.every((d, i) => Math.abs(d) <= 1e-14 * (1 + Math.abs(x[i])))) return x;
  }
  return undefined;
}
