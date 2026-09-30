import { demand, type ExecutionContext } from './execution';
import { DifferentialField, type DifferentialElement } from './differential-field';
import type { Polynomial } from './polynomial';

export interface DerivativeEvidence {
  readonly input: DifferentialElement;
  readonly derivative: DifferentialElement;
}

// Producing path: coefficient derivatives plus the polynomial chain rule.
function compute(ctx: ExecutionContext, owner: DifferentialField, a: DifferentialElement): DifferentialElement {
  owner.assert(ctx, a);
  if (a.kind === 'scalar') return owner.fromInteger(ctx, 0n);
  const ring = owner.fractions!.ring, field = owner.fractions!, parent = owner.parent!;
  const polynomial = (p: Polynomial<DifferentialElement>) => {
    ctx.allocate(p.coefficients.length);
    const coefficients = p.coefficients.map(c => compute(ctx, parent, c));
    return ring.add(ctx, ring.make(ctx, coefficients), ring.multiply(ctx, ring.derivative(ctx, p), owner.rule!));
  };
  const n = a.value.numerator, d = a.value.denominator;
  return owner.fraction(ctx, field.make(ctx, ring.subtract(ctx, ring.multiply(ctx, polynomial(n), d),
    ring.multiply(ctx, n, polynomial(d))), ring.multiply(ctx, d, d)));
}

type Pair = readonly [DifferentialElement, DifferentialElement];
/** Independent checker: Horner evaluation in dual numbers, no derivative calls. */
function dual(ctx: ExecutionContext, owner: DifferentialField, a: DifferentialElement): Pair {
  owner.assert(ctx, a); ctx.allocate(2);
  if (a.kind === 'scalar') return [a, owner.fromInteger(ctx, 0n)];
  const zero = owner.fromInteger(ctx, 0n), parent = owner.parent!;
  const add = (u: Pair, v: Pair): Pair => {
    ctx.allocate(2); return [owner.add(ctx, u[0], v[0]), owner.add(ctx, u[1], v[1])];
  };
  const multiply = (u: Pair, v: Pair): Pair => {
    ctx.allocate(2); return [owner.multiply(ctx, u[0], v[0]), owner.add(ctx,
      owner.multiply(ctx, u[0], v[1]), owner.multiply(ctx, u[1], v[0]))];
  };
  ctx.allocate(2);
  const t: Pair = [owner.generator(ctx), owner.make(ctx, owner.rule!.coefficients)];
  const evaluate = (p: Polynomial<DifferentialElement>): Pair => {
    ctx.allocate(2);
    let out: Pair = [zero, zero];
    for (let i = p.coefficients.length - 1; i >= 0; i--) {
      ctx.allocate(2); const c = dual(ctx, parent, p.coefficients[i]);
      out = add(multiply(out, t), [owner.embed(ctx, c[0]), owner.embed(ctx, c[1])]);
    }
    return out;
  };
  const n = evaluate(a.value.numerator), d = evaluate(a.value.denominator), inverse = owner.inverse(ctx, d[0]);
  ctx.allocate(2);
  return multiply(n, [inverse, owner.negate(ctx, owner.multiply(ctx, d[1], owner.multiply(ctx, inverse, inverse)))]);
}
function check(ctx: ExecutionContext, owner: DifferentialField, input: DifferentialElement, evidence: DerivativeEvidence): void {
  owner.assert(ctx, input); owner.assert(ctx, evidence.input); owner.assert(ctx, evidence.derivative);
  demand(owner.equal(ctx, input, evidence.input), 'verification-failed', 'derivative evidence input');
  const evaluated = dual(ctx, owner, input);
  demand(owner.equal(ctx, evaluated[0], input) && owner.equal(ctx, evaluated[1], evidence.derivative),
    'verification-failed', 'dual-number derivative identity');
}
export function verifyDerivative(ctx: ExecutionContext, owner: DifferentialField, input: DifferentialElement, evidence: DerivativeEvidence): void {
  ctx.operation(() => check(ctx, owner, input, evidence));
}
export function differentiate(ctx: ExecutionContext, owner: DifferentialField, input: DifferentialElement): DerivativeEvidence {
  return ctx.operation(() => {
    const derivative = compute(ctx, owner, input); ctx.allocate(2);
    const evidence = Object.freeze({ input, derivative }); check(ctx, owner, input, evidence); return evidence;
  });
}
