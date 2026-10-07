import { demand, type ExecutionContext } from '../execution';
import { rational, type Rational } from '../algebra/rational';
import { compareRational } from '../algebraic/real-roots';
import { bisectReal, compareReal, type RealRootOf } from '../algebraic/root-of';
import { simplestBetween } from '../generators/samples';
import { asRoot, type ExactValue } from '../representation/evaluate';
import type { ExpressionStore } from '../representation/expression';
import { fiberRoots, lazardPolynomial } from './fiber';
import { project, type Projection } from './projection';
import { content, degree, trueLevel, type RPoly } from './recursive';
import { signAtPoint } from './sign';

/**
 * Cylindrical algebraic decomposition (EQUATION-SEMIALGEBRAIC1): projection (projection.ts), then lifting from the
 * line upwards. Over each cell of ℝ^(k−1), with sample α, the fibres of the level-k basis at α (fiber.ts) split the
 * cylinder into sections (the roots, exact algebraic samples) and sectors (simple rational samples between them).
 * Partial CAD (Collins and Hong, J. Symbolic Comput. 12, 1991): a cell whose truth is already fixed by the atoms of
 * its level and below is not lifted further — the formula is constant on the whole cylinder over it.
 *
 * Every atom is sign-invariant on the cells of its level and above (its primitive part's factors are basis
 * elements, its content lies below), so its sign is computed once, at the first cell of its level.
 */
export type Op = 'eq' | 'ne' | 'lt' | 'le' | 'gt' | 'ge';
/** poly op 0, poly of level ≤ n. */
export interface CadAtom { readonly poly: RPoly; readonly op: Op }
export type CadFormula =
  | { readonly kind: 'atom'; readonly atom: number }
  | { readonly kind: 'and' | 'or'; readonly args: readonly CadFormula[] };
export interface CadProblem {
  readonly n: number;
  readonly atoms: readonly CadAtom[];
  readonly formula: CadFormula;
  /** An atom (op 'eq') that is a conjunct of the whole formula: an equational constraint candidate. */
  readonly constraints?: readonly number[];
}

/** A section's defining polynomial (level k) and the index (1-based) of its root among the fibre's distinct real roots. */
export interface Section {
  readonly poly: RPoly; readonly index: number; readonly count: number;
  /** The polynomial is the Lazard evaluation of a basis element nullified over the parent cell. */
  readonly lazard?: true;
}
export interface CadCell {
  readonly level: number;
  /** Coordinates x₁ … x_level of the sample point. */
  readonly sample: readonly ExactValue[];
  /** The polynomials whose fibre roots this cell is (empty for a sector, and for the root cell). */
  readonly sections: readonly Section[];
  /** Fixed truth (a leaf); absent when the cell is lifted. */
  readonly truth?: boolean;
  /** The stack over the cell, ascending in x_{level+1}: sector, section, sector, …, sector. */
  readonly children?: readonly CadCell[];
}
export interface Decomposition { readonly n: number; readonly projection: Projection; readonly root: CadCell }

class ConstraintNullified extends Error {}

const holds = (op: Op, s: number) => (op === 'eq' ? s === 0 : op === 'ne' ? s !== 0 : op === 'lt' ? s < 0 : op === 'le' ? s <= 0 : op === 'gt' ? s > 0 : s >= 0);

/** Three-valued truth: undefined while an atom it needs has no known sign. */
export function evaluate(f: CadFormula, atoms: readonly CadAtom[], signs: readonly (number | undefined)[]): boolean | undefined {
  if (f.kind === 'atom') { const s = signs[f.atom]; return s === undefined ? undefined : holds(atoms[f.atom].op, s); }
  let unknown = false;
  for (const g of f.args) {
    const v = evaluate(g, atoms, signs);
    if (v === undefined) unknown = true;
    else if (v === (f.kind === 'or')) return v;
  }
  return unknown ? undefined : f.kind === 'and';
}

// ---- samples ----

const lower = (v: ExactValue): Rational => (v.kind === 'rational' ? v.value : (v.root as RealRootOf).lo);
const upper = (v: ExactValue): Rational => (v.kind === 'rational' ? v.value : (v.root as RealRootOf).hi);
const refine = (ctx: ExecutionContext, v: ExactValue): ExactValue => (v.kind === 'rational' ? v : { kind: 'algebraic', root: bisectReal(ctx, v.root as RealRootOf) });
const floor = (r: Rational) => (r.numerator >= 0n ? r.numerator / r.denominator : -((-r.numerator + r.denominator - 1n) / r.denominator));

/** A simple rational in the open interval between two values (an absent end is infinite). */
export function sectorSample(ctx: ExecutionContext, a: ExactValue | undefined, b: ExactValue | undefined): Rational {
  if (!a && !b) return rational(ctx, 0n);
  if (!a) { const l = lower(b as ExactValue); return rational(ctx, l.numerator > 0n ? 0n : -floor({ numerator: -l.numerator, denominator: l.denominator }) - 1n); }
  if (!b) { const u = upper(a); return rational(ctx, u.numerator < 0n ? 0n : floor(u) + 1n); }
  let x = a, y = b;
  while (compareRational(ctx, upper(x), lower(y)) >= 0) { ctx.tick(); x = refine(ctx, x); y = refine(ctx, y); }
  return simplestBetween(ctx, upper(x), lower(y));
}

const compareExact = (ctx: ExecutionContext, a: ExactValue, b: ExactValue): number => compareReal(ctx, asRoot(ctx, a) as RealRootOf, asRoot(ctx, b) as RealRootOf);

// ---- lifting ----

interface Lifter {
  readonly store: ExpressionStore;
  readonly problem: CadProblem;
  readonly projection: Projection;
  readonly levels: readonly { level: number; poly: RPoly }[];
}

/** The signs of the atoms of exactly this level at a sample (others copied from the parent). */
function signsAt(l: Lifter, level: number, sample: readonly ExactValue[], parent: readonly (number | undefined)[]): (number | undefined)[] {
  return parent.map((s, i) => (l.levels[i].level === level ? signAtPoint(l.store.ctx, l.levels[i].poly, level, sample) : s));
}

function liftCell(l: Lifter, level: number, sample: readonly ExactValue[], sections: readonly Section[], signs: readonly (number | undefined)[]): CadCell {
  const ctx = l.store.ctx, { problem, projection } = l;
  ctx.tick();
  const truth = evaluate(problem.formula, problem.atoms, signs);
  if (truth !== undefined) return Object.freeze({ level, sample, sections, truth });
  const k = level + 1;
  demand(k <= problem.n, 'verification-failed', 'a formula undecided at full dimension');
  const constrained = k === problem.n && projection.equational !== undefined;
  const basis = projection.basis[k - 1].filter((_, i) => !constrained || (projection.equational as readonly number[]).includes(i));
  // The fibres, merged into one ascending list of roots, each with the polynomials it is a root of.
  const roots: { value: ExactValue; sections: Section[] }[] = [];
  for (const f of basis) {
    let poly = f, fibre = fiberRoots(l.store, f, k, sample);
    if (fibre === 'nullified') {
      if (constrained) throw new ConstraintNullified();
      poly = lazardPolynomial(l.store, f, k, sample).poly;
      fibre = fiberRoots(l.store, poly, k, sample);
      demand(fibre !== 'nullified', 'verification-failed', 'a Lazard evaluation vanished identically');
    }
    fibre.forEach((value, i) => {
      const s: Section = { poly, index: i + 1, count: (fibre as ExactValue[]).length, ...(poly === f ? {} : { lazard: true as const }) };
      const at = roots.findIndex(r => compareExact(ctx, r.value, value) === 0);
      if (at >= 0) roots[at].sections.push(s); else roots.push({ value, sections: [s] });
    });
  }
  roots.sort((a, b) => compareExact(ctx, a.value, b.value));
  ctx.allocate(2 * roots.length + 1);
  const children: CadCell[] = [];
  const sector = (a: ExactValue | undefined, b: ExactValue | undefined) => {
    const point = [...sample, { kind: 'rational', value: sectorSample(ctx, a, b) } as ExactValue];
    // Off the sections of an equational constraint the formula is false.
    if (constrained) return Object.freeze({ level: k, sample: point, sections: [], truth: false });
    return liftCell(l, k, point, [], signsAt(l, k, point, signs));
  };
  roots.forEach((r, i) => {
    children.push(sector(roots[i - 1]?.value, r.value));
    const point = [...sample, r.value];
    children.push(liftCell(l, k, point, Object.freeze(r.sections), signsAt(l, k, point, signs)));
  });
  children.push(sector(roots[roots.length - 1]?.value, undefined));
  return Object.freeze({ level, sample, sections, children: Object.freeze(children) });
}

/** The constraint to use: the equation of lowest degree in xₙ among the candidates of level n, primitive in xₙ. */
function chooseConstraint(ctx: ExecutionContext, problem: CadProblem): RPoly | undefined {
  let best: RPoly | undefined;
  for (const i of problem.constraints ?? []) {
    const a = problem.atoms[i];
    if (a.op !== 'eq' || trueLevel(a.poly, problem.n).level !== problem.n) continue;
    const c = content(ctx, a.poly, problem.n);
    if (trueLevel(c, problem.n - 1).level > 0) continue;
    if (!best || degree(a.poly) < degree(best)) best = a.poly;
  }
  return best;
}

/** The cylindrical decomposition of ℝⁿ for a quantifier-free formula, partial where the truth is fixed early. */
export function decompose(store: ExpressionStore, problem: CadProblem): Decomposition {
  const ctx = store.ctx, n = problem.n;
  demand(n >= 1, 'invalid-input', 'a decomposition needs a variable');
  const levels = problem.atoms.map(a => trueLevel(a.poly, n));
  const inputs = problem.atoms.map(a => ({ poly: a.poly, level: n }));
  const attempt = (constraint: RPoly | undefined): Decomposition => {
    const projection = project(ctx, inputs, n, constraint);
    const l: Lifter = { store, problem, projection, levels };
    const signs = levels.map(t => (t.level === 0 ? Number(t.poly as bigint > 0n) - Number(t.poly as bigint < 0n) : undefined));
    return Object.freeze({ n, projection, root: liftCell(l, 0, [], [], signs) });
  };
  const constraint = n >= 2 ? chooseConstraint(ctx, problem) : undefined;
  if (!constraint) return attempt(undefined);
  try {
    return attempt(constraint);
  } catch (e) {
    if (!(e instanceof ConstraintNullified)) throw e;
    // A curtain: the constraint vanishes identically over a cell, where the reduced projection is not valid.
    return attempt(undefined);
  }
}
