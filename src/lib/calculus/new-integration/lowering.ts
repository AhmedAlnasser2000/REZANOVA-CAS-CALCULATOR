import { ComputeEngine } from '@cortex-js/compute-engine';
import { AlgebraError, demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { FormalPrimitiveDomain, type QPolynomial, type QRationalFunction } from '../../symbolic-engine/integration/core/formal-primitive';
import { rational } from '../../symbolic-engine/integration/core/rational';
import { boundedSource } from './types';

export class UnsupportedIntegral extends Error {}
function unsupported(message: string): never {throw new UnsupportedIntegral(message);}
const rec = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);
export const fn = (v: unknown): unknown[] | undefined => Array.isArray(v) ? v : rec(v) && Array.isArray(v.fn) ? v.fn : undefined;
export const sym = (v: unknown): string | undefined => typeof v === 'string' ? v : rec(v) && typeof v.sym === 'string' ? v.sym : undefined;
export const num = (v: unknown): string | undefined => rec(v) && typeof v.num === 'string' ? v.num : undefined;

export function parseIntegralSource(ctx: ExecutionContext, source: string) {
  demand(boundedSource(source), 'resource-limit', 'source exceeds 64 KiB'); ctx.allocate(source.length * 4); ctx.tick(source.length);
  const ce = new ComputeEngine();
  const tree = ce.parse(source, {form: 'raw', parseNumbers: 'decimal'}).toMathJson({shorthands: [], fractionalDigits: 'max', prettify: false});
  let nodes = 0, integralCount = 0;
  function scan(v: unknown, depth: number) {
    ctx.tick(); demand(++nodes <= 10_000 && depth <= 64, 'resource-limit', 'expression structure');
    const f = fn(v); if (f) {if (f[0] === 'Integrate') integralCount++; for (const a of f.slice(1)) scan(a, depth + 1);}
  }
  scan(tree, 0);
  const top = fn(tree);
  if (!top || top[0] !== 'Integrate') unsupported('Enter one explicit indefinite integral. For a bare expression, use Insert Integral.');
  if (integralCount !== 1 || top.length !== 3) unsupported('Only one explicit indefinite integral is executable here.');
  const variable = sym(top[2]);
  if (!variable || !/^[A-Za-z][A-Za-z0-9_]*$/.test(variable) || variable.length > 64 || ['Nothing', 'Pi', 'ExponentialE', 'ImaginaryUnit', 'Infinity', 'NaN'].includes(variable)) unsupported('Use an explicit differential, such as dx. Bounds, missing or ambiguous differentials are unsupported.');
  return {variable, integrand: top[1]};
}

export function lowerRationalNode(ctx: ExecutionContext, owner: FormalPrimitiveDomain, tree: unknown, exclusions: QPolynomial[] = []) {
  const variable = owner.x.variable;
  const f = owner.fractions;
  function exclude(v: QRationalFunction) {
    demand(!f.isZero(ctx, v), 'division-by-zero', 'identically zero source divisor');
    ctx.allocate(1); exclusions.push(v.numerator);
  }
  function literal(text: string) {
    const m = /^([+-]?)(\d+)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(text);
    demand(m !== null, 'invalid-input', 'expected exact finite numeric literal');
    const exponentText = m[4] ?? '0';
    demand(exponentText.length <= 8, 'resource-limit', 'decimal exponent');
    const exponent = Number(exponentText) - (m[3]?.length ?? 0);
    demand(Number.isSafeInteger(exponent) && Math.abs(exponent) <= ctx.limits.integerBits, 'resource-limit', 'decimal exponent');
    const digits = (m[2] + (m[3] ?? '')).replace(/^0+(?=\d)/, ''); ctx.integerText(digits);
    let scale = 1n;
    for (let i = 0; i < Math.abs(exponent); i++) scale = ctx.multiply(scale, 10n);
    const n = rational(ctx, (m[1] === '-' && digits !== '0' ? '-' : '') + digits);
    return f.fromCoefficient(ctx, exponent >= 0 ? rational(ctx, ctx.multiply(n.numerator, scale)) : rational(ctx, n.numerator, scale));
  }
  function visit(v: unknown): QRationalFunction {
    ctx.tick(); const text = num(v); if (text !== undefined) return literal(text);
    const s = sym(v);
    if (s === variable) return f.make(ctx, owner.x.make(ctx, [rational(ctx, 0n), rational(ctx, 1n)]), owner.x.one(ctx));
    if (s) return unsupported(`Only the integration variable ${variable} and rational coefficients are supported.`);
    const a = fn(v); if (!a) return unsupported('Unsupported expression.');
    const [h, ...args] = a;
    if (h === 'Delimiter' && args.length >= 1) return visit(args[0]);
    if (h === 'Negate' && args.length === 1) return f.negate(ctx, visit(args[0]));
    if ((h === 'Add' || h === 'Multiply' || h === 'InvisibleOperator') && args.length >= 2) return args.reduce<QRationalFunction>((acc, t) => h === 'Add' ? f.add(ctx, acc, visit(t)) : f.multiply(ctx, acc, visit(t)), f.fromInteger(ctx, h === 'Add' ? 0n : 1n));
    if (h === 'Subtract' && args.length === 2) return f.subtract(ctx, visit(args[0]), visit(args[1]));
    if ((h === 'Divide' || h === 'Rational') && args.length === 2) {
      const a = visit(args[0]), b = visit(args[1]); exclude(b); return f.exactDivide(ctx, a, b);
    }
    if (h === 'Power' && args.length === 2) {
      const baseValue = visit(args[0]), exponent = visit(args[1]);
      if (owner.x.degree(ctx, exponent.numerator) > 0 || owner.x.degree(ctx, exponent.denominator) !== 0) return unsupported('Only integer powers are supported.');
      const e = exponent.numerator.coefficients[0] ?? rational(ctx, 0n);
      if (e.denominator !== 1n) return unsupported('Only integer powers are supported.');
      let n = e.numerator;
      if (n === 0n && f.isZero(ctx, baseValue)) throw new AlgebraError('invalid-input', 'zero to zero power');
      let base = baseValue;
      if (n < 0n) {exclude(base); base = f.inverse(ctx, base); n = -n;}
      let out = f.fromInteger(ctx, 1n);
      while (n > 0n) {ctx.tick(); if (n % 2n) out = f.multiply(ctx, out, base); n /= 2n; if (n) base = f.multiply(ctx, base, base);}
      return out;
    }
    return unsupported('This workspace currently executes rational arithmetic and integer powers only.');
  }
  return visit(tree);
}

export function lowerIntegral(ctx: ExecutionContext, source: string, suppliedOwner?: FormalPrimitiveDomain) {
  const {variable, integrand} = parseIntegralSource(ctx, source);
  const owner = suppliedOwner ?? new FormalPrimitiveDomain(variable, variable === 'z' ? 'r' : 'z');
  demand(owner.x.variable === variable, 'domain-mismatch', 'integration variable mismatch');
  const exclusions: QPolynomial[] = [];
  const input = lowerRationalNode(ctx, owner, integrand, exclusions);
  return {owner, input, exclusions, variable};
}
