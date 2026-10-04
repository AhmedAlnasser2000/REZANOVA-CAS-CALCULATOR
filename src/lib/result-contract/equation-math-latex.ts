import type { SerializableMathJson } from '../../types/calculator';
import { exactSymbolLatex } from './exact-arithmetic-latex';

/**
 * The restricted exact grammar of V6 Equation math leaves, and its deterministic canonical LaTeX.
 *
 * Leaves: safe integers, `{ num }` integers, bound symbols and the constants Pi, ExponentialE, ImaginaryUnit.
 * Heads: arithmetic, roots, exp/log, trig and inverse trig, Abs and the two real Lambert W branches. The
 * projection is structural and fully delimited (it is canonical, not pedagogical: display normalization belongs
 * to the presentation layer).
 */
export const EQUATION_MATH_CONSTANTS: Readonly<Record<string, string>> = { Pi: '\\pi', ExponentialE: 'e', ImaginaryUnit: 'i' };
const FUNCTIONS: Readonly<Record<string, string>> = {
  Exp: '\\exp', Ln: '\\ln', Sin: '\\sin', Cos: '\\cos', Tan: '\\tan', Arcsin: '\\arcsin', Arccos: '\\arccos', Arctan: '\\arctan',
};
export const EQUATION_MATH_SYMBOL = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const INTEGER = /^(0|-?[1-9][0-9]*)$/;

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const integerLeaf = (v: unknown): boolean => (typeof v === 'number' && Number.isSafeInteger(v))
  || (record(v) && Object.keys(v).length === 1 && typeof v.num === 'string' && INTEGER.test(v.num));

/** Whether `v` is in the grammar, with every free symbol in `symbols` (explicit stack). */
export function isEquationMath(v: unknown, symbols: ReadonlySet<string>): boolean {
  const pending: unknown[] = [v];
  while (pending.length) {
    const x = pending.pop();
    if (integerLeaf(x)) continue;
    if (typeof x === 'string') { if (x in EQUATION_MATH_CONSTANTS || (EQUATION_MATH_SYMBOL.test(x) && symbols.has(x))) continue; return false; }
    if (!Array.isArray(x) || typeof x[0] !== 'string') return false;
    const [head, ...args] = x as [string, ...unknown[]];
    const n = args.length;
    let ok: boolean;
    switch (head) {
      case 'Add': case 'Multiply': ok = n >= 2; break;
      case 'Negate': case 'Sqrt': case 'Abs': ok = n === 1; break;
      case 'Divide': case 'Power': case 'Root': case 'Log': ok = n === 2; break;
      case 'Rational': ok = n === 2 && integerLeaf(args[0]) && integerLeaf(args[1]) && args[1] !== 0 && !(record(args[1]) && args[1].num === '0'); break;
      case 'LambertW': ok = n === 1 || (n === 2 && args[1] === -1); break;
      default: ok = head in FUNCTIONS && n === 1;
    }
    if (!ok) return false;
    pending.push(...args);
  }
  return true;
}

/** Canonical LaTeX of a grammar member (callers validate first). */
export function equationMathLatex(value: SerializableMathJson): string {
  const out = new Map<unknown, string>();
  // Post-order over the tree with an explicit stack; results keyed by node object (leaves are recomputed).
  const leaf = (x: unknown): string | undefined => {
    if (typeof x === 'number') return String(x);
    if (record(x)) return String(x.num);
    if (typeof x === 'string') return EQUATION_MATH_CONSTANTS[x] ?? exactSymbolLatex(x);
    return undefined;
  };
  const stack: Array<[unknown, boolean]> = [[value, false]];
  while (stack.length) {
    const [x, ready] = stack.pop() as [unknown, boolean];
    if (leaf(x) !== undefined) continue;
    const [head, ...args] = x as [string, ...unknown[]];
    if (!ready) { stack.push([x, true]); for (const a of args) stack.push([a, false]); continue; }
    const r = (i: number) => leaf(args[i]) ?? (out.get(args[i]) as string);
    let s: string;
    switch (head) {
      case 'Add': s = args.map((_, i) => r(i)).join('+'); break;
      case 'Multiply': s = args.map((_, i) => `\\left(${r(i)}\\right)`).join(''); break;
      case 'Negate': s = `-\\left(${r(0)}\\right)`; break;
      case 'Divide': case 'Rational': s = `\\frac{${r(0)}}{${r(1)}}`; break;
      case 'Power': s = `\\left(${r(0)}\\right)^{${r(1)}}`; break;
      case 'Sqrt': s = `\\sqrt{${r(0)}}`; break;
      case 'Root': s = `\\sqrt[${r(1)}]{${r(0)}}`; break;
      case 'Abs': s = `\\left|${r(0)}\\right|`; break;
      case 'Log': s = `\\log_{${r(1)}}\\left(${r(0)}\\right)`; break;
      case 'LambertW': s = `W_{${args.length === 2 ? '-1' : '0'}}\\left(${r(0)}\\right)`; break;
      default: s = `${FUNCTIONS[head]}\\left(${r(0)}\\right)`;
    }
    out.set(x, s);
  }
  return leaf(value) ?? (out.get(value) as string);
}
