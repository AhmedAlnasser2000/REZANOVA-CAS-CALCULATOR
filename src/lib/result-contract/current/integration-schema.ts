import type { SerializableMathJson } from '../../../types/calculator/math-payload-types';
import { exactSymbolLatex } from '../exact-arithmetic-latex';
import { checkMath, InvalidResult, keys, record, symbol } from './math';

const integer = (v: unknown): boolean => typeof v === 'number' ? Number.isSafeInteger(v)
  : record(v) && keys(v, ['num']) && typeof v.num === 'string' && /^(0|-?[1-9][0-9]*)$/.test(v.num);
const zero = (v: unknown) => v === 0 || (record(v) && v.num === '0');

/** Exact rational-expression grammar. Exp arguments are rational in x; nested exponentials are excluded. */
function arithmetic(v: unknown, scope: readonly string[], exponentialVariable?: string): boolean {
  if (integer(v)) return true;
  if (typeof v === 'string') return scope.includes(v);
  if (!Array.isArray(v)) return false;
  const [head, ...args] = v;
  if (head === 'Exp') return exponentialVariable !== undefined && args.length === 1
    && arithmetic(args[0], [exponentialVariable]);
  if (head === 'Power') return args.length === 2 && arithmetic(args[0], scope, exponentialVariable) && integer(args[1]) && !(zero(args[0]) && zero(args[1]));
  if (head === 'Rational') return args.length === 2 && args.every(integer) && !zero(args[1]);
  const arity = head === 'Negate' ? args.length === 1 : head === 'Divide' ? args.length === 2
    : head === 'Add' || head === 'Multiply' ? args.length >= 2 : false;
  return arity && !(head === 'Divide' && zero(args[1])) && args.every(a => arithmetic(a, scope, exponentialVariable));
}

/** Derived exact serialization, never an input to mathematical checking. */
export function exactIntegrationMathLatex(v: SerializableMathJson): string {
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return exactSymbolLatex(v);
  if (record(v) && 'num' in v && typeof v.num === 'string') return v.num;
  if (!Array.isArray(v)) throw new Error('Invalid exact integration tree.');
  const [head, ...args] = v, r = (i: number) => exactIntegrationMathLatex(args[i]);
  switch (head) {
    case 'Add': return args.map(exactIntegrationMathLatex).join('+');
    case 'Multiply': return args.map(a => `\\left(${exactIntegrationMathLatex(a)}\\right)`).join('');
    case 'Negate': return `-\\left(${r(0)}\\right)`;
    case 'Divide': case 'Rational': return `\\frac{${r(0)}}{${r(1)}}`;
    case 'Power': return `\\left(${r(0)}\\right)^{${r(1)}}`;
    case 'Exp': return `\\exp\\left(${r(0)}\\right)`;
    default: throw new Error('Invalid exact integration operator.');
  }
}

function math(v: unknown, scope: string[], path: string, expVariable?: string) {
  checkMath(v, path);
  if (!arithmetic(v.mathJson, scope, expVariable)
    || v.canonicalLatex !== exactIntegrationMathLatex(v.mathJson)) {
    throw new InvalidResult('Invalid integration math, symbol scope or derived presentation.', path);
  }
  return v;
}

/** Degree in the bound root. Coefficients may be rational in the other declared field variables. */
function degree(v: unknown, root: string): number | null {
  if (integer(v)) return 0;
  if (typeof v === 'string') return v === root ? 1 : 0;
  if (!Array.isArray(v)) return null;
  const [head, ...a] = v;
  if (head === 'Power') {
    const d = degree(a[0], root), n = a[1];
    if (d === null) return null;
    if (d === 0) return 0;
    return typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && Number.isSafeInteger(d * n) ? d * n : null;
  }
  const ds = a.map(x => degree(x, root));
  if (ds.some(d => d === null)) return null;
  const ns = ds as number[];
  if (head === 'Divide' || head === 'Rational') return ns[1] === 0 ? ns[0] : null;
  if (head === 'Negate') return ns[0];
  if (head === 'Add') return Math.max(...ns);
  if (head === 'Multiply') {
    const d = ns.reduce((x, y) => x + y, 0);
    return Number.isSafeInteger(d) ? d : null;
  }
  return null;
}

function terms(v: unknown, names: string[], used: Set<string>, path: string, rationalVariable?: string) {
  if (!Array.isArray(v)) throw new InvalidResult('Root-log terms must be an array.', path);
  return v.map((term, i) => {
    const at = `${path}[${i}]`;
    if (!record(term) || !keys(term, ['rootVariable', 'modulus', 'weight', 'argument', 'norm'])
      || !symbol(term.rootVariable) || used.has(term.rootVariable)) throw new InvalidResult('Invalid or captured root binder.', at);
    const root = term.rootVariable;
    used.add(root);
    const q = math(term.modulus, [root], `${at}.modulus`), w = math(term.weight, [root], `${at}.weight`);
    const g = math(term.argument, [...names, root], `${at}.argument`), norm = math(term.norm, names, `${at}.norm`);
    const dq = degree(q.mathJson, root), dw = degree(w.mathJson, root), dg = degree(g.mathJson, root);
    const leading = Array.isArray(q.mathJson) && q.mathJson[0] === 'Add' ? q.mathJson.at(-1) : q.mathJson;
    const monic = dq === 1 ? leading === root : Array.isArray(leading) && leading.length === 3
      && leading[0] === 'Power' && leading[1] === root && leading[2] === dq;
    if (dq === null || dq < 1 || dw === null || dg === null || dw >= dq || dg >= dq || !monic) {
      throw new InvalidResult('Invalid constant modulus or unreduced root coefficients.', at);
    }
    if (rationalVariable !== undefined && (degree(g.mathJson, rationalVariable) === null || degree(norm.mathJson, rationalVariable) === null)) {
      throw new InvalidResult('Rational primitive arguments and norms must be polynomial in the integration variable.', at);
    }
    return norm;
  });
}

export function checkIntegrationRestrictions(v: unknown, variable: string, names: string[], path: string): void {
  if (!Array.isArray(v)) throw new InvalidResult('Restrictions must be a list.', path);
  v.forEach((entry, i) => {
    const at = `${path}[${i}]`;
    if (!record(entry) || !keys(entry, ['kind', 'value', 'origins']) || entry.kind !== 'nonzero'
      || !Array.isArray(entry.origins) || !entry.origins.length) throw new InvalidResult('Invalid restriction provenance.', at);
    const value = math(entry.value, names, `${at}.value`, variable);
    if (zero(value.mathJson)) throw new InvalidResult('A nonzero restriction cannot be the exact zero constant.', at);
    entry.origins.forEach(origin => {
      if (!record(origin) || !keys(origin, ['category', 'path']) || typeof origin.path !== 'string' || !origin.path.trim()
        || !['source', 'argument-denominator', 'input-denominator', 'primitive-denominator', 'coefficient-denominator', 'log-norm'].includes(String(origin.category))) {
        throw new InvalidResult('Invalid restriction origin.', at);
      }
    });
  });
}

export function checkIntegrationPrimary(p: Record<string, unknown>, outcome: unknown): void {
  const path = '$.primary', bad = (message: string): never => { throw new InvalidResult(message, path); };
  if (outcome !== 'success' || !symbol(p.variable)) return bad('An integration decision requires success and an explicit variable.');
  const x = p.variable;
  if (p.kind === 'non-elementary') {
    if (!keys(p, ['kind', 'variable', 'subject', 'supportedClass', 'construction', 'obstruction', 'restrictions'])
      || p.supportedClass !== 'rational-in-one-rational-exponential'
      || !['nonconstant-residue', 'laurent-component'].includes(String(p.obstruction))) return bad('Invalid non-elementarity conclusion.');
  } else if (!symbol(p.integrationConstant) || p.integrationConstant === x || p.semantics !== 'formal-local-complex') {
    return bad('Invalid primitive semantics or captured integration constant.');
  }
  const used = new Set([x]);
  if (typeof p.integrationConstant === 'string') used.add(p.integrationConstant);
  if (p.kind === 'rational-antiderivative') {
    if (!keys(p, ['kind', 'semantics', 'variable', 'integrationConstant', 'rationalPart', 'terms', 'restrictions'])) return bad('Invalid rational primitive keys.');
    math(p.rationalPart, [x], `${path}.rationalPart`);
    const norms = terms(p.terms, [x], used, `${path}.terms`, x);
    checkIntegrationRestrictions(p.restrictions, x, [x], `${path}.restrictions`);
    checkNormCoverage(norms, p.restrictions, bad);
    return;
  }
  const c = p.construction;
  if (!record(c) || !keys(c, ['kind', 'generator', 'argument']) || c.kind !== 'rational-exponential'
    || !symbol(c.generator) || used.has(c.generator)) return bad('Invalid or captured exponential construction.');
  used.add(c.generator);
  math(c.argument, [x], `${path}.construction.argument`);
  const names = [x, c.generator];
  checkIntegrationRestrictions(p.restrictions, x, names, `${path}.restrictions`);
  if (p.kind === 'non-elementary') { math(p.subject, names, `${path}.subject`); return; }
  if (!keys(p, ['kind', 'semantics', 'variable', 'integrationConstant', 'construction', 'fieldPart', 'terms', 'restrictions'])) return bad('Invalid exponential primitive keys.');
  math(p.fieldPart, names, `${path}.fieldPart`);
  const norms = terms(p.terms, names, used, `${path}.terms`);
  checkNormCoverage(norms, p.restrictions, bad);
}

function checkNormCoverage(norms: Array<{mathJson: unknown}>, entries: unknown, bad: (message: string) => never) {
  const restrictions = entries as Array<{value: {mathJson: unknown}; origins: Array<{category: string}>}>;
  const expected = new Set(norms.map(n => JSON.stringify(n.mathJson))), supplied = new Set<string>();
  for (const r of restrictions) if (r.origins.some(o => o.category === 'log-norm')) supplied.add(JSON.stringify(r.value.mathJson));
  if ([...expected].some(key => !supplied.has(key)) || [...supplied].some(key => !expected.has(key))) {
    bad('Logarithm norm restriction coverage differs.');
  }
}
