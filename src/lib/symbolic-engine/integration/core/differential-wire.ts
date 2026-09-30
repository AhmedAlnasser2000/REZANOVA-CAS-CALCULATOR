import { inspectExactArtifact as inspect } from './artifact-bounds';
import { demand, type ExecutionContext } from './execution';
import { DifferentialField, checkDifferentialBounds, type DifferentialBounds, type DifferentialElement as E } from './differential-field';
import { verifyDerivative, type DerivativeEvidence } from './differential-derivative';
import { verifyAdmission, type FunctionAdmission } from './differential-admission';
import { rational } from './rational';
import type { Polynomial } from './polynomial';
import type { SquareFreeDecomposition } from './polynomial-square-free';

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
export interface DifferentialArtifactSelection {
  readonly elements: readonly E[];
  readonly derivatives: readonly DerivativeEvidence[];
}
export interface DifferentialArtifactReplay extends DifferentialArtifactSelection { readonly owner: DifferentialField }

function record(v: unknown, keys: readonly string[]): Record<string, unknown> {
  demand(v !== null && typeof v === 'object' && !Array.isArray(v), 'invalid-input', 'artifact record');
  demand(Object.keys(v).length === keys.length && keys.every(k => Object.hasOwn(v, k)), 'invalid-input', 'artifact record keys');
  return v as Record<string, unknown>;
}
function array(v: unknown): unknown[] { demand(Array.isArray(v), 'invalid-input', 'artifact array'); return v; }
function text(v: unknown): string { demand(typeof v === 'string', 'invalid-input', 'artifact string'); return v; }
function integer(ctx: ExecutionContext, v: unknown): bigint {
  const s = text(v); ctx.integerText(s);
  demand(/^(0|-?[1-9][0-9]*)$/.test(s), 'invalid-input', 'artifact integer');
  const n = BigInt(s); ctx.integer(n); return n;
}
function tower(ctx: ExecutionContext, owner: DifferentialField, bounds: DifferentialBounds): DifferentialField[] {
  const result: DifferentialField[] = [];
  for (let p: DifferentialField | undefined = owner; p; p = p.parent) {
    ctx.tick(); if (result.length > bounds.towerHeight) ctx.exhaust('tower-height');
    ctx.allocate(1); result.push(p);
  }
  return result.reverse();
}
function writer(ctx: ExecutionContext, owners: readonly DifferentialField[], bounds: DifferentialBounds) {
  let nodes = 0;
  const enter = (depth: number) => {
    ctx.tick(); if (++nodes > bounds.artifactNodes) ctx.exhaust('differential-artifact-nodes');
    if (depth > bounds.artifactDepth) ctx.exhaust('differential-artifact-depth');
  };
  const number = (n: bigint) => { const bits = ctx.integer(n); ctx.allocate(bits + 1); return n.toString(); };
  const element = (a: E, depth = 0): Json => {
    enter(depth); demand(owners[a.owner.height] === a.owner, 'domain-mismatch', 'artifact element tower');
    a.owner.assert(ctx, a); ctx.allocate(4);
    if (a.kind === 'scalar') return { level: 0, scalar: [number(a.value.numerator), number(a.value.denominator)] };
    ctx.allocate(a.value.numerator.coefficients.length + a.value.denominator.coefficients.length);
    return { level: a.owner.height, numerator: a.value.numerator.coefficients.map(c => element(c, depth + 1)),
      denominator: a.value.denominator.coefficients.map(c => element(c, depth + 1)) };
  };
  const polynomial = (p: Polynomial<E>): Json => {
    ctx.allocate(p.coefficients.length); return p.coefficients.map(c => element(c));
  };
  const derivative = (d: DerivativeEvidence): Json => {
    ctx.allocate(2); return { input: element(d.input), derivative: element(d.derivative) };
  };
  const decomposition = (d: SquareFreeDecomposition<E>): Json => {
    ctx.allocate(2 + 3 * d.factors.length);
    return { scalar: element(d.scalar), factors: d.factors.map(f => ({ factor: polynomial(f.factor), multiplicity: f.multiplicity })) };
  };
  const admission = (a: FunctionAdmission): Json => {
    ctx.allocate(12 + a.conditions.length);
    const common = { kind: a.kind, argument: element(a.argument), derivative: derivative(a.derivative),
      denominator: decomposition(a.denominator), conditions: a.conditions.map(polynomial) };
    if (a.kind === 'exponential') {
      ctx.allocate(a.arguments.length + a.exponents.length);
      return { ...common, obstruction: a.obstruction, arguments: a.arguments.map(e => element(e)), exponents: a.exponents.map(number) };
    }
    return { ...common, semantics: a.semantics, numerator: decomposition(a.numerator), residueSide: a.residueSide, residue: number(a.residue) };
  };
  const construction = (): Json => {
    ctx.allocate(owners.length);
    return owners.map((o): Json => {
      ctx.allocate(4);
      if (!o.parent) return { kind: 'rational' };
      return { kind: o.kind, variable: o.fractions!.ring.variable, rule: polynomial(o.rule!), admission: o.admission ? admission(o.admission) : null };
    });
  };
  return { element, derivative, construction };
}
function encode(ctx: ExecutionContext, owner: DifferentialField, selection: DifferentialArtifactSelection, bounds: DifferentialBounds): Json {
  checkDifferentialBounds(ctx, bounds);
  const owners = tower(ctx, owner, bounds);
  for (const o of owners) if (o.admission) verifyAdmission(ctx, o, o.admission);
  const w = writer(ctx, owners, bounds);
  ctx.allocate(selection.elements.length + selection.derivatives.length + 5);
  for (const d of selection.derivatives) verifyDerivative(ctx, d.input.owner, d.input, d);
  const result = { tag: 'differential-field-artifact', version: 1, construction: w.construction(),
    elements: selection.elements.map(e => w.element(e)), derivatives: selection.derivatives.map(w.derivative) };
  inspect(ctx, bounds, result); return result;
}
export function encodeDifferentialArtifact(ctx: ExecutionContext, owner: DifferentialField,
  selection: DifferentialArtifactSelection, bounds: DifferentialBounds): unknown {
  return ctx.operation(() => encode(ctx, owner, selection, bounds));
}

/** Rebuild owned values and replay claims. No differentiation or admission producers. */
export function decodeDifferentialArtifact(ctx: ExecutionContext, expected: DifferentialField, data: unknown,
  bounds: DifferentialBounds): DifferentialArtifactReplay {
  return ctx.operation(() => {
    checkDifferentialBounds(ctx, bounds); inspect(ctx, bounds, data);
    const root = record(data, ['tag', 'version', 'construction', 'elements', 'derivatives']);
    demand(root.tag === 'differential-field-artifact' && root.version === 1, 'invalid-input', 'differential artifact version');
    const descriptors = array(root.construction), owners: DifferentialField[] = [];
    if (descriptors.length > bounds.towerHeight + 1) ctx.exhaust('tower-height');
    demand(descriptors.length > 0, 'invalid-input', 'empty field construction'); ctx.allocate(descriptors.length);
    const element = (v: unknown, expectedLevel?: number): E => {
      demand(v !== null && typeof v === 'object', 'invalid-input', 'artifact element');
      const r = record(v, Object.hasOwn(v, 'scalar') ? ['level', 'scalar'] : ['level', 'numerator', 'denominator']);
      demand(typeof r.level === 'number' && Number.isSafeInteger(r.level) && r.level >= 0 && r.level < owners.length
        && (expectedLevel === undefined || expectedLevel === r.level), 'domain-mismatch', 'forward or incompatible field reference');
      const o = owners[r.level];
      if (r.level === 0) {
        const pair = array(r.scalar); demand(pair.length === 2, 'invalid-input', 'rational pair');
        const n = integer(ctx, pair[0]), d = integer(ctx, pair[1]), q = rational(ctx, n, d);
        demand(q.numerator === n && q.denominator === d, 'invalid-input', 'noncanonical rational');
        return o.scalar(ctx, q);
      }
      const n = array(r.numerator), d = array(r.denominator); ctx.degree(Math.max(n.length, d.length) - 1);
      ctx.allocate(n.length + d.length);
      const numerator = n.map(c => element(c, o.height - 1)), denominator = d.map(c => element(c, o.height - 1));
      const result = o.make(ctx, numerator, denominator);
      demand(result.kind === 'fraction', 'invalid-input', 'fraction encoding');
      // make normalizes; accepting a changed representation would admit malleable artifacts.
      const ring = o.fractions!.ring;
      demand(result.value.numerator.coefficients.length === numerator.length && result.value.denominator.coefficients.length === denominator.length
        && ring.equal(ctx, result.value.numerator, ring.make(ctx, numerator))
        && ring.equal(ctx, result.value.denominator, ring.make(ctx, denominator)), 'invalid-input', 'noncanonical fraction');
      return result;
    };
    const polynomial = (v: unknown, o: DifferentialField): Polynomial<E> => {
      const cs = array(v); ctx.degree(cs.length - 1); ctx.allocate(cs.length);
      const result = o.fractions!.ring.make(ctx, cs.map(c => element(c, o.height - 1)));
      demand(result.coefficients.length === cs.length, 'invalid-input', 'noncanonical polynomial'); return result;
    };
    const derivative = (v: unknown, level?: number): DerivativeEvidence => {
      const r = record(v, ['input', 'derivative']); ctx.allocate(2);
      return Object.freeze({ input: element(r.input, level), derivative: element(r.derivative, level) });
    };
    const decomposition = (v: unknown, o: DifferentialField): SquareFreeDecomposition<E> => {
      const r = record(v, ['scalar', 'factors']), factors = array(r.factors); ctx.allocate(2 + 3 * factors.length);
      return Object.freeze({ scalar: element(r.scalar, o.height - 1), factors: Object.freeze(factors.map(v => {
        const f = record(v, ['factor', 'multiplicity']);
        demand(typeof f.multiplicity === 'number' && Number.isSafeInteger(f.multiplicity) && f.multiplicity > 0,
          'invalid-input', 'factor multiplicity'); ctx.degree(f.multiplicity);
        return Object.freeze({ factor: polynomial(f.factor, o), multiplicity: f.multiplicity });
      })) });
    };
    const admission = (v: unknown, o: DifferentialField): FunctionAdmission => {
      demand(v !== null && typeof v === 'object' && 'kind' in v, 'invalid-input', 'admission record');
      const exponential = v.kind === 'exponential';
      const r = record(v, ['kind', 'argument', 'derivative', 'denominator', 'conditions', ...(exponential
        ? ['obstruction', 'arguments', 'exponents'] : ['semantics', 'numerator', 'residueSide', 'residue'])]);
      const cs = array(r.conditions); ctx.allocate(12 + cs.length);
      const common = { argument: element(r.argument, o.height), derivative: derivative(r.derivative, o.height),
        denominator: decomposition(r.denominator, o), conditions: Object.freeze(cs.map(c => polynomial(c, o))) };
      if (exponential) {
        demand(r.obstruction === 'finite-pole' || r.obstruction === 'polynomial-part', 'invalid-input', 'exponential obstruction');
        const args = array(r.arguments), ns = array(r.exponents); ctx.allocate(args.length + ns.length);
        return Object.freeze({ ...common, kind: 'exponential', obstruction: r.obstruction,
          arguments: Object.freeze(args.map(a => element(a, o.height))), exponents: Object.freeze(ns.map(n => integer(ctx, n))) });
      }
      demand(r.kind === 'logarithmic' && r.semantics === 'chosen-local-log'
        && (r.residueSide === 'numerator' || r.residueSide === 'denominator'), 'invalid-input', 'log admission');
      return Object.freeze({ ...common, kind: 'logarithmic', semantics: r.semantics, residueSide: r.residueSide,
        residue: integer(ctx, r.residue), numerator: decomposition(r.numerator, o) });
    };
    for (let i = 0; i < descriptors.length; i++) {
      ctx.tick();
      if (i === 0) {
        const r = record(descriptors[i], ['kind']); demand(r.kind === 'rational', 'invalid-input', 'base field descriptor');
        owners.push(DifferentialField.rationals(ctx, bounds)); continue;
      }
      const r = record(descriptors[i], ['kind', 'variable', 'rule', 'admission']), parent = owners[i - 1];
      const cs = array(r.rule); ctx.degree(cs.length - 1); ctx.allocate(cs.length);
      const rule = cs.map(c => element(c, i - 1)), variable = text(r.variable);
      let field: DifferentialField;
      if (r.kind === 'variable') {
        demand(r.admission === null, 'invalid-input', 'variable admission');
        field = DifferentialField.rationalFunctions(ctx, parent, variable, bounds);
      } else {
        demand(r.kind === 'formal', 'invalid-input', 'extension kind');
        field = r.admission === null ? DifferentialField.formal(ctx, parent, variable, rule, bounds)
          : DifferentialField.certified(ctx, parent, variable, rule, bounds, admission(r.admission, parent));
      }
      demand(field.rule!.coefficients.length === rule.length && field.fractions!.ring.equal(ctx, field.rule!, field.fractions!.ring.make(ctx, rule)),
        'verification-failed', 'derivation descriptor');
      owners.push(field);
    }
    // Compare the explicitly expected construction, never just printed names.
    const expectedWire = writer(ctx, tower(ctx, expected, bounds), bounds).construction();
    const expectedBytes = inspect(ctx, bounds, expectedWire);
    const actualWire = writer(ctx, owners, bounds).construction(), actualBytes = inspect(ctx, bounds, actualWire);
    ctx.allocate(expectedBytes + actualBytes);
    demand(JSON.stringify(expectedWire) === JSON.stringify(actualWire), 'domain-mismatch', 'unexpected differential construction');
    const es = array(root.elements), ds = array(root.derivatives); ctx.allocate(es.length + ds.length + 3);
    const elements = Object.freeze(es.map(e => element(e))), derivatives = Object.freeze(ds.map(d => derivative(d)));
    for (const d of derivatives) verifyDerivative(ctx, d.input.owner, d.input, d);
    return Object.freeze({ owner: owners.at(-1)!, elements, derivatives });
  });
}
