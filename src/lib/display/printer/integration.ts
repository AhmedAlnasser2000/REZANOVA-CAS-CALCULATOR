import type { SerializableMathJson } from '../../../types/calculator';
import { exactSymbolLatex } from '../../result-contract/exact-arithmetic-latex';
import { CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_DEPTH, CANONICAL_RESULT_MAX_NODES } from '../../result-contract/validation';
import { defineCanonicalPrinterAdapter } from './adapter';
import { validateSerializableMathJson, type MathJsonValidationLimits } from './math-json';

/** Optional structural presentation only. No evaluation, polynomial cancellation or proof state. */
export type IntegrationMathPresentation = {
  latex: string; key: string; zero: boolean; one: boolean; nonzeroConstant: boolean;
};
type Part = {
  sum?: Part[]; tree: SerializableMathJson; body: string; negative: boolean; precedence: number;
  zero: boolean; one: boolean; nonzeroConstant: boolean; degrees: number[] | null;
};
const signedTree = (p: Part): SerializableMathJson => p.negative ? ['Negate', p.tree] : p.tree;
const signedText = (p: Part) => (p.negative ? '-' : '') + p.body;
const grouped = (s: string) => {
  const chunks = [s.slice(0, s.length % 3 || 3)];
  for (let i = chunks[0].length; i < s.length; i += 3) chunks.push(s.slice(i, i + 3));
  return chunks.join('\\,');
};

export function presentIntegrationMath(value: SerializableMathJson, variables: readonly string[] = [], limits: MathJsonValidationLimits = {}): IntegrationMathPresentation {
  const bounds = {maxNodes: Math.min(limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES, CANONICAL_RESULT_MAX_NODES),
    maxDepth: Math.min(limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH, CANONICAL_RESULT_MAX_DEPTH),
    maxBytes: Math.min(limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_BYTES)};
  const valid = validateSerializableMathJson(value, bounds);
  if (!valid.ok) throw Error(valid.failure.message);
  const constant = (digits: string): Part => {
    if (!/^-?(0|[1-9]\d*)$/.test(digits)) throw Error('Noninteger presentation leaf');
    const abs = digits.replace(/^-/, ''), zero = abs === '0';
    return {tree: {num: abs}, body: grouped(abs), negative: !zero && digits.startsWith('-'), precedence: 4,
      zero, one: abs === '1', nonzeroConstant: !zero, degrees: variables.map(() => 0)};
  };
  const finish = (p: Part): Part => {
    // Generated notation can grow; it has its own bound, never the request's algebra budget.
    if (p.body.length > bounds.maxBytes) throw Error('Presentation output limit');
    return p;
  };
  const wrap = (p: Part, min: number) => p.precedence < min ? `\\left(${p.body}\\right)` : p.body;
  const walk = (v: SerializableMathJson): Part => {
    if (typeof v === 'number') {if (!Number.isSafeInteger(v)) throw Error('Unsafe presentation number'); return constant(String(v));}
    if (typeof v === 'string') {
      const index = variables.indexOf(v);
      return {tree: v, body: exactSymbolLatex(v), negative: false, precedence: 4, zero: false, one: false,
        nonzeroConstant: false, degrees: index < 0 ? null : variables.map((_, i) => i === index ? 1 : 0)};
    }
    if (!Array.isArray(v)) {
      if (v && typeof v === 'object' && 'num' in v) return constant(String(v.num));
      throw Error('Unsupported presentation leaf');
    }
    const [head, ...args] = v;
    const a = args.map(walk);
    if (head === 'Negate' && a.length === 1) {
      const p = a[0];
      // Keep a negated sum grouped when it is subsequently joined to another sum.
      return finish({...p, sum: undefined, body: wrap(p, 2), precedence: Math.max(2, p.precedence), negative: !p.zero && !p.negative});
    }
    if (head === 'Add' && a.length) {
      const terms = a.flatMap(p => !p.negative && p.sum ? p.sum : [p]).filter(p => !p.zero);
      if (!terms.length) return constant('0');
      if (terms.length === 1) return terms[0];
      if (terms.every(p => p.degrees)) terms.sort((p, q) => {
        for (let i = 0; i < variables.length; i++) {const d = q.degrees![i] - p.degrees![i]; if (d) return d;}
        return 0;
      });
      return finish({sum: terms, tree: ['Add', ...terms.map(signedTree)], body: terms.map((p, i) => (p.negative ? '-' : i ? '+' : '') + p.body).join(''),
        negative: false, precedence: 1, zero: false, one: false, nonzeroConstant: false,
        degrees: terms.every(p => p.degrees) ? variables.map((_, i) => Math.max(...terms.map(p => p.degrees![i]))) : null});
    }
    if (head === 'Multiply' && a.length) {
      if (a.some(p => p.zero)) return constant('0');
      const negative = a.filter(p => p.negative).length % 2 === 1;
      const factors = a.filter(p => !p.one);
      if (!factors.length) return constant(negative ? '-1' : '1');
      if (factors.length === 1) return {...factors[0], negative};
      // An explicit separator prevents adjacent integers or multi-letter symbols merging.
      return finish({tree: ['Multiply', ...factors.map(p => p.tree)], body: factors.map(p => wrap(p, 2)).join('\\cdot '), negative, precedence: 2,
        zero: false, one: false, nonzeroConstant: factors.every(p => p.nonzeroConstant),
        degrees: factors.every(p => p.degrees) ? variables.map((_, i) => factors.reduce((n, p) => n + p.degrees![i], 0)) : null});
    }
    if ((head === 'Divide' || head === 'Rational') && a.length === 2) {
      const [n, d] = a;
      if (d.zero) throw Error('Zero display denominator');
      if (n.zero) return constant('0');
      const negative = n.negative !== d.negative;
      if (d.one) return {...n, negative};
      return finish({tree: ['Divide', n.tree, d.tree], body: `\\frac{${n.body}}{${d.body}}`, negative, precedence: 3,
        zero: false, one: false, nonzeroConstant: n.nonzeroConstant && d.nonzeroConstant,
        degrees: d.degrees?.every(n => n === 0) ? n.degrees : null});
    }
    if (head === 'Power' && a.length === 2) {
      const [base, exponent] = a;
      const raw = typeof args[1] === 'number' ? String(args[1]) : args[1] && typeof args[1] === 'object' && 'num' in args[1] ? String(args[1].num) : '';
      if (!/^\d+$/.test(raw) || raw.length > 15) throw Error('Unsupported presentation exponent');
      const n = Number(raw);
      if (!Number.isSafeInteger(n)) throw Error('Unsupported presentation exponent');
      if (n === 0) return constant('1');
      if (n === 1) return base;
      if (base.zero) return constant('0');
      if (base.one) return constant(base.negative && n % 2 ? '-1' : '1');
      const degrees = base.degrees?.map(d => d * n) ?? null;
      if (degrees?.some(d => !Number.isSafeInteger(d))) throw Error('Presentation degree limit');
      return finish({tree: ['Power', base.tree, args[1]], body: `${wrap(base, 4)}^{${exponent.body}}`, negative: base.negative && n % 2 === 1,
        precedence: 3, zero: false, one: false, nonzeroConstant: base.nonzeroConstant, degrees});
    }
    if (head === 'NotEqual' && a.length === 2) return finish({tree: ['NotEqual', ...a.map(signedTree)], body: `${signedText(a[0])}\\ne ${signedText(a[1])}`,
      precedence: 0, negative: false, zero: false, one: false, nonzeroConstant: false, degrees: null});
    throw Error('Unsupported integration presentation operator');
  };
  const p = finish(walk(valid.validated.value));
  const key = JSON.stringify(signedTree(p));
  if (key.length > bounds.maxBytes) throw Error('Presentation structure limit');
  return {latex: signedText(p), key, zero: p.zero, one: p.one && !p.negative, nonzeroConstant: p.nonzeroConstant};
}

export const integrationPrinter = defineCanonicalPrinterAdapter<IntegrationMathPresentation>({
  id: 'new-integration-exact-presentation',
  print: (input, request) => ({ok: true, text: input.latex, canonicalLatex: input.latex,
    profile: request.profile, target: request.target, source: 'domain-adapter'}),
});
