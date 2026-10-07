import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import { DifferentialField, type DifferentialBounds } from '../../symbolic-engine/integration/core/differential-field';
import { FormalPrimitiveDomain, type QPolynomial } from '../../symbolic-engine/integration/core/formal-primitive';
import { fromRationalPrimitiveInput } from '../../symbolic-engine/integration/core/exponential-sum-bridge';
import type { ExponentialExpression as X, ExponentialNormalizationInput } from '../../symbolic-engine/integration/core/exponential-normalization-types';
import { parseIntegralSource, lowerRationalNode, fn, sym, UnsupportedIntegral } from './lowering';

export const INTEGRATION_BOUNDS: DifferentialBounds = Object.freeze({towerHeight: 8, artifactDepth: 64, artifactNodes: 100_000, artifactBytes: 16 * 1024 * 1024});

/** Raw source, exact atoms, explicit exclusions. No parser evaluation or printed-math readback. */
export function lowerExponentialIntegral(ctx: ExecutionContext, source: string, suppliedBase?: DifferentialField) {
  const {variable, integrand} = parseIntegralSource(ctx, source);
  const base = suppliedBase ?? DifferentialField.rationalFunctions(ctx, DifferentialField.rationals(ctx, INTEGRATION_BOUNDS), variable, INTEGRATION_BOUNDS);
  demand(base.kind === 'variable' && base.fractions!.ring.variable === variable, 'domain-mismatch', 'source differential binding');
  const native = new FormalPrimitiveDomain(variable, variable === 'z' ? 'r' : 'z');
  const restrictions: {expression: X; provenance: string}[] = [];
  const rationalNode = (node: unknown, path: string) => {
    const exclusions: QPolynomial[] = [];
    const value = lowerRationalNode(ctx, native, node, exclusions);
    exclusions.forEach((p, i) => {
      ctx.allocate(2);
      restrictions.push({expression: {kind: 'rational', value: fromRationalPrimitiveInput(ctx, base, native, native.fractions.make(ctx, p, native.x.one(ctx)))}, provenance: `${path}.exclusion.${i}`});
    });
    return fromRationalPrimitiveInput(ctx, base, native, value);
  };
  const visit = (node: unknown, path: string): X => {
    ctx.tick(); ctx.allocate(3); const f = fn(node);
    if (!f) return {kind: 'rational', value: rationalNode(node, path)};
    const [head, ...args] = f;
    if (head === 'Delimiter' && args.length >= 1) return visit(args[0], path);
    if (head === 'Exp' && args.length === 1) return {kind: 'exponential', value: rationalNode(args[0], `${path}.argument`)};
    if (head === 'Power' && args.length === 2) {
      if (variable !== 'e' && ['e', 'ExponentialE'].includes(sym(args[0]) ?? '')) return {kind: 'exponential', value: rationalNode(args[1], `${path}.argument`)};
      const exponent = rationalNode(args[1], `${path}.exponent`);
      demand(exponent.kind === 'fraction', 'domain-mismatch', 'power exponent');
      const n = exponent.value.numerator, d = exponent.value.denominator;
      if (n.coefficients.length > 1 || d.coefficients.length !== 1) throw new UnsupportedIntegral('Only integer powers and exponentials of rational arguments are supported.');
      const coefficient = n.coefficients[0];
      if (coefficient && (coefficient.kind !== 'scalar' || coefficient.value.denominator !== 1n)) throw new UnsupportedIntegral('Only integer powers are supported for general bases.');
      return {kind: 'power', value: visit(args[0], `${path}.base`), exponent: coefficient?.kind === 'scalar' ? coefficient.value.numerator : 0n};
    }
    if (head === 'Negate' && args.length === 1) return {kind: 'negate', value: visit(args[0], `${path}.0`)};
    if (['Add', 'Multiply', 'InvisibleOperator'].includes(String(head)) && args.length >= 2) {
      return args.slice(1).reduce<X>((left, right, i) => ({kind: head === 'Add' ? 'add' : 'multiply', left, right: visit(right, `${path}.${i + 1}`)}), visit(args[0], `${path}.0`));
    }
    const binary = head === 'Subtract' ? 'subtract' : head === 'Divide' || head === 'Rational' ? 'divide' : undefined;
    if (binary && args.length === 2) return {kind: binary, left: visit(args[0], `${path}.0`), right: visit(args[1], `${path}.1`)};
    throw new UnsupportedIntegral('Supported input uses rational arithmetic and exp(r) or e^r with rational arguments. Nested exponentials, logarithms and other functions are unsupported.');
  };
  const input: ExponentialNormalizationInput = {expression: visit(integrand, 'source'), restrictions};
  return {variable, base, native, input};
}
