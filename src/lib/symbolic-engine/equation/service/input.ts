import type { EquationRequest, EquationRowNote } from '../../../new-equation/types';
import { checkRows, isAssumption, parseRow } from '../../../new-equation/parse';
import { assumptionsSatisfiable } from '../core/parameters/assume';
import type { ExprId, ExpressionStore } from '../core/representation/expression';
import { canonicalFormula, formulaRelations, hasQuantifier } from '../core/representation/formula';
import { readFormula, readRelations } from '../core/representation/mathjson';
import { canonicalRelation, relationProblem, type Condition, type Formula, type Relation, type RelationInput, type RelationProblem } from '../core/representation/relation';

/**
 * New Equation lowering: the page's rows become one relation problem in the core's store, plus assumptions
 * (rows naming parameters only). Every refusal names its row; nothing is guessed or partially solved.
 */
export class EquationInputError extends Error {
  readonly notes: EquationRowNote[];
  constructor(message: string, notes: EquationRowNote[]) {
    super(message);
    this.name = 'EquationInputError';
    this.notes = notes;
  }
}

export interface LoweredEquation { readonly problem: RelationProblem; readonly assumptions: readonly Relation[]; readonly notes: EquationRowNote[] }

export function lowerEquation(store: ExpressionStore, request: EquationRequest): LoweredEquation {
  const ctx = store.ctx;
  for (const row of request.rows) { ctx.allocate(row.length); ctx.tick(row.length); }
  const parsed = request.rows.map(parseRow);
  const checked = checkRows(parsed, request.targets, request.domain);
  const notes: EquationRowNote[] = checked.rows.map(r => (r.kind === 'error' ? { kind: 'error', message: r.message } : { kind: r.kind }));
  const relations: RelationInput[] = [], assumptions: RelationInput[] = [], formulas: Formula[] = [];
  parsed.forEach((row, i) => {
    if (row.kind !== 'relation' || notes[i].kind === 'error') return;
    if (row.logic) {
      // ∧, ∨, ¬, ∀, ∃ (EQUATION-SEMIALGEBRAIC1): a formula in negation normal form; never an assumption.
      const f = readFormula(store, row.json);
      if (f.kind === 'unsupported') notes[i] = { kind: 'error', message: `${f.head} is not supported here.` };
      else if (f.kind === 'invalid') notes[i] = { kind: 'error', message: `This row could not be read (${f.reason}).` };
      else formulas.push(canonicalFormula(store, f.value));
      return;
    }
    const read = readRelations(store, row.json);
    if (read.kind === 'unsupported') notes[i] = { kind: 'error', message: `${read.head} is not supported here.` };
    else if (read.kind === 'invalid') notes[i] = { kind: 'error', message: `This row could not be read (${read.reason}).` };
    else (isAssumption(row, request.targets) ? assumptions : relations).push(...read.value);
  });
  const firstError = notes.find(n => n.kind === 'error');
  if (firstError) throw new EquationInputError((firstError as { message: string }).message, notes);
  if (checked.missingTargets.length) throw new EquationInputError(`${checked.missingTargets.join(', ')} ${checked.missingTargets.length > 1 ? 'do' : 'does'} not appear in an equation row.`, notes);
  if (!relations.length && !formulas.length) throw new EquationInputError('Enter an equation or inequality with an unknown.', notes);
  const problem = relationProblem(store, { domain: request.domain, targets: request.targets, relations, formulas });
  const assumed = assumptions.map(r => canonicalRelation(store, r));
  if (!assumptionsSatisfiable(problem, assumed)) {
    throw new EquationInputError('These assumptions cannot all hold.', notes.map(n => (n.kind === 'assumption' ? { kind: 'error', message: 'These assumptions cannot all hold.' } : n)));
  }
  return { problem, assumptions: assumed, notes };
}

/**
 * Where the problem's expressions are defined, read from their structure: ln u needs u > 0 (ℝ) or u ≠ 0 (ℂ),
 * an even root of u needs u ≥ 0 (ℝ), a negative power of u needs u ≠ 0, tan u needs cos u ≠ 0, and arcsin u,
 * arccos u need −1 ≤ u ≤ 1 (ℝ). Only subexpressions with names are listed.
 */
export function domainConditions(problem: RelationProblem): Condition[] {
  const s: ExpressionStore = problem.store, real = problem.domain === 'real', out: Condition[] = [];
  // Rows with quantifiers name bound variables, which no condition on the answer can mention.
  const open = problem.formulas.filter(f => !hasQuantifier(f)).flatMap(formulaRelations);
  const roots = [...problem.relations, ...open].flatMap(r => [r.lhs, r.rhs]);
  const named = (id: ExprId) => s.freeSymbols(id).length > 0;
  for (const n of s.postorder(roots)) {
    s.ctx.tick();
    const node = s.node(n);
    if (node.kind === 'pow' && named(node.base)) {
      const e = s.numberValue(node.exponent);
      if (e && e.numerator < 0n) out.push({ kind: 'nonzero', expr: node.base });
      if (e && real && e.denominator % 2n === 0n) out.push({ kind: e.numerator < 0n ? 'positive' : 'nonnegative', expr: node.base });
    }
    if (node.kind !== 'apply' || !named(node.arg)) continue;
    if (node.fn === 'log') out.push(real ? { kind: 'positive', expr: node.arg } : { kind: 'nonzero', expr: node.arg });
    if (node.fn === 'tan') out.push({ kind: 'nonzero', expr: s.apply('cos', node.arg) });
    if (real && (node.fn === 'asin' || node.fn === 'acos')) {
      out.push({ kind: 'nonnegative', expr: s.sub(s.integer(1), node.arg) }, { kind: 'nonnegative', expr: s.add(node.arg, s.integer(1)) });
    }
  }
  // A base with u > 0 needs no separate u ≠ 0.
  const positive = new Set(out.filter(c => c.kind === 'positive').map(c => c.expr));
  const seen = new Set<string>();
  return out.filter(c => !(c.kind === 'nonzero' && positive.has(c.expr))).filter(c => {
    const key = `${c.kind}|${s.digest(c.expr)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
