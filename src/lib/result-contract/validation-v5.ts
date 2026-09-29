import { exactArithmeticLatex } from './exact-arithmetic-latex';
import type { SerializableMathJson } from '../../types/calculator';
import type { CanonicalMathValueV2, CanonicalResultDocumentV5 } from '../../types/calculator';
import { inspectJsonCompatibleStructuredValue } from './structured-value';
import { CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_DEPTH, CANONICAL_RESULT_MAX_NODES,
  type CanonicalResultValidationLimits, type CanonicalResultValidationFailure } from './validation';
import { validateCanonicalResultDocumentV2 } from './validation-v2';

const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
const keys = (v: Record<string, unknown>, names: string[]) => Object.keys(v).length === names.length && names.every(n => Object.hasOwn(v, n));
const symbol = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z][A-Za-z0-9_]*$/.test(v) && v.length <= 64;

/** Restricted exact arithmetic grammar. Binding cannot be hidden in a math leaf. */
function arithmetic(v: unknown, symbols: string[]): boolean {
  if (typeof v === 'string') return symbols.includes(v);
  if (typeof v === 'number') return Number.isSafeInteger(v);
  if (record(v) && keys(v, ['num'])) return typeof v.num === 'string' && /^(0|-?[1-9][0-9]*)$/.test(v.num);
  if (!Array.isArray(v)) return false;
  const [head, ...args] = v;
  if (head === 'Power') return args.length === 2 && arithmetic(args[0], symbols)
    && typeof args[1] === 'number' && Number.isSafeInteger(args[1]) && args[1] >= 0;
  const arity = head === 'Negate' ? args.length === 1 : head === 'Divide' || head === 'Rational' ? args.length === 2
    : head === 'Add' || head === 'Multiply' ? args.length >= 2 : false;
  return arity && args.every(a => arithmetic(a, symbols));
}
/** Polynomial shape is checked here; square-freeness and identities remain producer proof obligations. */
function polynomialDegree(v: unknown, variable: string): number | null {
  if (typeof v === 'number') return Number.isSafeInteger(v) ? 0 : null;
  if (typeof v === 'string') return v === variable ? 1 : 0;
  if (record(v) && typeof v.num === 'string') return 0;
  if (!Array.isArray(v)) return null;
  const [head, ...args] = v;
  if (head === 'Divide' || head === 'Rational') {
    const numerator = args[0], denominator = args[1];
    const integer = (n: unknown) => typeof n === 'number' && Number.isSafeInteger(n) ? String(n) : record(n) && typeof n.num === 'string' ? n.num : null;
    const n = integer(numerator), d = integer(denominator);
    return n !== null && d !== null && d !== '0' ? 0 : null;
  }
  const degrees = args.map(a => polynomialDegree(a, variable));
  if (degrees.some(d => d === null)) return null;
  const ds = degrees as number[];
  if (head === 'Add') return Math.max(...ds);
  if (head === 'Multiply') return ds.reduce((a, b) => a + b, 0);
  if (head === 'Negate') return ds[0];
  if (head === 'Power' && typeof args[1] === 'number') return ds[0] * args[1];
  return null;
}
function isMonicModulus(v: unknown, variable: string, degree: number) {
  const leading = Array.isArray(v) && v[0] === 'Add' ? v.at(-1) : v;
  return degree === 1 ? leading === variable : Array.isArray(leading) && leading.length === 3
    && leading[0] === 'Power' && leading[1] === variable && leading[2] === degree;
}
export function collectCanonicalResultMathValuesV5(document: CanonicalResultDocumentV5) {
  const p = document.primary;
  return [
    { path: 'primary.rationalPart', value: p.rationalPart },
    ...p.terms.flatMap((t, i) => (['modulus', 'weight', 'argument', 'norm'] as const).map(k => ({path: `primary.terms[${i}].${k}`, value: t[k]}))),
    ...p.conditions.sourceExclusions.map((value, i) => ({path: `primary.conditions.sourceExclusions[${i}]`, value})),
    {path: 'primary.conditions.inputDenominator', value: p.conditions.inputDenominator},
    {path: 'primary.conditions.rationalDenominator', value: p.conditions.rationalDenominator},
    ...p.conditions.logNorms.map((value, i) => ({path: `primary.conditions.logNorms[${i}]`, value})),
  ];
}
export function validateCanonicalResultDocumentV5(input: unknown, limits: CanonicalResultValidationLimits = {}) {
  const fail = (message: string, path = '$.primary') => ({ok: false as const, failure: {reason: 'invalid-shape', message, path} as CanonicalResultValidationFailure});
  const inspection = inspectJsonCompatibleStructuredValue(input, {label: 'Canonical result V5',
    maxNodes: limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES, maxDepth: limits.maxDepth ?? CANONICAL_RESULT_MAX_DEPTH,
    maxBytes: limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES});
  if (!inspection.ok) return {ok: false as const, failure: inspection.failure};
  const doc: unknown = JSON.parse(inspection.serialized);
  if (!record(doc) || doc.version !== 5 || doc.outcomeKind !== 'success') return fail('V5 requires a successful rational primitive.');
  const p = doc.primary;
  if (!record(p) || !keys(p, ['kind', 'semantics', 'variable', 'integrationConstant', 'rationalPart', 'terms', 'conditions'])
    || p.kind !== 'rational-antiderivative' || p.semantics !== 'formal-local-complex'
    || !symbol(p.variable) || !symbol(p.integrationConstant) || p.variable === p.integrationConstant
    || !Array.isArray(p.terms) || p.terms.length === 0) return fail('Invalid V5 primary or variable binding.');
  const common = {...doc, version: 2}; Reflect.deleteProperty(common, 'primary');
  const base = validateCanonicalResultDocumentV2(common, limits);
  if (!base.ok) return base;
  let count = 0;
  function math(v: unknown, names: string[]): v is CanonicalMathValueV2 {
    count++;
    return record(v) && arithmetic(v.mathJson, names) && v.canonicalLatex === exactArithmeticLatex(v.mathJson as SerializableMathJson) && validateCanonicalResultDocumentV2({version: 2, outcomeKind: 'success', title: 'Exact component', warnings: [], primary: {kind: 'math', value: v}}, limits).ok;
  }
  const x = p.variable, used = new Set([x, p.integrationConstant]);
  if (!math(p.rationalPart, [x])) return fail('Invalid rational part.');
  for (const t of p.terms) {
    if (!record(t) || !keys(t, ['rootVariable', 'modulus', 'weight', 'argument', 'norm']) || !symbol(t.rootVariable)
      || used.has(t.rootVariable)) return fail('Invalid or captured root variable.');
    used.add(t.rootVariable);
    if (!math(t.modulus, [t.rootVariable]) || !math(t.weight, [t.rootVariable])
      || !math(t.argument, [x, t.rootVariable]) || !math(t.norm, [x])) return fail('Invalid root-log components.');
    const q = polynomialDegree(t.modulus.mathJson, t.rootVariable), w = polynomialDegree(t.weight.mathJson, t.rootVariable);
    const g = polynomialDegree(t.argument.mathJson, t.rootVariable);
    if (q === null || q < 1 || w === null || g === null || w >= q || g >= q
      || !isMonicModulus(t.modulus.mathJson, t.rootVariable, q)
      || polynomialDegree(t.argument.mathJson, x) === null || polynomialDegree(t.norm.mathJson, x) === null) return fail('Invalid polynomial domains or unreduced root coefficients.');
  }
  const c = p.conditions;
  if (!record(c) || !keys(c, ['sourceExclusions', 'inputDenominator', 'rationalDenominator', 'logNorms'])
    || !Array.isArray(c.sourceExclusions) || !Array.isArray(c.logNorms) || c.logNorms.length !== p.terms.length
    || !math(c.inputDenominator, [x]) || !math(c.rationalDenominator, [x])
    || !c.sourceExclusions.every(v => math(v, [x])) || !c.logNorms.every(v => math(v, [x]))) return fail('Invalid retained conditions.');
  if (c.logNorms.some((v, i) => JSON.stringify(v) !== JSON.stringify((p.terms as Record<string, unknown>[])[i].norm))) return fail('Log norm coverage differs.');
  return {ok: true as const, validated: {value: doc as unknown as CanonicalResultDocumentV5,
    nodeCount: inspection.nodeCount, depth: inspection.depth, byteLength: inspection.byteLength, mathValueCount: count + base.validated.mathValueCount}};
}
