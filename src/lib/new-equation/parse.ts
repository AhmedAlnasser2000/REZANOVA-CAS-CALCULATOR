import { ComputeEngine } from '@cortex-js/compute-engine';

/**
 * New Equation rows: one relation per row, read from the editor's LaTeX by Compute Engine in raw form (numbers
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
  | { readonly kind: 'relation'; readonly json: unknown; readonly symbols: readonly string[]; readonly signs: readonly RelationSign[] };

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

/** Read one row. */
export function parseRow(latex: string): ParsedRow {
  if (BLANK.test(latex)) return { kind: 'empty' };
  try {
    const raw = ce().parse(latex, { form: 'raw', parseNumbers: 'decimal' }).toMathJson({ shorthands: [], fractionalDigits: 'max', prettify: false });
    const symbols = new Set<string>();
    const json = shape(raw, symbols);
    const parts = Array.isArray(json) && json[0] === 'And' ? json.slice(1) : [json];
    const signs = parts.map(p => (Array.isArray(p) && typeof p[0] === 'string' ? RELATIONS[p[0]] : undefined));
    if (signs.some(s => s === undefined)) return { kind: 'error', message: 'Add a relation sign: =, ≠, <, ≤, > or ≥.' };
    return { kind: 'relation', json, symbols: [...symbols].sort(), signs: signs as RelationSign[] };
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

/** The automatic unknowns: as many as there are rows with an equation (at least one), in pick order. */
export function autoTargets(rows: readonly ParsedRow[]): string[] {
  const relations = rows.filter((r): r is Extract<ParsedRow, { kind: 'relation' }> => r.kind === 'relation');
  const order = pickOrder(relations.flatMap(r => r.symbols));
  const equations = relations.filter(r => r.signs.includes('eq')).length;
  return order.slice(0, Math.max(1, equations));
}

/** A relation row whose names are all parameters (none of the unknowns) is an assumption. */
export function isAssumption(row: ParsedRow, targets: readonly string[]): boolean {
  return row.kind === 'relation' && row.symbols.length > 0 && row.symbols.every(s => !targets.includes(s));
}

export type RowCheck = { readonly kind: 'empty' | 'relation' | 'assumption' } | { readonly kind: 'error'; readonly message: string };

/**
 * Checks before solving, per row: unreadable rows, order relations over ℂ, and assumptions on names that appear
 * in no other row; and unknowns that appear in no row. `ready` is true when nothing blocks solving.
 */
export function checkRows(rows: readonly ParsedRow[], targets: readonly string[], domain: 'real' | 'complex'): { rows: RowCheck[]; ready: boolean; orderOverComplex: boolean; missingTargets: string[] } {
  const used = new Set(rows.flatMap(r => (r.kind === 'relation' && !isAssumption(r, targets) ? r.symbols : [])));
  let orderOverComplex = false;
  const out: RowCheck[] = rows.map(r => {
    if (r.kind !== 'relation') return r;
    if (domain === 'complex' && r.signs.includes('order')) { orderOverComplex = true; return { kind: 'error', message: 'Inequalities need real numbers.' }; }
    if (!isAssumption(r, targets)) return { kind: 'relation' };
    const missing = r.symbols.filter(s => !used.has(s));
    return missing.length ? { kind: 'error', message: `${missing.join(', ')} ${missing.length > 1 ? 'do' : 'does'} not appear in the other rows.` } : { kind: 'assumption' };
  });
  const missingTargets = targets.filter(t => !used.has(t));
  const ready = out.some(r => r.kind === 'relation') && out.every(r => r.kind !== 'error') && targets.length > 0 && missingTargets.length === 0;
  return { rows: out, ready, orderOverComplex, missingTargets };
}
