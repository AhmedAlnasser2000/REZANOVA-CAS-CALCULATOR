import { ComputeEngine } from '@cortex-js/compute-engine';

/**
 * New Equation rows: one relation per row (or relations combined with ∧, ∨, ¬, ∀ and ∃), read from the editor's LaTeX by Compute Engine in raw form (numbers
 * kept as exact decimal text). The MathJSON is then put in the shape the Equation core reads:
 * - implicit products become Multiply (2x, xy);
 * - e and i are the constants e and i (as on a calculator keypad);
 * - parse errors, several items in one row and a row without a relation sign are row errors.
 * This module reads input only; it never interprets rendered output.
 */
export type RelationSign = 'eq' | 'ne' | 'order';
export type ParsedRow =
  | { readonly kind: 'empty' }
  | { readonly kind: 'error'; readonly message: string }
  | {
      readonly kind: 'relation'; readonly json: unknown; readonly symbols: readonly string[]; readonly signs: readonly RelationSign[];
      /** The row combines relations with ∨, ¬, ∀ or ∃ (EQUATION-SEMIALGEBRAIC1); `symbols` are then its free names. */
      readonly logic?: true;
      /** Names bound by ∀ or ∃ in the row. */
      readonly bound?: readonly string[];
    };

const LOGIC = new Set(['And', 'Or', 'Not', 'ForAll', 'Exists', 'Delimiter']);
const NOT_HERE = new Set(['Or', 'Not', 'ForAll', 'Exists']);

/**
 * The relations of a row read as a formula: relations (and chains) under And, Or, Not, ForAll, Exists and
 * parentheses. Returns the relation leaves and the bound names, or a row error when a logical symbol stands
 * inside an expression (¬x < 1 reads as (¬x) < 1: ¬ needs a parenthesized relation).
 */
function logicLeaves(json: unknown): { leaves: unknown[]; bound: string[]; logic: boolean } {
  const leaves: unknown[] = [], bound: string[] = [], pending: unknown[] = [json];
  let logic = false;
  while (pending.length) {
    const v = pending.pop();
    if (!Array.isArray(v) || typeof v[0] !== 'string') { leaves.push(v); continue; }
    if (!LOGIC.has(v[0])) {
      const inner: unknown[] = v.slice(1);
      while (inner.length) {
        const w = inner.pop();
        if (Array.isArray(w)) {
          if (typeof w[0] === 'string' && NOT_HERE.has(w[0])) throw new RowError('Put ¬ before a parenthesized relation, such as ¬(x < 1).');
          inner.push(...w.slice(1));
        }
      }
      leaves.push(v);
      continue;
    }
    if (v[0] !== 'And' && v[0] !== 'Delimiter') logic = true;
    if (v[0] === 'ForAll' || v[0] === 'Exists') {
      const name = Array.isArray(v[1]) && v[1][0] === 'Element' ? v[1][1] : v[1];
      if (typeof name !== 'string' || !SYMBOL.test(name)) throw new RowError('Write a quantifier as ∀x: … or ∃x: … with a variable name.');
      bound.push(name);
      pending.push(v[2]);
      continue;
    }
    pending.push(...v.slice(1));
  }
  return { leaves, bound: [...new Set(bound)].sort(), logic };
}

const RELATIONS: Readonly<Record<string, RelationSign>> = {
  Equal: 'eq', NotEqual: 'ne', Less: 'order', LessEqual: 'order', Greater: 'order', GreaterEqual: 'order',
};
const CONSTANTS = new Set(['Pi', 'ExponentialE', 'ImaginaryUnit', 'Half', 'GoldenRatio']);
const RENAMED: Readonly<Record<string, string>> = { e: 'ExponentialE', i: 'ImaginaryUnit' };
const SYMBOL = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const BLANK = /^(?:\s|\\[,;:!]|\\quad|\\qquad|\\placeholder\{\})*$/;

let engine: ComputeEngine | undefined;
const ce = () => (engine ??= new ComputeEngine());

class RowError extends Error {}
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v);

/** The raw MathJSON in plain form ({fn}/{sym} unwrapped), with the renames above; explicit stack. */
function shape(raw: unknown, symbols: Set<string>): unknown {
  type Frame = { items: unknown[]; out: unknown[] };
  const leaf = (v: unknown): { done: unknown } | { items: unknown[] } => {
    if (record(v) && Array.isArray(v.fn)) v = v.fn;
    if (record(v) && typeof v.sym === 'string') v = v.sym;
    if (typeof v === 'string') {
      const name = RENAMED[v] ?? v;
      if (!CONSTANTS.has(name) && name === v) {
        if (!SYMBOL.test(v)) throw new RowError(`Use Latin letters for names (${v} is not supported).`);
        symbols.add(v);
      }
      return { done: name };
    }
    if (record(v) && typeof v.str === 'string') throw new RowError('Text is not part of an equation.');
    if (!Array.isArray(v)) return { done: v };
    const head = record(v[0]) && typeof v[0].sym === 'string' ? v[0].sym : v[0];
    if (head === 'Error') throw new RowError('This row is incomplete.');
    if (head === 'Sequence') throw new RowError('Write one relation per row.');
    return { items: [head === 'InvisibleOperator' ? 'Multiply' : head, ...v.slice(1)] };
  };
  const first = leaf(raw);
  if ('done' in first) return first.done;
  const stack: Frame[] = [{ items: first.items, out: [first.items[0]] }];
  for (;;) {
    const top = stack[stack.length - 1];
    if (top.out.length < top.items.length) {
      const next = leaf(top.items[top.out.length]);
      if ('done' in next) top.out.push(next.done); else stack.push({ items: next.items, out: [next.items[0]] });
      continue;
    }
    stack.pop();
    if (stack.length === 0) return top.out;
    stack[stack.length - 1].out.push(top.out);
  }
}

/** Whether a row holds nothing (spacing and placeholders only); exactly the rows `parseRow` reads as empty. */
export const isBlankRow = (latex: string) => BLANK.test(latex);

/** Read one row. Slow on some unfinished rows (Compute Engine's error recovery): the page reads rows in a worker. */
export function parseRow(latex: string): ParsedRow {
  if (isBlankRow(latex)) return { kind: 'empty' };
  try {
    const raw = ce().parse(latex, { form: 'raw', parseNumbers: 'decimal' }).toMathJson({ shorthands: [], fractionalDigits: 'max', prettify: false });
    const symbols = new Set<string>();
    const json = shape(raw, symbols);
    const { leaves, bound, logic } = logicLeaves(json);
    const signs = leaves.map(p => (Array.isArray(p) && typeof p[0] === 'string' ? RELATIONS[p[0]] : undefined));
    if (signs.some(s => s === undefined)) return { kind: 'error', message: 'Add a relation sign: =, ≠, <, ≤, > or ≥.' };
    const free = [...symbols].filter(v => !bound.includes(v)).sort();
    return logic ? { kind: 'relation', json, symbols: free, signs: signs as RelationSign[], logic: true, bound } : { kind: 'relation', json, symbols: free, signs: signs as RelationSign[] };
  } catch (e) {
    if (e instanceof RowError) return { kind: 'error', message: e.message };
    if (e instanceof RangeError) return { kind: 'error', message: 'This row is nested too deeply to read.' };
    return { kind: 'error', message: 'This row could not be read.' };
  }
}

const PREFERRED = ['x', 'y', 'z', 't'];
const rank = (s: string) => { const i = PREFERRED.indexOf(s); return i < 0 ? PREFERRED.length : i; };
/** Names in pick order: x, y, z, t, then the rest alphabetically. */
export function pickOrder(symbols: Iterable<string>): string[] {
  return [...new Set(symbols)].sort((a, b) => rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0));
}

/**
 * The automatic unknowns, in pick order: as many as there are rows with an equation; with no equation at all
 * (inequalities, ∨ ∧ ¬, quantified rows), every free name, so x² + y² < 1, y > x is a region in x and y
 * (EQUATION-SEMIALGEBRAIC1, user decision 2026-10-07).
 */
export function autoTargets(rows: readonly ParsedRow[]): string[] {
  const relations = rows.filter((r): r is Extract<ParsedRow, { kind: 'relation' }> => r.kind === 'relation');
  const order = pickOrder(relations.flatMap(r => r.symbols));
  const equations = relations.filter(r => r.signs.includes('eq')).length;
  return equations === 0 ? order : order.slice(0, equations);
}

/** A relation row whose names are all parameters (none of the unknowns) is an assumption. */
export function isAssumption(row: ParsedRow, targets: readonly string[]): boolean {
  return row.kind === 'relation' && !row.logic && row.symbols.length > 0 && row.symbols.every(s => !targets.includes(s));
}

export type RowCheck = { readonly kind: 'empty' | 'relation' | 'assumption' } | { readonly kind: 'error'; readonly message: string };

/**
 * Checks before solving, per row: unreadable rows, order relations over ℂ, and assumptions on names that appear
 * in no other row; and unknowns that appear in no row. `ready` is true when nothing blocks solving.
 */
export function checkRows(rows: readonly ParsedRow[], targets: readonly string[], domain: 'real' | 'complex'): { rows: RowCheck[]; ready: boolean; orderOverComplex: boolean; missingTargets: string[] } {
  const used = new Set(rows.flatMap(r => (r.kind === 'relation' && !isAssumption(r, targets) ? r.symbols : [])));
  let orderOverComplex = false;
  // A name quantified in one row is bound there: it cannot be an unknown, nor be used freely in another row.
  const boundIn = new Map<string, number>();
  rows.forEach((r, i) => { if (r.kind === 'relation') for (const b of r.bound ?? []) if (!boundIn.has(b)) boundIn.set(b, i); });
  const out: RowCheck[] = rows.map((r, i) => {
    if (r.kind !== 'relation') return r;
    if (domain === 'complex' && r.signs.includes('order')) { orderOverComplex = true; return { kind: 'error', message: 'Inequalities need real numbers.' }; }
    if (domain === 'complex' && r.bound?.length) return { kind: 'error', message: '∀ and ∃ need real numbers.' };
    const asTarget = (r.bound ?? []).find(b => targets.includes(b));
    if (asTarget) return { kind: 'error', message: `${asTarget} is quantified here, so it cannot be an unknown.` };
    const clash = r.symbols.find(s => boundIn.has(s) && boundIn.get(s) !== i);
    if (clash) return { kind: 'error', message: `${clash} is quantified in row ${(boundIn.get(clash) as number) + 1}; use another name here.` };
    if (!isAssumption(r, targets)) return { kind: 'relation' };
    const missing = r.symbols.filter(s => !used.has(s));
    return missing.length ? { kind: 'error', message: `${missing.join(', ')} ${missing.length > 1 ? 'do' : 'does'} not appear in the other rows.` } : { kind: 'assumption' };
  });
  const missingTargets = targets.filter(t => !used.has(t));
  const ready = out.some(r => r.kind === 'relation') && out.every(r => r.kind !== 'error') && targets.length > 0 && missingTargets.length === 0;
  return { rows: out, ready, orderOverComplex, missingTargets };
}
