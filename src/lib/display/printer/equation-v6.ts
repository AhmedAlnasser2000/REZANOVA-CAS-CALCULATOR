import type { SerializableMathJson } from '../../../types/calculator';
import { CANONICAL_RESULT_MAX_DEPTH } from '../../result-contract/validation';
import { defineCanonicalPrinterAdapter } from './adapter';

/**
 * Visible LaTeX and plain text for V6 Equation math (EQUATION-PRESENTATION1, part B).
 *
 * A deterministic, precedence-aware structural printer over the V6 math grammar. It changes no value: the layout
 * identities it applies are ring identities (a −1 distributed over a sum, a positive term moved to the front,
 * factors with negative integer exponents moved under a fraction bar, q^(1/n) shown as a root). Value rewrites
 * (2√3 for √12, …) are proven by the core before printing, never here. Rendering is never authority.
 */
export interface EquationPrintOptions {
  /** Display names for bound symbols (r_1 → r₁ is the default for `r_<n>`). */
  readonly names?: ReadonlyMap<string, { latex: string; text: string }>;
  /** Order the terms of a sum by descending degree in this variable (polynomial definitions). */
  readonly descendingIn?: string;
  /** Symbols that stand for numbers (root binders), for relation layout. */
  readonly constants?: ReadonlySet<string>;
}
export interface PrintedEquationMath { readonly latex: string; readonly text: string }
export interface PrintedRelation extends PrintedEquationMath {
  readonly left: PrintedEquationMath; readonly op: RelationOperator; readonly right: PrintedEquationMath;
}

type Json = SerializableMathJson;
interface Out { latex: string; text: string; prec: number }
const SUM = 1, PRODUCT = 2, POWER = 4, ATOM = 5;
const atom = (latex: string, text: string): Out => ({ latex, text, prec: ATOM });
const SUBSCRIPT = '₀₁₂₃₄₅₆₇₈₉';
const FUNCTIONS: Readonly<Record<string, [string, string]>> = {
  Ln: ['\\ln', 'ln'], Sin: ['\\sin', 'sin'], Cos: ['\\cos', 'cos'], Tan: ['\\tan', 'tan'],
  Arcsin: ['\\arcsin', 'arcsin'], Arccos: ['\\arccos', 'arccos'], Arctan: ['\\arctan', 'arctan'],
};

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const head = (v: Json): string | undefined => (Array.isArray(v) && typeof v[0] === 'string' ? v[0] : undefined);
const args = (v: Json): Json[] => (Array.isArray(v) ? (v.slice(1) as Json[]) : []);
function integerOf(v: Json): bigint | undefined {
  if (typeof v === 'number' && Number.isSafeInteger(v)) return BigInt(v);
  const num = record(v) ? (v as { num?: unknown }).num : undefined;
  if (typeof num === 'string') return BigInt(num);
  return undefined;
}
/** A rational constant (integer or Rational), or undefined. */
function rationalOf(v: Json): [bigint, bigint] | undefined {
  const n = integerOf(v);
  if (n !== undefined) return [n, 1n];
  if (head(v) === 'Rational') { const [p, q] = args(v).map(integerOf); if (p !== undefined && q !== undefined) return q < 0n ? [-p, -q] : [p, q]; }
  return undefined;
}

class Printer {
  readonly #options: EquationPrintOptions;
  constructor(options: EquationPrintOptions) { this.#options = options; }

  symbol(name: string): Out {
    const given = this.#options.names?.get(name);
    if (given) return atom(given.latex, given.text);
    if (name === 'Pi') return atom('\\pi', 'π');
    if (name === 'ExponentialE') return atom('e', 'e');
    if (name === 'ImaginaryUnit') return atom('i', 'i');
    const m = /^([A-Za-z]+)_([0-9]+)$/.exec(name);
    if (m) return atom(`${m[1]}_{${m[2]}}`, m[1] + [...m[2]].map(d => SUBSCRIPT[Number(d)]).join(''));
    return atom(name.length === 1 ? name : `\\mathrm{${name}}`, name);
  }

  /** Split a value into sign and magnitude, structurally. */
  signed(v: Json): { negative: boolean; body: Json } {
    const n = integerOf(v);
    if (n !== undefined) return n < 0n ? { negative: true, body: { num: (-n).toString() } } : { negative: false, body: v };
    const h = head(v), a = args(v);
    if (h === 'Rational') { const r = rationalOf(v); if (r && r[0] < 0n) return { negative: true, body: ['Rational', { num: (-r[0]).toString() }, { num: r[1].toString() }] }; }
    if (h === 'Negate') { const inner = this.signed(a[0]); return { negative: !inner.negative, body: inner.body }; }
    if (h === 'Multiply') {
      const first = this.signed(a[0]);
      if (first.negative) {
        const rest = integerOf(first.body) === 1n ? a.slice(1) : [first.body, ...a.slice(1)];
        return { negative: true, body: rest.length === 1 ? rest[0] : ['Multiply', ...rest] };
      }
    }
    return { negative: false, body: v };
  }

  /** The terms of a sum, with −1 distributed over inner sums. */
  terms(v: Json): { negative: boolean; body: Json }[] {
    const out: { negative: boolean; body: Json }[] = [];
    const visit = (t: Json, flip: boolean) => {
      if (head(t) === 'Add') { args(t).forEach(x => visit(x, flip)); return; }
      const s = this.signed(t);
      if (head(s.body) === 'Add') { args(s.body).forEach(x => visit(x, flip !== s.negative)); return; }
      out.push({ negative: s.negative !== flip, body: s.body });
    };
    visit(v, false);
    return out;
  }

  /** Factor order: constants (π, e, i) first, then symbols and their powers alphabetically, then the rest. */
  ordered(factors: Json[]): Json[] {
    const rank = (f: Json): [number, string] => {
      const base = head(f) === 'Power' ? args(f)[0] : f;
      if (base === 'Pi' || base === 'ExponentialE') return [0, String(base)];
      if (base === 'ImaginaryUnit') return [3, ''];
      if (typeof base === 'string') return [1, base];
      return [2, ''];
    };
    return factors.map((f, i) => ({ f, i, r: rank(f) }))
      .sort((a, b) => a.r[0] - b.r[0] || (a.r[0] === 1 ? a.r[1].localeCompare(b.r[1]) : 0) || a.i - b.i).map(x => x.f);
  }

  constant(v: Json): boolean {
    const pending: Json[] = [v];
    while (pending.length) {
      const x = pending.pop() as Json;
      if (typeof x === 'string' && !['Pi', 'ExponentialE', 'ImaginaryUnit'].includes(x) && !this.#options.constants?.has(x)) return false;
      if (Array.isArray(x)) pending.push(...(x.slice(1) as Json[]));
    }
    return true;
  }

  degree(v: Json, x: string): number {
    if (v === x) return 1;
    const h = head(v), a = args(v);
    if (h === 'Power' && a[0] === x) return Number(integerOf(a[1]) ?? 0n);
    if (h === 'Multiply' || h === 'Negate') return a.reduce<number>((d, t) => d + this.degree(t, x), 0);
    return 0;
  }

  sum(v: Json, depth: number): Out {
    let ts = this.terms(v);
    const x = this.#options.descendingIn;
    if (x) ts = ts.map((t, i) => ({ t, i, d: this.degree(t.body, x) })).sort((p, q) => q.d - p.d || p.i - q.i).map(p => p.t);
    else {
      // A positive term first: −1 + e is shown e − 1.
      const k = ts.findIndex(t => !t.negative);
      if (k > 0) ts = [ts[k], ...ts.slice(0, k), ...ts.slice(k + 1)];
    }
    let latex = '', text = '';
    ts.forEach((t, i) => {
      const b = this.print(t.body, depth + 1), wrap = b.prec <= SUM;
      const bl = wrap ? `\\left(${b.latex}\\right)` : b.latex, bt = wrap ? `(${b.text})` : b.text;
      if (i === 0) { latex = (t.negative ? '-' : '') + bl; text = (t.negative ? '-' : '') + bt; }
      else { latex += (t.negative ? ' - ' : ' + ') + bl; text += (t.negative ? ' - ' : ' + ') + bt; }
    });
    return { latex, text, prec: ts.length > 1 ? SUM : (ts[0]?.negative ? PRODUCT : this.print(ts[0].body, depth + 1).prec) };
  }

  product(v: Json, depth: number): Out {
    const s = this.signed(v);
    if (s.negative) {
      const b = this.print(s.body, depth + 1), wrap = b.prec <= SUM;
      return { latex: `-${wrap ? `\\left(${b.latex}\\right)` : b.latex}`, text: `-${wrap ? `(${b.text})` : b.text}`, prec: PRODUCT };
    }
    // Numerator and denominator factors; a rational coefficient splits across the bar.
    const flat: Json[] = [];
    const visit = (t: Json) => { if (head(t) === 'Multiply') args(t).forEach(visit); else flat.push(t); };
    visit(s.body);
    let cn = 1n, cd = 1n;
    const up: Json[] = [], down: Json[] = [];
    for (const f of flat) {
      const r = rationalOf(f);
      if (r) { cn *= r[0]; cd *= r[1]; continue; }
      if (head(f) === 'Power') { const e = integerOf(args(f)[1]); if (e !== undefined && e < 0n) { down.push(e === -1n ? args(f)[0] : ['Power', args(f)[0], { num: (-e).toString() }]); continue; } }
      if (head(f) === 'Divide') { up.push(args(f)[0]); down.push(args(f)[1]); continue; }
      up.push(f);
    }
    const join = (factors: Json[], coefficient: bigint): Out => {
      const parts = this.ordered(factors).map(f => this.print(f, depth + 1));
      const items: Out[] = coefficient !== 1n || parts.length === 0 ? [atom(coefficient.toString(), coefficient.toString()), ...parts] : parts;
      if (items.length === 1) return items[0];
      let latex = '', text = '';
      items.forEach((p, i) => {
        const wrap = p.prec <= SUM || (i > 0 && p.prec === PRODUCT);
        const pl = wrap ? `\\left(${p.latex}\\right)` : p.latex, pt = wrap ? `(${p.text})` : p.text;
        const digitNext = /^[0-9]/.test(pt);
        // A control word (such as \pi) followed by a letter needs a space: "\pi k", not "\pik".
        latex += i === 0 ? pl : (digitNext ? `\\cdot ${pl}` : /\\[A-Za-z]+$/.test(latex) && /^[A-Za-z]/.test(pl) ? ` ${pl}` : pl);
        text += i === 0 ? pt : (digitNext ? `·${pt}` : pt);
      });
      return { latex, text, prec: PRODUCT };
    };
    // (6 − 2√2)/14 reads (3 − √2)/7: a common integer factor of a lone sum and the denominator cancels.
    if (cd > 1n && up.length === 1 && head(up[0]) === 'Add') {
      const ts = this.terms(up[0]), coefficient = (t: Json): bigint => {
        const n = integerOf(t);
        if (n !== undefined) return n;
        const r = head(t) === 'Multiply' ? integerOf(args(t)[0]) : undefined;
        return r ?? 1n;
      };
      const gcd = (a: bigint, b: bigint): bigint => (b === 0n ? (a < 0n ? -a : a) : gcd(b, a % b));
      const h = gcd(ts.reduce((g, t) => gcd(g, coefficient(t.body)), 0n), cd);
      if (h > 1n) {
        const divided = ts.map(t => {
          const n = integerOf(t.body);
          const body: Json = n !== undefined ? { num: (n / h).toString() } : (() => {
            const rest = args(t.body).slice(1), c = (integerOf(args(t.body)[0]) as bigint) / h;
            return c === 1n ? (rest.length === 1 ? rest[0] : ['Multiply', ...rest]) : ['Multiply', { num: c.toString() }, ...rest];
          })();
          return t.negative ? ['Negate', body] as Json : body;
        });
        up[0] = ['Add', ...divided];
        cd /= h;
      }
    }
    const num = join(up, cn);
    if (cd === 1n && down.length === 0) return num;
    const den = join(down, cd);
    const tn = num.prec <= SUM ? `(${num.text})` : num.text, td = den.prec < POWER ? `(${den.text})` : den.text;
    return { latex: `\\frac{${num.latex}}{${den.latex}}`, text: `${tn}/${td}`, prec: PRODUCT };
  }

  power(base: Json, exponent: Json, depth: number): Out {
    const b = this.print(base, depth + 1), r = rationalOf(exponent);
    const bt = b.prec < ATOM ? `(${b.text})` : b.text;
    if (r && r[0] < 0n) return this.product(['Divide', 1, r[0] === -1n ? base : ['Power', base, r[1] === 1n ? { num: (-r[0]).toString() } : ['Rational', { num: (-r[0]).toString() }, { num: r[1].toString() }]]], depth);
    if (r && r[0] === 1n && r[1] > 1n) {
      if (r[1] === 2n) return atom(`\\sqrt{${b.latex}}`, `√${bt}`);
      const t = r[1] === 3n ? `∛${bt}` : r[1] === 4n ? `∜${bt}` : `${bt}^(1/${r[1]})`;
      return atom(`\\sqrt[${r[1]}]{${b.latex}}`, t);
    }
    const e = this.print(exponent, depth + 1);
    const bl = b.prec < ATOM || this.signed(base).negative ? `\\left(${b.latex}\\right)` : b.latex;
    return { latex: `${bl}^{${e.latex}}`, text: `${bt}^${e.prec < ATOM ? `(${e.text})` : e.text}`, prec: POWER };
  }

  print(v: Json, depth = 0): Out {
    if (depth > CANONICAL_RESULT_MAX_DEPTH * 4) throw new Error('Equation math is too deep to print.');
    const n = integerOf(v);
    if (n !== undefined) return n < 0n ? { latex: `-${-n}`, text: `-${-n}`, prec: PRODUCT } : atom(n.toString(), n.toString());
    if (typeof v === 'string') return this.symbol(v);
    const h = head(v), a = args(v);
    switch (h) {
      case 'Add': return this.sum(v, depth);
      case 'Multiply': case 'Negate':
        // −(1 − e) is a sum once the −1 is distributed.
        if (this.terms(v).length > 1) return this.sum(v, depth);
        return this.product(v, depth);
      case 'Divide': return this.product(h === 'Divide' ? ['Multiply', a[0], ['Power', a[1], -1]] : v, depth);
      case 'Rational': return this.product(['Multiply', v], depth);
      case 'Power': return this.power(a[0], a[1], depth);
      case 'Sqrt': return this.power(a[0], ['Rational', 1, 2], depth);
      case 'Root': { const k = integerOf(a[1]); return k !== undefined ? this.power(a[0], ['Rational', 1, { num: k.toString() }], depth) : this.power(a[0], ['Divide', 1, a[1]], depth); }
      case 'Exp': {
        if (integerOf(a[0]) === 1n) return atom('e', 'e');
        const e = this.print(a[0], depth + 1);
        return { latex: `e^{${e.latex}}`, text: `e^${e.prec < ATOM ? `(${e.text})` : e.text}`, prec: POWER };
      }
      case 'Abs': { const u = this.print(a[0], depth + 1); return atom(`\\left|${u.latex}\\right|`, `|${u.text}|`); }
      case 'Log': { const u = this.print(a[0], depth + 1), b = this.print(a[1], depth + 1); return atom(`\\log_{${b.latex}}\\left(${u.latex}\\right)`, `log_${b.prec < ATOM ? `(${b.text})` : b.text}(${u.text})`); }
      case 'LambertW': {
        const u = this.print(a[0], depth + 1), lower = a.length === 2;
        return atom(`W_{${lower ? '-1' : '0'}}\\left(${u.latex}\\right)`, `W${lower ? '₋₁' : '₀'}(${u.text})`);
      }
      default: {
        const f = FUNCTIONS[h ?? ''];
        if (!f) throw new Error(`Unsupported Equation math head ${String(h)}.`);
        const u = this.print(a[0], depth + 1);
        return atom(`${f[0]}\\left(${u.latex}\\right)`, `${f[1]}(${u.text})`);
      }
    }
  }
}

export type RelationOperator = 'eq' | 'ne' | 'gt' | 'ge' | 'lt' | 'le';
const RELATION: Readonly<Record<RelationOperator, [string, string]>> = {
  eq: ['=', '='], ne: ['\\ne', '≠'], gt: ['>', '>'], ge: ['\\ge', '≥'], lt: ['<', '<'], le: ['\\le', '≤'],
};
const FLIP: Readonly<Record<RelationOperator, RelationOperator>> = { eq: 'eq', ne: 'ne', gt: 'lt', ge: 'le', lt: 'gt', le: 'ge' };

/** a ≤ V ≤ b from V ≥ a and V ≤ b (strictness kept), or undefined when they do not pair. */
export function chainRelations(lower: PrintedRelation, upper: PrintedRelation): PrintedEquationMath | undefined {
  if (lower.left.text !== upper.left.text || !['gt', 'ge'].includes(lower.op) || !['lt', 'le'].includes(upper.op)) return undefined;
  const lo = FLIP[lower.op], [ll, lt] = RELATION[lo], [ul, ut] = RELATION[upper.op];
  return { latex: `${lower.right.latex} ${ll} ${lower.left.latex} ${ul} ${upper.right.latex}`, text: `${lower.right.text} ${lt} ${lower.left.text} ${ut} ${upper.right.text}` };
}

/**
 * A relation laid out for reading, by ring identities only: 0 moves to the right; E op 0 with a single negative
 * term flips to −E flip(op) 0; a variable term and a constant term are separated (1 − a ≥ 0 reads a ≤ 1).
 */
export function printRelation(expr: Json, op: RelationOperator, other: Json = 0, options: EquationPrintOptions = {}): PrintedRelation | undefined {
  try {
    const pr = new Printer(options), zero = (v: Json) => integerOf(v) === 0n;
    let lhs = expr, rhs = other, o = op;
    if (zero(lhs) && !zero(rhs)) { [lhs, rhs] = [rhs, lhs]; o = FLIP[o]; }
    if (zero(rhs)) {
      const ts = pr.terms(lhs);
      if (ts.length === 1 && ts[0].negative) { lhs = ts[0].body; o = FLIP[o]; }
      else if (ts.length === 2 && ts.filter(t => pr.constant(t.body)).length === 1) {
        const v = ts.find(t => !pr.constant(t.body)) as { negative: boolean; body: Json }, c = ts.find(t => pr.constant(t.body)) as { negative: boolean; body: Json };
        // σv·V + σc·C op 0  ⇔  V op −σc·C (σv = +)  or  V flip(op) σc·C (σv = −).
        lhs = v.body;
        rhs = v.negative === c.negative ? ['Negate', c.body] : c.body;
        if (v.negative) { o = FLIP[o]; rhs = c.negative ? ['Negate', c.body] : c.body; }
      }
    }
    const a = pr.print(lhs), b = pr.print(rhs);
    return { latex: `${a.latex} ${RELATION[o][0]} ${b.latex}`, text: `${a.text} ${RELATION[o][1]} ${b.text}`,
      left: { latex: a.latex, text: a.text }, op: o, right: { latex: b.latex, text: b.text } };
  } catch {
    return undefined;
  }
}

/** Print V6 Equation math; returns undefined when the value cannot be printed (the caller falls back). */
export function printEquationMath(value: Json, options: EquationPrintOptions = {}): PrintedEquationMath | undefined {
  try {
    const out = new Printer(options).print(value);
    return { latex: out.latex, text: out.text };
  } catch {
    return undefined;
  }
}

export const equationV6Printer = defineCanonicalPrinterAdapter<Json, EquationPrintOptions>({
  id: 'equation-v6',
  print: (value, request, options) => {
    const printed = printEquationMath(value, options);
    if (!printed) return { ok: false, profile: request.profile, target: request.target, reason: 'serialization-error', message: 'Equation math could not be printed.' };
    const text = request.target === 'plain-text' ? printed.text : printed.latex;
    return { ok: true, profile: request.profile, target: request.target, text, canonicalLatex: printed.latex, source: 'domain-adapter' };
  },
});
