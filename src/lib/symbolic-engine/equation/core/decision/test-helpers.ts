// Test fixtures for the decision tests. Not imported by production code (the isolation test forbids it).
import { complexDecimal, realDecimal } from '../algebraic/root-of';
import type { ExpressionStore } from '../representation/expression';
import { readRelations, writeExpression } from '../representation/mathjson';
import { relationProblem, type ProblemDomain } from '../representation/relation';
import type { Endpoint, EquationOutcome, Interval, PointValue, SolutionSet } from '../representation/solution-set';
import { decidePolynomialProblem } from './solve';
import { verifyOutcome } from './verify';

export function problemOf(store: ExpressionStore, json: unknown, domain: ProblemDomain = 'real') {
  const r = readRelations(store, json);
  if (r.kind !== 'ok') throw new Error(JSON.stringify(r));
  return relationProblem(store, { domain, targets: ['x'], relations: r.value });
}

/** Decide, verify independently, and return the outcome. */
export function solve(store: ExpressionStore, json: unknown, domain: ProblemDomain = 'real') {
  const problem = problemOf(store, json, domain);
  const outcome = decidePolynomialProblem(problem);
  verifyOutcome(problem, outcome);
  return { problem, outcome, store: problem.store };
}

/** Readable exact description: rationals as n/d, irrationals to 6 decimals (computed exactly). */
export function show(store: ExpressionStore, v: PointValue | Endpoint): string {
  const ctx = store.ctx;
  if (v.kind === 'infinity') return v.sign < 0 ? '-inf' : '+inf';
  if (v.kind === 'rational') return v.value.denominator === 1n ? `${v.value.numerator}` : `${v.value.numerator}/${v.value.denominator}`;
  if (v.kind === 'expression') return JSON.stringify(writeExpression(store, v.id));
  if (v.kind === 'root') return `root${v.index}(${JSON.stringify(writeExpression(store, v.poly))}, ${v.variable})`;
  if (v.root.kind === 'real') return `≈${realDecimal(ctx, v.root, 6)}`;
  const { re, im } = complexDecimal(ctx, v.root, 6);
  return `≈${re}${im.startsWith('-') ? '' : '+'}${im}i`;
}

export function describe(store: ExpressionStore, outcome: EquationOutcome): string {
  if (outcome.kind === 'solved') return describeSet(store, outcome.set);
  if (outcome.kind === 'empty') return 'empty';
  return `${outcome.kind}: ${'reason' in outcome ? outcome.reason : outcome.stop}`;
}

function interval(store: ExpressionStore, i: Interval): string {
  return `${i.loClosed ? '[' : '('}${show(store, i.lo)}, ${show(store, i.hi)}${i.hiClosed ? ']' : ')'}`;
}

export function describeSet(store: ExpressionStore, set: SolutionSet): string {
  switch (set.kind) {
    case 'finite': return `{${set.points.map(p => (p.length === 1 ? show(store, p[0]) : `(${p.map(v => show(store, v)).join(', ')})`)).join(', ')}}`;
    case 'cofinite': return `C\\{${set.except.map(p => show(store, p[0])).join(', ')}}`;
    case 'intervals': return set.intervals.map(i => interval(store, i)).join(' ∪ ');
    case 'periodic-set': {
      const points = set.components.every(c => c.loClosed && c.hiClosed && show(store, c.lo) === show(store, c.hi));
      const body = points ? `{${set.components.map(c => show(store, c.lo)).join(', ')}}` : set.components.length === 1 ? interval(store, set.components[0]) : `(${set.components.map(c => interval(store, c)).join(' ∪ ')})`;
      const full = set.range.lo.kind === 'infinity' && set.range.hi.kind === 'infinity';
      return `${body} + ${show(store, set.period)}ℤ${full ? '' : ` on ${interval(store, set.range)}`}`;
    }
    case 'interval-family': {
      const range = set.from !== undefined && set.to !== undefined ? `${set.from} ≤ ${set.parameter} ≤ ${set.to}` : set.from !== undefined ? `${set.parameter} ≥ ${set.from}` : set.to !== undefined ? `${set.parameter} ≤ ${set.to}` : `${set.parameter} ∈ ℤ`;
      return `⋃ ${set.loClosed ? '[' : '('}${JSON.stringify(writeExpression(store, set.lo))}, ${JSON.stringify(writeExpression(store, set.hi))}${set.hiClosed ? ']' : ')'} : ${range}`;
    }
    case 'root-set': return `roots(${JSON.stringify(writeExpression(store, set.poly))})`;
    case 'case-tree': return set.cases.map(c => `[${c.conditions.map(k => `${k.kind} ${JSON.stringify(writeExpression(store, k.expr))}${'other' in k ? ` ${JSON.stringify(writeExpression(store, k.other))}` : ''}`).join(' & ')}] ${describeSet(store, c.set)}`).join(' | ');
    case 'periodic': return `{${set.values.map(v => JSON.stringify(writeExpression(store, v))).join(', ')} : ${set.integerParameters.join(', ')} ∈ ℤ${set.constraints.map(c => `, ${c.kind} ${JSON.stringify(writeExpression(store, c.expr))}${'other' in c ? ` ${JSON.stringify(writeExpression(store, c.other))}` : ''}`).join('')}}`;
    case 'union': return set.sets.map(x => describeSet(store, x)).join(' ∪ ');
    case 'parametric': return `{(${set.values.map(v => JSON.stringify(writeExpression(store, v))).join(', ')}) : ${set.freeParameters.join(', ')} free${set.constraints.map(c => `, ${c.kind} ${JSON.stringify(writeExpression(store, c.expr))}${'other' in c ? ` ${JSON.stringify(writeExpression(store, c.other))}` : ''}`).join('')}}`;
    default: return set.kind;
  }
}

/** MathJSON of the radical forms attached to a finite set's points. */
export function forms(store: ExpressionStore, outcome: EquationOutcome): unknown[] {
  if (outcome.kind !== 'solved' || outcome.set.kind !== 'finite') return [];
  return outcome.set.points.map(([v]) => (v.kind === 'algebraic' && 'form' in v && v.form !== undefined ? writeExpression(store, v.form) : null));
}
