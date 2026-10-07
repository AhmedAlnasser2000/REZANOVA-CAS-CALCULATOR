import type { SerializableMathJson as Tree } from '../../../types/calculator';
import { exactIntegrationMathLatex } from '../../result-contract/current/integration-schema';
import { requireProvenCanonicalMathValueV2 } from '../../result-contract/proven-answer-mathjson';
import { demand, type ExecutionContext } from '../../symbolic-engine/integration/core/execution';
import type { DifferentialField, DifferentialElement as E } from '../../symbolic-engine/integration/core/differential-field';
import type { Polynomial, PolynomialRing } from '../../symbolic-engine/integration/core/polynomial';
import { rational } from '../../symbolic-engine/integration/core/rational';
import { rationalTree } from './exact-math';
import { polynomialTree, treeFraction } from './exact-math';
import { FormalPrimitiveDomain, type QPolynomial } from '../../symbolic-engine/integration/core/formal-primitive';

export type FieldBindings = ReadonlyMap<DifferentialField, string>;
export function freshName(base: string, used: Set<string>): string {
  let name = base, i = 0;
  while (used.has(name)) name = `${base}_${++i}`;
  used.add(name); return name;
}
export function integrationMath(ctx: ExecutionContext, tree: Tree) {
  const serialized = JSON.stringify(tree); ctx.allocate(serialized.length * 4); ctx.tick(serialized.length);
  return requireProvenCanonicalMathValueV2({mathJson: tree, canonicalLatex: exactIntegrationMathLatex(tree),
    owner: 'calculus', routeId: 'calculus.integrals', source: 'New Integration checked native projection'});
}
export function powersTree(ctx: ExecutionContext, coefficients: readonly Tree[], variable: string): Tree {
  ctx.allocate(coefficients.length * 8);
  const parts: Tree[] = [];
  coefficients.forEach((coefficient, i) => {
    ctx.tick(); if (typeof coefficient === 'object' && !Array.isArray(coefficient) && coefficient && 'num' in coefficient && coefficient.num === '0') return;
    const power: Tree = i === 1 ? variable : ['Power', variable, i];
    const one = typeof coefficient === 'object' && !Array.isArray(coefficient) && coefficient && 'num' in coefficient && coefficient.num === '1';
    parts.push(i === 0 ? coefficient : one ? power : ['Multiply', coefficient, power]);
  });
  return parts.length === 0 ? {num: '0'} : parts.length === 1 ? parts[0] : ['Add', ...parts];
}
/** Recursive projection follows exact owners, not their printed indeterminate names. */
export function elementTree(ctx: ExecutionContext, value: E, bindings: FieldBindings): Tree {
  value.owner.assert(ctx, value);
  if (value.kind === 'scalar') return rationalTree(value.value);
  const variable = bindings.get(value.owner);
  demand(variable !== undefined, 'domain-mismatch', 'unbound projection owner');
  const p = (a: readonly E[]) => powersTree(ctx, a.map(c => elementTree(ctx, c, bindings)), variable);
  const n = p(value.value.numerator.coefficients), d = p(value.value.denominator.coefficients);
  return typeof d === 'object' && !Array.isArray(d) && d && 'num' in d && d.num === '1' ? n : ['Divide', n, d];
}
function integer(ctx: ExecutionContext, tree: Tree): bigint {
  const text = typeof tree === 'number' ? String(tree) : tree && typeof tree === 'object' && !Array.isArray(tree) && 'num' in tree ? String(tree.num) : '';
  demand(/^(0|-?[1-9][0-9]*)$/.test(text), 'verification-failed', 'projection integer');
  ctx.integerText(text); const n = BigInt(text); ctx.integer(n); return n;
}
function scalarOwner(field: DifferentialField): DifferentialField { return field.parent ? scalarOwner(field.parent) : field; }
export function elementFromTree(ctx: ExecutionContext, field: DifferentialField, tree: Tree, bindings: FieldBindings): E {
  ctx.tick();
  if (typeof tree === 'string') {
    const owner = [...bindings].find(([, name]) => name === tree)?.[0];
    demand(owner !== undefined, 'verification-failed', 'projection symbol scope');
    return field.embed(ctx, owner.generator(ctx));
  }
  if (!Array.isArray(tree)) return field.fromInteger(ctx, integer(ctx, tree));
  const [head, ...args] = tree, r = (i: number) => elementFromTree(ctx, field, args[i], bindings);
  if (head === 'Add' || head === 'Multiply') return args.reduce<E>((a, b) => head === 'Add'
    ? field.add(ctx, a, elementFromTree(ctx, field, b, bindings)) : field.multiply(ctx, a, elementFromTree(ctx, field, b, bindings)), field.fromInteger(ctx, head === 'Add' ? 0n : 1n));
  if (head === 'Negate') return field.negate(ctx, r(0));
  if (head === 'Divide' || head === 'Rational') return field.exactDivide(ctx, r(0), r(1));
  if (head === 'Power') {
    let n = integer(ctx, args[1]), base = r(0), out = field.fromInteger(ctx, 1n);
    if (n < 0n) {base = field.inverse(ctx, base); n = -n;}
    while (n > 0n) {ctx.tick(); if (n % 2n) out = field.multiply(ctx, out, base); n /= 2n; if (n) base = field.multiply(ctx, base, base);}
    return out;
  }
  throw new Error('Unsupported projected field operator.');
}
export function projectElement(ctx: ExecutionContext, field: DifferentialField, value: E, bindings: FieldBindings) {
  field.assert(ctx, value); const tree = elementTree(ctx, value, bindings);
  demand(field.equal(ctx, value, elementFromTree(ctx, field, tree, bindings)), 'verification-failed', 'exact field projection');
  return integrationMath(ctx, tree);
}
export function projectFieldPolynomial(ctx: ExecutionContext, ring: PolynomialRing<E>, value: Polynomial<E>, variable: string, bindings: FieldBindings) {
  ring.assert(ctx, value);
  const tree = powersTree(ctx, value.coefficients.map(c => elementTree(ctx, c, bindings)), variable);
  const read = (v: Tree): Polynomial<E> => {
    ctx.tick(); if (v === variable) return ring.make(ctx, [ring.domain.fromInteger(ctx, 0n), ring.domain.fromInteger(ctx, 1n)]);
    if (Array.isArray(v)) {
      const [head, ...a] = v;
      if (head === 'Add' || head === 'Multiply') return a.reduce<Polynomial<E>>((acc, item) => head === 'Add' ? ring.add(ctx, acc, read(item)) : ring.multiply(ctx, acc, read(item)), head === 'Add' ? ring.zero(ctx) : ring.one(ctx));
      if (head === 'Power' && a[0] === variable) {
        const n = integer(ctx, a[1]); demand(n >= 0n && n <= BigInt(ctx.limits.degree), 'verification-failed', 'root power');
        return ring.power(ctx, ring.make(ctx, [ring.domain.fromInteger(ctx, 0n), ring.domain.fromInteger(ctx, 1n)]), Number(n));
      }
    }
    return ring.constant(ctx, elementFromTree(ctx, ring.domain as DifferentialField, v, bindings));
  };
  demand(ring.equal(ctx, value, read(tree)), 'verification-failed', 'root polynomial projection');
  return integrationMath(ctx, tree);
}
export function projectRationalCoefficient(ctx: ExecutionContext, field: DifferentialField, numerator: bigint, denominator: bigint) {
  return field.embed(ctx, scalarOwner(field).scalar(ctx, rational(ctx, numerator, denominator)));
}
export function projectQPolynomial(ctx: ExecutionContext, value: QPolynomial, variable: string) {
  value.ring.assert(ctx, value);
  const owner = new FormalPrimitiveDomain(variable, variable === 'z' ? 'r' : 'z');
  const tree = polynomialTree(ctx, value, variable), polynomial = owner.x.make(ctx, value.coefficients);
  demand(owner.fractions.equal(ctx, treeFraction(ctx, owner, tree), owner.fractions.make(ctx, polynomial, owner.x.one(ctx))),
    'verification-failed', 'exact constant polynomial projection');
  return integrationMath(ctx, tree);
}
