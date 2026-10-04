import type { CanonicalMathValueV2, CanonicalResultDocumentV6, SerializableMathJson } from '../../types/calculator';
import { EQUATION_MATH_SYMBOL, equationMathLatex, isEquationMath } from './equation-math-latex';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import { CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_DEPTH, CANONICAL_RESULT_MAX_NODES,
  type CanonicalResultValidationFailure, type CanonicalResultValidationLimits } from './validation';
import { validateCanonicalResultDocumentV2 } from './validation-v2';

/**
 * V6 schema: bounded structure, exact keys, the V2 base fields, every math leaf in the restricted standard grammar
 * with its canonical LaTeX, and binding (root binders, integer and free parameters are fresh or declared, and
 * nothing captures a target or parameter). Like V5, this proves nothing mathematical: isolation correctness and
 * set equality remain producer obligations (the Equation adapter replays every document before returning it).
 */
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, required: string[], optional: string[] = []) =>
  required.every(n => Object.hasOwn(v, n)) && Object.keys(v).every(n => required.includes(n) || optional.includes(n));
const symbol = (v: unknown): v is string => typeof v === 'string' && EQUATION_MATH_SYMBOL.test(v) && !['Pi', 'ExponentialE', 'ImaginaryUnit'].includes(v);
const names = (v: unknown): v is string[] => Array.isArray(v) && v.every(symbol) && new Set(v).size === v.length;
const text = (v: unknown): v is string => typeof v === 'string' && v.trim().length > 0;
const INTEGER = /^(0|-?[1-9][0-9]*)$/;
const OWNER = /^(EQUATION-[A-Z0-9]+(-[A-Z0-9]+)*|unassigned)$/;
const CONDITIONS = ['nonzero', 'positive', 'nonnegative', 'in-domain', 'equal', 'not-equal'];

class Invalid {
  readonly message: string;
  readonly path: string;
  constructor(message: string, path: string) { this.message = message; this.path = path; }
}

/** Integer-coefficient polynomial in `x` (degree ≥ 1). */
function integerPolynomial(v: unknown, x: string): boolean {
  const pending = [v];
  let sawX = false;
  while (pending.length) {
    const t = pending.pop();
    if (typeof t === 'number' || record(t)) continue;
    if (t === x) { sawX = true; continue; }
    if (!Array.isArray(t)) return false;
    const [head, ...args] = t;
    if (head === 'Power') { if (args[0] !== x || typeof args[1] !== 'number' || !Number.isSafeInteger(args[1]) || args[1] < 1) return false; sawX = true; continue; }
    if (head !== 'Add' && head !== 'Multiply' && head !== 'Negate') return false;
    pending.push(...args);
  }
  return sawX;
}
/** A rational constant: an integer, Rational(p, q), or their negation. */
function rationalConstant(v: unknown): boolean {
  if (typeof v === 'number' || record(v)) return true;
  return Array.isArray(v) && ((v[0] === 'Rational' && v.length === 3) || (v[0] === 'Negate' && v.length === 2 && rationalConstant(v[1])));
}

export function collectCanonicalResultMathValuesV6(document: CanonicalResultDocumentV6): Array<{ path: string; value: CanonicalMathValueV2 }> {
  const out: Array<{ path: string; value: CanonicalMathValueV2 }> = [];
  const visit = (v: unknown, path: string) => {
    if (!v || typeof v !== 'object') return;
    if (record(v) && 'canonicalLatex' in v && 'mathJson' in v) { out.push({ path, value: v as CanonicalMathValueV2 }); return; }
    if (Array.isArray(v)) v.forEach((x, i) => visit(x, `${path}[${i}]`));
    else Object.entries(v).forEach(([k, x]) => visit(x, `${path}.${k}`));
  };
  visit(document.primary, 'primary');
  return out;
}

export function validateCanonicalResultDocumentV6(input: unknown, limits: CanonicalResultValidationLimits = {}) {
  const failWith = (message: string, path = '$.primary', reason: CanonicalResultValidationFailure['reason'] = 'invalid-shape') =>
    ({ ok: false as const, failure: { reason, message, path } as CanonicalResultValidationFailure });
  const inspection = inspectJsonCompatibleStructuredValue(input, { label: 'Canonical result V6',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES, maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES });
  if (!inspection.ok) return { ok: false as const, failure: inspection.failure };
  const doc: unknown = JSON.parse(inspection.serialized);
  if (!record(doc) || doc.version !== 6) return failWith('V6 requires version 6.', '$.version');
  const common: Record<string, unknown> = { ...doc, version: 2 };
  Reflect.deleteProperty(common, 'primary');
  const base = validateCanonicalResultDocumentV2(common, limits);
  if (!base.ok) return base;
  let count = 0;
  try {
    checkPrimary(doc.primary, doc.outcomeKind, () => { count++; });
  } catch (e) {
    if (e instanceof Invalid) return failWith(e.message, e.path);
    throw e;
  }
  return { ok: true as const, validated: { value: doc as unknown as CanonicalResultDocumentV6,
    nodeCount: inspection.nodeCount, depth: inspection.depth, byteLength: inspection.byteLength, mathValueCount: count + base.validated.mathValueCount } };
}

function checkPrimary(p: unknown, outcomeKind: unknown, counted: () => void): void {
  const bad = (message: string, path: string): never => { throw new Invalid(message, path); };
  if (!record(p) || !keys(p, ['kind', 'domain', 'targets', 'parameters', 'roots', 'outcome', 'provenance']) || p.kind !== 'equation-outcome'
    || (p.domain !== 'real' && p.domain !== 'complex')) return bad('Invalid V6 primary.', '$.primary');
  if (!names(p.targets) || p.targets.length === 0 || !names(p.parameters) || p.parameters.some(n => (p.targets as string[]).includes(n))) return bad('Targets and parameters must be distinct symbols.', '$.primary.targets');
  const targets = p.targets, parameters = p.parameters, domain = p.domain;
  const taken = new Set([...targets, ...parameters]);
  const math = (v: unknown, scope: ReadonlySet<string>, path: string): void => {
    counted();
    if (!record(v) || !keys(v, ['canonicalLatex', 'mathJson']) || !isEquationMath(v.mathJson, scope)) return bad('A math value is outside the V6 grammar or its scope.', path);
    if (v.canonicalLatex !== equationMathLatex(v.mathJson as SerializableMathJson)) return bad('Canonical LaTeX differs from the canonical projection.', `${path}.canonicalLatex`);
  };
  // Root binders: fresh symbols, independent of each other.
  if (!Array.isArray(p.roots)) return bad('Roots must be a list.', '$.primary.roots');
  const roots: string[] = [];
  p.roots.forEach((b, i) => {
    const path = `$.primary.roots[${i}]`;
    if (!record(b) || !symbol(b.symbol) || taken.has(b.symbol)) return bad('A root binder needs a fresh symbol.', path);
    taken.add(b.symbol);
    roots.push(b.symbol);
    const own = new Set([b.symbol]), none = new Set<string>(), bound = (v: unknown, k: string) => { math(v, none, `${path}.${k}`); if (!rationalConstant((v as CanonicalMathValueV2).mathJson)) bad('Isolation bounds must be rational constants.', `${path}.${k}`); };
    if (b.kind === 'real-algebraic' || b.kind === 'complex-algebraic') {
      const fields = b.kind === 'real-algebraic' ? ['lo', 'hi'] : ['re', 'im', 'radius'];
      if (!keys(b, ['kind', 'symbol', 'polynomial', ...fields], ['form'])) return bad('Invalid algebraic binder keys.', path);
      math(b.polynomial, own, `${path}.polynomial`);
      if (!integerPolynomial((b.polynomial as CanonicalMathValueV2).mathJson, b.symbol)) bad('A binder polynomial must have integer coefficients and positive degree.', `${path}.polynomial`);
      for (const f of fields) bound(b[f], f);
      if (b.form !== undefined) math(b.form, none, `${path}.form`);
    } else if (b.kind === 'indexed-real-root') {
      if (!keys(b, ['kind', 'symbol', 'polynomial', 'index'], ['lo', 'hi']) || (b.lo === undefined) !== (b.hi === undefined)) return bad('Invalid indexed root keys.', path);
      if (!Number.isSafeInteger(b.index) || (b.index as number) < 1) bad('A root index is a positive integer.', `${path}.index`);
      math(b.polynomial, new Set([b.symbol, ...parameters]), `${path}.polynomial`);
      if (b.lo !== undefined) { bound(b.lo, 'lo'); bound(b.hi, 'hi'); }
    } else bad('Unknown root binder kind.', path);
  });
  const outer = new Set([...parameters, ...roots]);
  const fresh = (list: unknown, path: string): string[] => {
    if (!names(list) || list.some(n => taken.has(n))) return bad('Bound parameters must be fresh symbols.', path);
    return list;
  };
  const condition = (c: unknown, scope: ReadonlySet<string>, path: string) => {
    if (!record(c) || typeof c.kind !== 'string' || !CONDITIONS.includes(c.kind)) return bad('Unknown condition.', path);
    const two = c.kind === 'equal' || c.kind === 'not-equal';
    if (!keys(c, two ? ['kind', 'expr', 'other'] : ['kind', 'expr'])) return bad('Invalid condition keys.', path);
    math(c.expr, scope, `${path}.expr`);
    if (two) math(c.other, scope, `${path}.other`);
  };
  const endpoint = (e: unknown, scope: ReadonlySet<string>, path: string) => {
    if (record(e) && e.kind === 'infinity' && keys(e, ['kind', 'sign']) && (e.sign === 1 || e.sign === -1)) return;
    if (!record(e) || e.kind !== 'value' || !keys(e, ['kind', 'value'])) return bad('Invalid endpoint.', path);
    math(e.value, scope, `${path}.value`);
  };
  const interval = (v: unknown, scope: ReadonlySet<string>, path: string) => {
    if (!record(v) || !keys(v, ['lo', 'hi', 'loClosed', 'hiClosed']) || typeof v.loClosed !== 'boolean' || typeof v.hiClosed !== 'boolean') return bad('Invalid interval.', path);
    endpoint(v.lo, scope, `${path}.lo`); endpoint(v.hi, scope, `${path}.hi`);
    if ((record(v.lo) && v.lo.kind === 'infinity' && v.loClosed) || (record(v.hi) && v.hi.kind === 'infinity' && v.hiClosed)) bad('Infinite ends are open.', path);
  };
  const variables = (v: unknown, path: string) => {
    if (!Array.isArray(v) || v.length !== targets.length || v.some((x, i) => x !== targets[i])) bad('Set variables must be the targets, in order.', path);
  };
  const realOnly = (path: string) => { if (domain !== 'real') bad('This set kind is real only.', path); };
  const points = (list: unknown, scope: ReadonlySet<string>, path: string) => {
    if (!Array.isArray(list)) return bad('Points must be a list.', path);
    list.forEach((pt, i) => {
      if (!Array.isArray(pt) || pt.length !== targets.length) bad('A point has one value per target.', `${path}[${i}]`);
      (pt as unknown[]).forEach((x, j) => math(x, scope, `${path}[${i}][${j}]`));
    });
  };
  const set = (s: unknown, path: string): void => {
    if (!record(s) || typeof s.kind !== 'string') return bad('Invalid set.', path);
    const scope = outer;
    switch (s.kind) {
      case 'finite': if (!keys(s, ['kind', 'variables', 'points'])) break; variables(s.variables, path); return points(s.points, scope, `${path}.points`);
      case 'cofinite': if (!keys(s, ['kind', 'variables', 'except'])) break; variables(s.variables, path); return points(s.except, scope, `${path}.except`);
      case 'intervals':
        if (!keys(s, ['kind', 'variables', 'intervals']) || !Array.isArray(s.intervals)) break;
        realOnly(path); variables(s.variables, path);
        return s.intervals.forEach((v, i) => interval(v, scope, `${path}.intervals[${i}]`));
      case 'union':
        if (!keys(s, ['kind', 'sets']) || !Array.isArray(s.sets) || s.sets.length < 2) break;
        return s.sets.forEach((x, i) => set(x, `${path}.sets[${i}]`));
      case 'case-tree':
        if (!keys(s, ['kind', 'cases']) || !Array.isArray(s.cases) || s.cases.length === 0 || parameters.length === 0) break;
        return s.cases.forEach((c, i) => {
          if (!record(c) || !keys(c, ['conditions', 'set']) || !Array.isArray(c.conditions)) return bad('Invalid case.', `${path}.cases[${i}]`);
          c.conditions.forEach((k, j) => condition(k, scope, `${path}.cases[${i}].conditions[${j}]`));
          set(c.set, `${path}.cases[${i}].set`);
        });
      case 'periodic-set':
        if (!keys(s, ['kind', 'variables', 'period', 'components', 'range']) || !Array.isArray(s.components) || s.components.length === 0) break;
        realOnly(path); variables(s.variables, path);
        math(s.period, scope, `${path}.period`);
        s.components.forEach((v, i) => interval(v, scope, `${path}.components[${i}]`));
        return interval(s.range, scope, `${path}.range`);
      case 'interval-family': {
        if (!keys(s, ['kind', 'variables', 'parameter', 'lo', 'hi', 'loClosed', 'hiClosed'], ['from', 'to'])
          || typeof s.loClosed !== 'boolean' || typeof s.hiClosed !== 'boolean') break;
        realOnly(path); variables(s.variables, path);
        const [k] = fresh([s.parameter], `${path}.parameter`);
        for (const b of ['from', 'to'] as const) if (s[b] !== undefined && (typeof s[b] !== 'string' || !INTEGER.test(s[b] as string))) bad('Family bounds are decimal integers.', `${path}.${b}`);
        if (s.from !== undefined && s.to !== undefined && BigInt(s.from as string) > BigInt(s.to as string)) bad('Empty family range.', path);
        const inner = new Set([...scope, k]);
        math(s.lo, inner, `${path}.lo`); return math(s.hi, inner, `${path}.hi`);
      }
      case 'root-set':
        if (!keys(s, ['kind', 'variables', 'polynomial']) || targets.length !== 1) break;
        variables(s.variables, path);
        return math(s.polynomial, new Set([...scope, targets[0]]), `${path}.polynomial`);
      case 'periodic': case 'parametric': {
        const field = s.kind === 'periodic' ? 'integerParameters' : 'freeParameters';
        if (!keys(s, ['kind', 'variables', 'values', field, 'constraints']) || !Array.isArray(s.values) || s.values.length !== targets.length || !Array.isArray(s.constraints)) break;
        variables(s.variables, path);
        let bound: string[];
        if (s.kind === 'periodic') {
          bound = fresh(s[field], `${path}.${field}`);
          if (bound.length === 0) bad('A periodic set has integer parameters.', `${path}.${field}`);
        } else {
          // Free targets are their own parameters.
          if (!names(s[field]) || (s[field] as string[]).some(t => !targets.includes(t)) || (s[field] as string[]).length === 0) bad('Free parameters are free targets.', `${path}.${field}`);
          bound = s[field] as string[];
        }
        const inner = new Set([...scope, ...bound]);
        s.values.forEach((v, i) => math(v, inner, `${path}.values[${i}]`));
        return s.constraints.forEach((c, i) => condition(c, inner, `${path}.constraints[${i}]`));
      }
      case 'reduced-form': {
        if (!keys(s, ['kind', 'targets', 'relations', 'conditions']) || !Array.isArray(s.relations) || s.relations.length === 0 || !Array.isArray(s.conditions)) break;
        variables(s.targets, `${path}.targets`);
        const inner = new Set([...scope, ...targets]);
        s.relations.forEach((r, i) => {
          if (!record(r) || !keys(r, ['op', 'lhs', 'rhs']) || !['eq', 'ne', 'lt', 'le'].includes(r.op as string)) return bad('Invalid relation.', `${path}.relations[${i}]`);
          if (domain === 'complex' && (r.op === 'lt' || r.op === 'le')) bad('Orders are real only.', `${path}.relations[${i}]`);
          math(r.lhs, inner, `${path}.relations[${i}].lhs`); math(r.rhs, inner, `${path}.relations[${i}].rhs`);
        });
        return s.conditions.forEach((c, i) => condition(c, inner, `${path}.conditions[${i}]`));
      }
      case 'unconfirmed':
        if (!keys(s, ['kind', 'variables', 'candidates']) || !Array.isArray(s.candidates) || s.candidates.length === 0) break;
        variables(s.variables, path);
        return s.candidates.forEach((c, i) => {
          if (!record(c) || !keys(c, ['point', 'derivations']) || !Array.isArray(c.derivations) || c.derivations.length === 0 || !c.derivations.every(text)) return bad('Invalid candidate.', `${path}.candidates[${i}]`);
          points([c.point], scope, `${path}.candidates[${i}].point`);
        });
      default: return bad('Unknown set kind.', path);
    }
    bad(`Invalid ${s.kind} set.`, path);
  };
  const o = p.outcome, answer = record(o) && (o.kind === 'solved' || o.kind === 'empty');
  if (!record(o)) return bad('Invalid outcome.', '$.primary.outcome');
  switch (o.kind) {
    case 'solved': if (!keys(o, ['kind', 'set'])) bad('Invalid solved outcome.', '$.primary.outcome'); set(o.set, '$.primary.outcome.set'); break;
    case 'empty': if (!keys(o, ['kind'])) bad('Invalid empty outcome.', '$.primary.outcome'); break;
    case 'undecided': case 'unsupported': if (!keys(o, ['kind', 'reason']) || !text(o.reason)) bad(`Invalid ${o.kind} outcome.`, '$.primary.outcome'); break;
    case 'incomplete': if (!keys(o, ['kind', 'owner', 'reason']) || typeof o.owner !== 'string' || !OWNER.test(o.owner) || !text(o.reason)) bad('Invalid incomplete outcome.', '$.primary.outcome'); break;
    case 'stopped': if (!keys(o, ['kind', 'stop']) || !['work', 'allocation', 'cancelled', 'result-size'].includes(o.stop as string)) bad('Invalid stopped outcome.', '$.primary.outcome'); break;
    default: bad('Unknown outcome kind.', '$.primary.outcome');
  }
  if ((outcomeKind === 'success') !== answer) bad('outcomeKind is success exactly for solved and empty outcomes.', '$.outcomeKind');
  const v = p.provenance;
  if (!record(v) || !keys(v, ['verification', 'rules']) || !Array.isArray(v.rules) || !v.rules.every(text)
    || v.verification !== (answer ? 'independent' : 'not-applicable') || (!answer && v.rules.length)) bad('Invalid provenance.', '$.primary.provenance');
}
