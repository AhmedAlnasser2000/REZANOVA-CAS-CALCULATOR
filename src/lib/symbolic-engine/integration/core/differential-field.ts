import { demand, type ExecutionContext } from './execution';
import { rationalField, type ExactField } from './field';
import { copyAdmission, verifyAdmission, type FunctionAdmission } from './differential-admission';
import { rational, type Rational } from './rational';
import { PolynomialRing, type Polynomial } from './polynomial';
import { OwnedValidation } from './owned-validation';
import { RationalFunctionField, type RationalFunction } from './rational-function';

export interface DifferentialBounds {
  readonly towerHeight: number;
  readonly artifactDepth: number;
  readonly artifactNodes: number;
  readonly artifactBytes: number;
}
export function checkDifferentialBounds(ctx: ExecutionContext, bounds: DifferentialBounds): void {
  for (const key of ['towerHeight', 'artifactDepth', 'artifactNodes', 'artifactBytes'] as const) {
    ctx.tick();
    demand(Number.isSafeInteger(bounds[key]) && bounds[key] > 0, 'invalid-input', `differential bound ${key}`);
  }
}
export type DifferentialElement = Readonly<{ owner: DifferentialField } & (
  { kind: 'scalar'; value: Rational } | { kind: 'fraction'; value: RationalFunction<DifferentialElement> }
)>;

const constructionKey = Symbol('owned differential construction');
const owners = new WeakSet<object>();
/** Reject prototype-forged contexts before invoking private instance methods. */
export function assertDifferentialFieldOwner(ctx: ExecutionContext, owner: unknown): asserts owner is DifferentialField {
  ctx.tick(); demand(owner instanceof DifferentialField && owners.has(owner), 'domain-mismatch', 'differential field owner');
}

/** A wrapper makes recursive coefficients explicit without erasing their types. */
export class DifferentialField implements ExactField<DifferentialElement> {
  readonly capability = 'field' as const;
  readonly characteristic = 0 as const;
  readonly identity = Symbol('differential-field');
  readonly parent: DifferentialField | undefined;
  readonly fractions: RationalFunctionField<DifferentialElement> | undefined;
  readonly rule: Polynomial<DifferentialElement> | undefined;
  readonly height: number;
  readonly admission: FunctionAdmission | undefined;
  readonly kind: 'rational' | 'variable' | 'formal';
  readonly constantField: 'Q' | 'unestablished';
  #values = new WeakSet<object>();
  #validation = new OwnedValidation();
  private constructor(key: symbol, parent?: DifferentialField, fractions?: RationalFunctionField<DifferentialElement>,
    rule?: Polynomial<DifferentialElement>, kind: 'rational' | 'variable' | 'formal' = 'rational', admission?: FunctionAdmission) {
    demand(key === constructionKey, 'domain-mismatch', 'private differential constructor');
    owners.add(this);
    this.parent = parent; this.fractions = fractions; this.rule = rule;
    this.admission = admission;
    this.height = parent ? parent.height + 1 : 0; this.kind = kind;
    this.constantField = kind === 'formal' && !admission ? 'unestablished' : 'Q';
    Object.freeze(this);
  }
  static rationals(ctx: ExecutionContext, bounds: DifferentialBounds): DifferentialField {
    checkDifferentialBounds(ctx, bounds); ctx.allocate(10); return new DifferentialField(constructionKey);
  }
  static rationalFunctions(ctx: ExecutionContext, base: DifferentialField, variable: string,
    bounds: DifferentialBounds): DifferentialField {
    demand(base instanceof DifferentialField && owners.has(base) && base.kind === 'rational', 'domain-mismatch', 'Q(x) requires owned Q');
    return DifferentialField.extend(ctx, base, variable, [base.fromInteger(ctx, 1n)], bounds, 'variable');
  }
  static formal(ctx: ExecutionContext, parent: DifferentialField, variable: string,
    rule: readonly DifferentialElement[], bounds: DifferentialBounds): DifferentialField {
    return DifferentialField.extend(ctx, parent, variable, rule, bounds, 'formal');
  }
  static certified(ctx: ExecutionContext, parent: DifferentialField, variable: string,
    rule: readonly DifferentialElement[], bounds: DifferentialBounds, evidence: FunctionAdmission): DifferentialField {
    const formal = DifferentialField.formal(ctx, parent, variable, rule, bounds);
    const admission = copyAdmission(ctx, evidence);
    verifyAdmission(ctx, formal, admission);
    ctx.allocate(10);
    return new DifferentialField(constructionKey, parent, formal.fractions, formal.rule, 'formal', admission);
  }
  private static extend(ctx: ExecutionContext, parent: DifferentialField, variable: string,
    coefficients: readonly DifferentialElement[], bounds: DifferentialBounds, kind: 'variable' | 'formal'): DifferentialField {
    checkDifferentialBounds(ctx, bounds);
    demand(parent instanceof DifferentialField && owners.has(parent), 'domain-mismatch', 'differential parent');
    if (parent.height >= bounds.towerHeight) ctx.exhaust('tower-height');
    ctx.degree(coefficients.length - 1); ctx.allocate(12);
    const ring = new PolynomialRing(parent, variable), fractions = new RationalFunctionField(ring);
    return new DifferentialField(constructionKey, parent, fractions, ring.make(ctx, coefficients), kind);
  }
  assert(ctx: ExecutionContext, a: DifferentialElement): void {
    ctx.tick();
    demand(a !== null && typeof a === 'object' && this.#values.has(a), 'domain-mismatch', 'differential element owner');
    // All registered values recursively contain only owned immutable values.
    // Membership is checked above; custom coefficient domains cannot opt in.
    this.#validation.check(ctx, a, () => {
      if (a.kind === 'scalar') rationalField.assert(ctx, a.value);
      else this.fractions!.assert(ctx, a.value);
    });
  }
  scalar(ctx: ExecutionContext, value: Rational): DifferentialElement {
    demand(this.kind === 'rational', 'domain-mismatch', 'scalar requires Q owner');
    rationalField.assert(ctx, value); ctx.allocate(3);
    const result = Object.freeze({ owner: this, kind: 'scalar' as const, value });
    this.#values.add(result); return result;
  }
  fraction(ctx: ExecutionContext, value: RationalFunction<DifferentialElement>): DifferentialElement {
    demand(this.fractions !== undefined, 'domain-mismatch', 'fraction requires extension');
    this.fractions.assert(ctx, value); ctx.allocate(3);
    const result = Object.freeze({ owner: this, kind: 'fraction' as const, value });
    this.#values.add(result); return result;
  }
  fromInteger(ctx: ExecutionContext, n: bigint): DifferentialElement {
    return this.parent ? this.embed(ctx, this.parent.fromInteger(ctx, n)) : this.scalar(ctx, rational(ctx, n));
  }
  /** Only ancestors embed. Equal printed names never establish an embedding. */
  embed(ctx: ExecutionContext, a: DifferentialElement): DifferentialElement {
    demand(a?.owner instanceof DifferentialField && owners.has(a.owner), 'domain-mismatch', 'embedding source');
    a.owner.assert(ctx, a);
    if (a.owner === this) return a;
    demand(this.parent !== undefined, 'domain-mismatch', 'not an ancestor field');
    return this.fraction(ctx, this.fractions!.fromCoefficient(ctx, this.parent.embed(ctx, a)));
  }
  generator(ctx: ExecutionContext): DifferentialElement {
    demand(this.parent !== undefined, 'domain-mismatch', 'Q has no generator');
    return this.make(ctx, [this.parent.fromInteger(ctx, 0n), this.parent.fromInteger(ctx, 1n)]);
  }
  make(ctx: ExecutionContext, numerator: readonly DifferentialElement[], denominator?: readonly DifferentialElement[]): DifferentialElement {
    demand(this.fractions !== undefined, 'domain-mismatch', 'polynomial requires extension');
    const ring = this.fractions.ring;
    return this.fraction(ctx, this.fractions.make(ctx, ring.make(ctx, numerator), denominator ? ring.make(ctx, denominator) : ring.one(ctx)));
  }
  add(ctx: ExecutionContext, a: DifferentialElement, b: DifferentialElement): DifferentialElement {
    this.assert(ctx, a); this.assert(ctx, b);
    if (a.kind === 'scalar' && b.kind === 'scalar') return this.scalar(ctx, rationalField.add(ctx, a.value, b.value));
    demand(a.kind === 'fraction' && b.kind === 'fraction', 'domain-mismatch', 'fraction operands');
    return this.fraction(ctx, this.fractions!.add(ctx, a.value, b.value));
  }
  multiply(ctx: ExecutionContext, a: DifferentialElement, b: DifferentialElement): DifferentialElement {
    this.assert(ctx, a); this.assert(ctx, b);
    if (a.kind === 'scalar' && b.kind === 'scalar') return this.scalar(ctx, rationalField.multiply(ctx, a.value, b.value));
    demand(a.kind === 'fraction' && b.kind === 'fraction', 'domain-mismatch', 'fraction operands');
    return this.fraction(ctx, this.fractions!.multiply(ctx, a.value, b.value));
  }
  negate(ctx: ExecutionContext, a: DifferentialElement): DifferentialElement {
    this.assert(ctx, a);
    return a.kind === 'scalar' ? this.scalar(ctx, rationalField.negate(ctx, a.value))
      : this.fraction(ctx, this.fractions!.negate(ctx, a.value));
  }
  subtract(ctx: ExecutionContext, a: DifferentialElement, b: DifferentialElement): DifferentialElement { return this.add(ctx, a, this.negate(ctx, b)); }
  inverse(ctx: ExecutionContext, a: DifferentialElement): DifferentialElement {
    this.assert(ctx, a);
    return a.kind === 'scalar' ? this.scalar(ctx, rationalField.inverse(ctx, a.value))
      : this.fraction(ctx, this.fractions!.inverse(ctx, a.value));
  }
  exactDivide(ctx: ExecutionContext, a: DifferentialElement, b: DifferentialElement): DifferentialElement {
    const q = this.multiply(ctx, a, this.inverse(ctx, b));
    demand(this.equal(ctx, this.multiply(ctx, q, b), a), 'verification-failed', 'differential division'); return q;
  }
  equal(ctx: ExecutionContext, a: DifferentialElement, b: DifferentialElement): boolean {
    this.assert(ctx, a); this.assert(ctx, b);
    if (a.kind === 'scalar' && b.kind === 'scalar') return rationalField.equal(ctx, a.value, b.value);
    demand(a.kind === 'fraction' && b.kind === 'fraction', 'domain-mismatch', 'fraction equality');
    return this.fractions!.equal(ctx, a.value, b.value);
  }
  isZero(ctx: ExecutionContext, a: DifferentialElement): boolean {
    this.assert(ctx, a); return a.kind === 'scalar' ? rationalField.isZero(ctx, a.value) : this.fractions!.isZero(ctx, a.value);
  }
}
