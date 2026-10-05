import type {
  CanonicalEquationConditionV6, CanonicalEquationEndpointV6, CanonicalEquationIntervalV6, CanonicalEquationOutcomeV6,
  CanonicalEquationRootBinderV6, CanonicalEquationSetV6, CanonicalMathValueV2, CanonicalResultDocumentV6, OutputStyle, SerializableMathJson,
} from '../../../../types/calculator';
import { chainRelations, printEquationMath, printRelation, printSigned, type PrintedRelation, type RelationOperator } from '../../../display/printer/equation-v6';
import { validateCanonicalResultDocumentV6 } from '../../../result-contract/validation-v6';
import { EquationAlgebraError, type ExecutionContext } from '../core/execution';
import { compareReal, type RealRootOf } from '../core/algebraic/root-of';
import { ExpressionStore, type ExprId } from '../core/representation/expression';
import { readExpression, writeExpression } from '../core/representation/mathjson';
import type { PointValue } from '../core/representation/solution-set';
import { readRootBinders, type RootBinders } from '../result-read';
import { decimalOf, displayForm, orderPoints, provenEqual, type Decimal } from './values';

/**
 * The presentation read model of a V6 Equation document (EQUATION-PRESENTATION1, part B).
 *
 * Rows for the screen follow the user's settings (Exact, Decimal, Both; decimal places); `copyLatex` is always
 * exact and carries the definition of every root it mentions. Value rewrites come from `values.ts` (proven by the
 * core); the printer only lays out. If the core stops (typed resource stop) anywhere, the presentation falls back
 * to the printer alone: the canonical values, unsimplified and without decimals. The document is never changed.
 */
export interface EquationPresentationSettings { readonly outputStyle: OutputStyle; readonly approxDigits: number }
export type PresentationRole = 'assumption' | 'solution' | 'case' | 'definition' | 'message';
export interface PresentationRow { readonly role: PresentationRole; readonly depth: number; readonly latex: string; readonly text: string }
export interface EquationPresentation {
  readonly outcome: CanonicalEquationOutcomeV6['kind'];
  readonly rows: readonly PresentationRow[];
  readonly copyLatex: string;
  readonly plainText: string;
  /** For `incomplete`: the gate that will decide it (the UI maps it to friendly text). */
  readonly owner?: string;
  /** True when the core stopped and the fallback (no rewrites, no decimals, canonical order) was used. */
  readonly fallback: boolean;
}

interface P { latex: string; text: string }
const ORDINAL = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? 'th' : ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
const escapeText = (s: string) => s.replace(/[\\{}$&#^_%~]/g, c => `\\${c === '\\' ? 'textbackslash' : c}${c === '\\' ? '{}' : ''}`);
const textRow = (role: PresentationRole, depth: number, text: string): PresentationRow => ({ role, depth, latex: `\\text{${escapeText(text)}}`, text });
const RELATION_LATEX: Readonly<Record<'eq' | 'ne' | 'lt' | 'le', string>> = { eq: '=', ne: '\\ne', lt: '<', le: '\\le' };
const STOPS: Readonly<Record<string, string>> = {
  work: 'Stopped: the work limit was reached.', allocation: 'Stopped: the memory limit was reached.',
  cancelled: 'Stopped: cancelled.', 'result-size': 'Stopped: the answer is too large to show.',
};

/** The core side, absent in the fallback. */
interface Core { store: ExpressionStore; binders: RootBinders; values: Map<string, ExprId>; forms: Map<string, ExprId> }

class Layout {
  readonly rows: PresentationRow[] = [];
  readonly used = new Set<string>();
  readonly #binder = new Map<string, CanonicalEquationRootBinderV6>();
  readonly #domain: 'real' | 'complex';
  readonly #targets: string[];
  readonly #taken: Set<string>;
  readonly #doc: CanonicalResultDocumentV6;
  readonly #core: Core | undefined;
  readonly #style: OutputStyle;
  readonly #digits: number;
  readonly #copy: boolean;
  constructor(doc: CanonicalResultDocumentV6, core: Core | undefined, settings: EquationPresentationSettings, copy: boolean) {
    this.#doc = doc; this.#core = core; this.#copy = copy;
    this.#style = copy ? 'exact' : settings.outputStyle;
    this.#digits = settings.approxDigits;
    this.#domain = doc.primary.domain;
    this.#targets = doc.primary.targets;
    this.#taken = new Set([...doc.primary.targets, ...doc.primary.parameters, ...doc.primary.roots.map(b => b.symbol)]);
    for (const b of doc.primary.roots) this.#binder.set(b.symbol, b);
  }

  // ---- values ----

  /** Exact display of a math leaf (proven rewrites when the core is available). */
  exact(v: CanonicalMathValueV2): P {
    const json = this.exactJson(v);
    return printEquationMath(json, { constants: this.#constants }) ?? { latex: v.canonicalLatex, text: v.canonicalLatex };
  }

  get #constants(): ReadonlySet<string> { return new Set(this.#binder.keys()); }

  exactJson(v: CanonicalMathValueV2): SerializableMathJson {
    let json = v.mathJson;
    const core = this.#core;
    if (core) {
      const r = readExpression(core.store, json);
      if (r.kind === 'ok') {
        let id = r.value;
        if (core.forms.size) id = core.store.substitute(id, core.forms);
        id = displayForm(core.store, id, core.values, this.#domain);
        json = writeExpression(core.store, id) as SerializableMathJson;
      }
    }
    this.#note(json);
    return json;
  }

  #note(json: SerializableMathJson): void {
    const pending: unknown[] = [json];
    while (pending.length) {
      const x = pending.pop();
      if (typeof x === 'string' && this.#binder.has(x) && !this.#core?.forms.has(x)) this.used.add(x);
      else if (Array.isArray(x)) pending.push(...x);
    }
  }

  #decimal(v: CanonicalMathValueV2): Decimal | undefined {
    const core = this.#core;
    if (!core) return undefined;
    const value = this.pointValue(v);
    return value ? decimalOf(core.store, value, this.#digits, this.#domain) : undefined;
  }

  pointValue(v: CanonicalMathValueV2): PointValue | undefined {
    const core = this.#core;
    if (!core) return undefined;
    const j = v.mathJson;
    if (typeof j === 'string' && core.binders.algebraic.has(j)) return core.binders.algebraic.get(j);
    if (typeof j === 'string' && core.binders.indexed.has(j)) return core.binders.indexed.get(j);
    try {
      const id = core.binders.read(v), n = core.store.node(id);
      return n.kind === 'number' ? { kind: 'rational', value: n.value } : { kind: 'expression', id };
    } catch (e) {
      if (e instanceof EquationAlgebraError) return undefined;
      throw e;
    }
  }

  decimalText(d: Decimal): P {
    if (!d.im) return { latex: d.re, text: d.re };
    const { negative, magnitude } = d.im;
    if (d.reZero) return { latex: `${negative ? '-' : ''}${magnitude}i`, text: `${negative ? '-' : ''}${magnitude}i` };
    return { latex: `${d.re} ${negative ? '-' : '+'} ${magnitude}i`, text: `${d.re} ${negative ? '-' : '+'} ${magnitude}i` };
  }

  /** "= exact", "≈ decimal" or "= exact ≈ decimal" for one value, by the output style. */
  valued(v: CanonicalMathValueV2): { rel: P; bare: boolean; rootDecimal?: true } {
    const bareRoot = this.bareRoot(v);
    if (bareRoot && !this.#copy) {
      const d = this.#decimal(v);
      if (d) { const t = this.decimalText(d); return { rel: { latex: `\\approx ${t.latex}`, text: `≈ ${t.text}` }, bare: true, rootDecimal: true }; }
    }
    const exact = this.exact(v);
    const integer = typeof v.mathJson === 'number' || (typeof v.mathJson === 'object' && v.mathJson !== null && !Array.isArray(v.mathJson));
    // Copy is always exact; integers never repeat as decimals.
    const d = this.#copy || (this.#style === 'exact' && !bareRoot) || integer ? undefined : this.#decimal(v);
    const dec = d ? this.decimalText(d) : undefined;
    // A bare root without a closed form shows its decimal (the user's choice), its definition follows.
    if (dec && (bareRoot || this.#style === 'decimal')) return { rel: { latex: `\\approx ${dec.latex}`, text: `≈ ${dec.text}` }, bare: bareRoot };
    if (dec && this.#style === 'both') return { rel: { latex: `= ${exact.latex} \\approx ${dec.latex}`, text: `= ${exact.text} ≈ ${dec.text}` }, bare: bareRoot };
    return { rel: { latex: `= ${exact.latex}`, text: `= ${exact.text}` }, bare: bareRoot };
  }

  /** A value without its relation sign (endpoints, excepted points): exact, or decimal in Decimal style. */
  plain(v: CanonicalMathValueV2): P {
    const exact = this.exact(v);
    if (this.#style !== 'decimal') return exact;
    const d = this.#decimal(v);
    return d ? this.decimalText(d) : exact;
  }

  lhs(): P {
    const names = this.#targets.map(t => printEquationMath(t) ?? { latex: t, text: t });
    if (names.length === 1) return names[0];
    return { latex: `\\left(${names.map(n => n.latex).join(', ')}\\right)`, text: `(${names.map(n => n.text).join(', ')})` };
  }

  // ---- conditions, intervals ----

  condition(c: CanonicalEquationConditionV6): { printed: P | PrintedRelation; key: string } {
    if (c.kind === 'in-domain') {
      const json = this.exactJson(c.expr), e = printEquationMath(json, { constants: this.#constants }) ?? { latex: c.expr.canonicalLatex, text: c.expr.canonicalLatex };
      return { printed: { latex: `${e.latex}\\text{ is defined}`, text: `${e.text} is defined` }, key: `${JSON.stringify(json)}\u0000z` };
    }
    const op: Record<string, RelationOperator> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };
    const other = 'other' in c ? this.exactJson(c.other) : 0;
    const printed = printRelation(this.exactJson(c.expr), op[c.kind], other, { constants: this.#constants });
    if (!printed) return { printed: { latex: c.expr.canonicalLatex, text: c.expr.canonicalLatex }, key: JSON.stringify(c.expr.mathJson) };
    // Reading order from structure: the left side, then the relation, then the right side.
    const rank: Record<RelationOperator, number> = { eq: 0, ne: 1, lt: 2, le: 3, gt: 4, ge: 5 };
    return { printed, key: `${JSON.stringify(printed.leftJson)}\u0000${rank[printed.op]}\u0000${JSON.stringify(printed.rightJson)}` };
  }

  /** Conditions joined by "and", in reading order, with paired bounds chained (−1 ≤ y ≤ 1). */
  conditions(cs: readonly CanonicalEquationConditionV6[]): P {
    let parts: (P | PrintedRelation)[] = cs.map(c => this.condition(c)).sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0)).map(c => c.printed);
    for (let i = 0; i < parts.length; i++) {
      const a = parts[i];
      if (!('op' in a)) continue;
      const j = parts.findIndex((b, k) => k !== i && 'op' in b && chainRelations(a, b as PrintedRelation) !== undefined);
      if (j < 0) continue;
      const chained = chainRelations(a, parts[j] as PrintedRelation) as P;
      parts = parts.filter((_, k) => k !== i && k !== j);
      parts.splice(Math.min(i, j), 0, chained);
    }
    return { latex: parts.map(p => p.latex).join('\\text{ and }'), text: parts.map(p => p.text).join(' and ') };
  }

  endpoint(e: CanonicalEquationEndpointV6): P {
    if (e.kind === 'infinity') return e.sign < 0 ? { latex: '-\\infty', text: '-∞' } : { latex: '\\infty', text: '∞' };
    return this.plain(e.value);
  }

  interval(i: CanonicalEquationIntervalV6): P {
    if (i.lo.kind === 'value' && i.hi.kind === 'value' && JSON.stringify(i.lo.value.mathJson) === JSON.stringify(i.hi.value.mathJson)) {
      const v = this.plain(i.lo.value);
      return { latex: `\\left\\{${v.latex}\\right\\}`, text: `{${v.text}}` };
    }
    const lo = this.endpoint(i.lo), hi = this.endpoint(i.hi);
    return { latex: `\\left${i.loClosed ? '[' : '('}${lo.latex}, ${hi.latex}\\right${i.hiClosed ? ']' : ')'}`, text: `${i.loClosed ? '[' : '('}${lo.text}, ${hi.text}${i.hiClosed ? ']' : ')'}` };
  }

  whole(i: CanonicalEquationIntervalV6): boolean { return i.lo.kind === 'infinity' && i.hi.kind === 'infinity'; }

  space(): P { return this.#domain === 'real' ? { latex: '\\mathbb{R}', text: 'ℝ' } : { latex: '\\mathbb{C}', text: 'ℂ' }; }

  fresh(preferred: string): string {
    for (const c of [preferred, 'n', 'm', 'j']) if (!this.#taken.has(c)) return c;
    let i = 1;
    while (this.#taken.has(`k_${i}`)) i++;
    return `k_${i}`;
  }

  /** a + P·k with a first (the user's family notation), each part with proven rewrites. */
  shifted(a: CanonicalMathValueV2, period: CanonicalMathValueV2, k: string): P {
    const stepJson = this.exactJson({ mathJson: ['Multiply', period.mathJson, k], canonicalLatex: '' });
    const step = printSigned(stepJson, { constants: this.#constants });
    const base = typeof a.mathJson === 'number' && a.mathJson === 0 ? undefined : this.exact(a);
    if (!step) return this.exact({ mathJson: ['Add', a.mathJson, stepJson], canonicalLatex: '' });
    if (!base) return step.negative ? { latex: `-${step.magnitude.latex}`, text: `-${step.magnitude.text}` } : step.magnitude;
    const sign = step.negative ? '-' : '+';
    return { latex: `${base.latex} ${sign} ${step.magnitude.latex}`, text: `${base.text} ${sign} ${step.magnitude.text}` };
  }

  // ---- rows ----

  push(role: PresentationRole, depth: number, p: P): void { this.rows.push({ role, depth, latex: p.latex, text: p.text }); }

  solutionRow(depth: number, values: readonly CanonicalMathValueV2[], suffix: P = { latex: '', text: '' }): void {
    const lhs = this.lhs();
    if (values.length === 1) {
      const { rel, rootDecimal } = this.valued(values[0]);
      this.push('solution', depth, { latex: `${lhs.latex} ${rel.latex}${suffix.latex}`, text: `${lhs.text} ${rel.text}${suffix.text}` });
      if (rootDecimal) this.inlineDefinition(depth + 1, values[0].mathJson as string, this.#targets[0], false);
      return;
    }
    const parts = values.map(v => this.plainOrRoot(v));
    const approx = this.#style === 'decimal' || values.some(v => this.bareRoot(v) && !this.#copy);
    this.push('solution', depth, { latex: `${lhs.latex} ${approx ? '\\approx' : '='} \\left(${parts.map(p => p.latex).join(', ')}\\right)${suffix.latex}`,
      text: `${lhs.text} ${approx ? '≈' : '='} (${parts.map(p => p.text).join(', ')})${suffix.text}` });
    if (!this.#copy) values.forEach((v, i) => { if (this.bareRoot(v) && this.#decimal(v)) this.inlineDefinition(depth + 1, v.mathJson as string, this.#targets[i], true); });
  }

  /** "the 2nd smallest real root of x⁷ − 3x + 1 = 0" under a row that shows the root's decimal. */
  inlineDefinition(depth: number, symbol: string, variable: string, named: boolean): void {
    const what = this.describe(this.#binder.get(symbol) as CanonicalEquationRootBinderV6, variable);
    const name = printEquationMath(variable) ?? { latex: variable, text: variable };
    this.push('definition', depth, named ? { latex: `${name.latex}:\\ ${what.latex}`, text: `${name.text}: ${what.text}` } : what);
  }

  plainOrRoot(v: CanonicalMathValueV2): P {
    if (this.bareRoot(v) && !this.#copy) { const d = this.#decimal(v); if (d) return this.decimalText(d); }
    return this.plain(v);
  }

  /** A value that is a root binder without a proven closed form. */
  bareRoot(v: CanonicalMathValueV2): boolean {
    return typeof v.mathJson === 'string' && this.#binder.has(v.mathJson) && !this.#core?.forms.has(v.mathJson);
  }

  set(s: CanonicalEquationSetV6, depth: number): void {
    const lhs = this.lhs(), space = this.space();
    switch (s.kind) {
      case 'finite': {
        if (s.points.length === 0) { this.push('solution', depth, { latex: '\\text{No solution}', text: 'No solution' }); return; }
        for (const p of this.order(s.points)) this.solutionRow(depth, p);
        return;
      }
      case 'cofinite': {
        const all = this.#targets.length === 1 ? `All ${this.#domain} numbers` : `All ${lhs.text}`;
        if (s.except.length === 0) { this.push('solution', depth, { latex: `\\text{${all}}`, text: all }); return; }
        const ex = this.order(s.except).map(p => (p.length === 1 ? this.plain(p[0]) : { latex: `\\left(${p.map(v => this.plain(v).latex).join(', ')}\\right)`, text: `(${p.map(v => this.plain(v).text).join(', ')})` }));
        this.push('solution', depth, { latex: `\\text{${all} except }${ex.map(e => e.latex).join(', ')}`, text: `${all} except ${ex.map(e => e.text).join(', ')}` });
        return;
      }
      case 'intervals': {
        if (s.intervals.length === 1 && this.whole(s.intervals[0])) { this.push('solution', depth, { latex: '\\text{All real numbers}', text: 'All real numbers' }); return; }
        const parts = s.intervals.map(i => this.interval(i));
        this.push('solution', depth, { latex: `${lhs.latex} \\in ${parts.map(p => p.latex).join(' \\cup ')}`, text: `${lhs.text} ∈ ${parts.map(p => p.text).join(' ∪ ')}` });
        return;
      }
      case 'union': s.sets.forEach(x => this.set(x, depth)); return;
      case 'case-tree':
        for (const c of s.cases) {
          if (c.conditions.length === 0) { this.set(c.set, depth); continue; }
          const cond = this.conditions(c.conditions);
          this.push('case', depth, { latex: `\\text{If } ${cond.latex}\\text{:}`, text: `If ${cond.text}:` });
          this.set(c.set, depth + 1);
        }
        return;
      case 'periodic-set': {
        const k = this.fresh('k'), kp = printEquationMath(k) ?? { latex: k, text: k };
        const range = this.whole(s.range) ? { latex: '', text: '' } : (() => { const r = this.interval(s.range); return { latex: `,\\ ${lhs.latex} \\in ${r.latex}`, text: `, ${lhs.text} ∈ ${r.text}` }; })();
        const tail = { latex: `,\\ ${kp.latex} \\in \\mathbb{Z}${range.latex}`, text: `, ${kp.text} ∈ ℤ${range.text}` };
        for (const c of s.components) {
          if (c.lo.kind === 'value' && c.hi.kind === 'value' && JSON.stringify(c.lo.value.mathJson) === JSON.stringify(c.hi.value.mathJson)) {
            const v = this.shifted(c.lo.value, s.period, k);
            this.push('solution', depth, { latex: `${lhs.latex} = ${v.latex}${tail.latex}`, text: `${lhs.text} = ${v.text}${tail.text}` });
          } else {
            const lo = c.lo.kind === 'value' ? this.shifted(c.lo.value, s.period, k) : this.endpoint(c.lo), hi = c.hi.kind === 'value' ? this.shifted(c.hi.value, s.period, k) : this.endpoint(c.hi);
            this.push('solution', depth, { latex: `${lhs.latex} \\in \\left${c.loClosed ? '[' : '('}${lo.latex}, ${hi.latex}\\right${c.hiClosed ? ']' : ')'}${tail.latex}`, text: `${lhs.text} ∈ ${c.loClosed ? '[' : '('}${lo.text}, ${hi.text}${c.hiClosed ? ']' : ')'}${tail.text}` });
          }
        }
        return;
      }
      case 'interval-family': {
        const lo = this.exact(s.lo), hi = this.exact(s.hi), kp = printEquationMath(s.parameter) ?? { latex: s.parameter, text: s.parameter };
        const range = s.from !== undefined && s.to !== undefined ? `${s.from}, …, ${s.to}` : s.from !== undefined ? `${s.from}, ${BigInt(s.from) + 1n}, ${BigInt(s.from) + 2n}, …`
          : s.to !== undefined ? `…, ${BigInt(s.to) - 1n}, ${s.to}` : undefined;
        const tail = range ? { latex: `,\\ ${kp.latex} = ${range.replace('…', '\\ldots')}`, text: `, ${kp.text} = ${range}` } : { latex: `,\\ ${kp.latex} \\in \\mathbb{Z}`, text: `, ${kp.text} ∈ ℤ` };
        this.push('solution', depth, { latex: `${lhs.latex} \\in \\left${s.loClosed ? '[' : '('}${lo.latex}, ${hi.latex}\\right${s.hiClosed ? ']' : ')'}${tail.latex}`, text: `${lhs.text} ∈ ${s.loClosed ? '[' : '('}${lo.text}, ${hi.text}${s.hiClosed ? ']' : ')'}${tail.text}` });
        return;
      }
      case 'root-set': {
        const poly = printEquationMath(s.polynomial.mathJson, { descendingIn: this.#targets[0] }) ?? this.exact(s.polynomial);
        this.push('solution', depth, { latex: `${lhs.latex}\\text{ is any root of } ${poly.latex} = 0`, text: `${lhs.text} is any root of ${poly.text} = 0` });
        return;
      }
      case 'periodic': {
        const ks = s.integerParameters.map(k => printEquationMath(k) ?? { latex: k, text: k });
        const vals = s.values.map(v => this.exact(v));
        const value = vals.length === 1 ? vals[0] : { latex: `\\left(${vals.map(v => v.latex).join(', ')}\\right)`, text: `(${vals.map(v => v.text).join(', ')})` };
        const where = s.constraints.length ? (() => { const c = this.conditions(s.constraints); return { latex: `,\\ ${c.latex}`, text: `, ${c.text}` }; })() : { latex: '', text: '' };
        this.push('solution', depth, { latex: `${lhs.latex} = ${value.latex},\\ ${ks.map(k => k.latex).join(', ')} \\in \\mathbb{Z}${where.latex}`, text: `${lhs.text} = ${value.text}, ${ks.map(k => k.text).join(', ')} ∈ ℤ${where.text}` });
        return;
      }
      case 'parametric': {
        const free = s.freeParameters.map(f => printEquationMath(f) ?? { latex: f, text: f });
        const deps = s.variables.map((t, i) => [t, s.values[i]] as const).filter(([t]) => !s.freeParameters.includes(t));
        const eqs = deps.map(([t, v]) => { const n = printEquationMath(t) ?? { latex: t, text: t }, e = this.exact(v); return { latex: `${n.latex} = ${e.latex}`, text: `${n.text} = ${e.text}` }; });
        const freeP = { latex: `${free.map(f => f.latex).join(', ')} \\in ${space.latex}`, text: `${free.map(f => f.text).join(', ')} ∈ ${space.text}` };
        const parts = [...eqs, freeP, ...(s.constraints.length ? [this.conditions(s.constraints)] : [])];
        this.push('solution', depth, { latex: parts.map(p => p.latex).join(',\\ '), text: parts.map(p => p.text).join(', ') });
        return;
      }
      case 'reduced-form': {
        const rel: Record<string, [string, string]> = { eq: ['=', '='], ne: ['\\ne', '≠'], lt: ['<', '<'], le: ['\\le', '≤'] };
        const parts = s.relations.map(r => { const a = this.exact(r.lhs), b = this.exact(r.rhs); return { latex: `${a.latex} ${rel[r.op][0]} ${b.latex}`, text: `${a.text} ${rel[r.op][1]} ${b.text}` }; });
        if (s.conditions.length) parts.push(this.conditions(s.conditions));
        this.push('solution', depth, { latex: `\\text{Equivalent to: } ${parts.map(p => p.latex).join(',\\ ')}`, text: `Equivalent to: ${parts.map(p => p.text).join(', ')}` });
        return;
      }
      case 'unconfirmed':
        for (const c of s.candidates) this.solutionRow(depth, c.point, { latex: '\\ \\text{(candidate, not confirmed)}', text: ' (candidate, not confirmed)' });
        return;
    }
  }

  order(points: readonly CanonicalMathValueV2[][]): CanonicalMathValueV2[][] {
    const core = this.#core;
    if (!core) return [...points];
    const values = points.map(p => p.map(v => this.pointValue(v)));
    if (values.some(p => p.some(v => v === undefined))) return [...points];
    const index = new Map(values.map((p, i) => [p, i] as const));
    return orderPoints(core.store, values as PointValue[][], this.#domain).map(p => points[index.get(p as PointValue[]) as number]);
  }

  // ---- definitions ----

  definitions(): void {
    const seen = new Set<string>();
    for (let progress = true; progress;) {
      progress = false;
      for (const s of [...this.used]) {
        if (seen.has(s)) continue;
        seen.add(s); progress = true;
        this.definition(this.#binder.get(s) as CanonicalEquationRootBinderV6);
      }
    }
  }

  /** Which root a binder is, in words, with its polynomial in `variable`. */
  describe(b: CanonicalEquationRootBinderV6, variable: string): P {
    const rename = (j: SerializableMathJson): SerializableMathJson => (j === b.symbol ? variable : Array.isArray(j) ? (j.map(x => rename(x as SerializableMathJson)) as unknown as SerializableMathJson) : j);
    const poly = printEquationMath(rename(b.polynomial.mathJson), { descendingIn: variable }) ?? { latex: b.polynomial.canonicalLatex, text: b.polynomial.canonicalLatex };
    const eq = { latex: `${poly.latex} = 0`, text: `${poly.text} = 0` };
    if (b.kind === 'indexed-real-root') {
      const which = b.index === 1 ? 'smallest' : `${ORDINAL(b.index)} smallest`;
      return { latex: `\\text{the ${which} real root of } ${eq.latex}`, text: `the ${which} real root of ${eq.text}` };
    }
    if (b.kind === 'complex-algebraic') {
      if (!this.#copy) return { latex: `\\text{a root of } ${eq.latex}`, text: `a root of ${eq.text}` };
      const re = this.exact(b.re), im = this.exact(b.im), r = this.exact(b.radius), v = printEquationMath(variable) ?? { latex: variable, text: variable };
      return { latex: `\\text{the root of } ${eq.latex}\\text{ with } \\left|${v.latex} - \\left(${re.latex} + ${im.latex}i\\right)\\right| \\le ${r.latex}`, text: `the root of ${eq.text} with |${v.text} - (${re.text} + ${im.text}i)| ≤ ${r.text}` };
    }
    const rank = this.#copy ? undefined : this.#rank(b.symbol);
    if (rank && rank.count === 1) return { latex: `\\text{the real root of } ${eq.latex}`, text: `the real root of ${eq.text}` };
    if (rank) {
      const which = rank.index === 1 ? 'smallest' : rank.index === rank.count ? 'largest' : `${ORDINAL(rank.index)} smallest`;
      return { latex: `\\text{the ${which} real root of } ${eq.latex}`, text: `the ${which} real root of ${eq.text}` };
    }
    const lo = this.exact(b.lo), hi = this.exact(b.hi);
    return { latex: `\\text{the real root of } ${eq.latex}\\text{ in } \\left(${lo.latex}, ${hi.latex}\\right)`, text: `the real root of ${eq.text} in (${lo.text}, ${hi.text})` };
  }

  /** Position of a real algebraic binder among the real roots of its minimal polynomial. */
  #rank(symbol: string): { index: number; count: number } | undefined {
    const core = this.#core, v = core?.binders.algebraic.get(symbol);
    if (!core || !v || v.root.kind !== 'real') return undefined;
    try {
      const ctx = core.store.ctx, reals = core.store.roots.roots(ctx, v.root.poly).filter(r => r.kind === 'real') as RealRootOf[];
      return { index: 1 + reals.filter(r => compareReal(ctx, r, v.root as RealRootOf) < 0).length, count: reals.length };
    } catch (e) {
      if (e instanceof EquationAlgebraError) return undefined;
      throw e;
    }
  }

  definition(b: CanonicalEquationRootBinderV6): void {
    const name = printEquationMath(b.symbol) ?? { latex: b.symbol, text: b.symbol };
    const d = this.#copy ? undefined : this.#decimal({ mathJson: b.symbol, canonicalLatex: '' });
    const approx = d ? (() => { const t = this.decimalText(d); return { latex: ` \\approx ${t.latex}`, text: ` ≈ ${t.text}` }; })() : { latex: '', text: '' };
    const what = this.describe(b, b.symbol);
    this.push('definition', 1, { latex: `${name.latex}${approx.latex}:\\ ${what.latex}`, text: `${name.text}${approx.text}: ${what.text}` });
  }

  /** "Assuming a > 0 and b ≠ 1": the assumptions, laid out like conditions. */
  assumptions(): void {
    const rs = this.#doc.primary.assumptions ?? [];
    if (rs.length === 0) return;
    const zero = (v: SerializableMathJson) => v === 0;
    // As one side against 0 (ring identity), so the printer lays it out like a condition: 1 < a reads a > 1.
    const parts = rs.map(r => {
      const l = this.exactJson(r.lhs), g = this.exactJson(r.rhs);
      const side: SerializableMathJson = zero(g) ? l : zero(l) ? ['Negate', g] : ['Add', l, ['Negate', g]];
      return printRelation(side, r.op, 0, { constants: this.#constants }) ?? { latex: `${r.lhs.canonicalLatex} ${RELATION_LATEX[r.op]} ${r.rhs.canonicalLatex}`, text: `${r.lhs.canonicalLatex} ${RELATION_LATEX[r.op]} ${r.rhs.canonicalLatex}` };
    });
    this.push('assumption', 0, { latex: `\\text{Assuming }${parts.map(p => p.latex).join('\\text{ and }')}`, text: `Assuming ${parts.map(p => p.text).join(' and ')}` });
  }

  build(): void {
    const o = this.#doc.primary.outcome;
    this.assumptions();
    switch (o.kind) {
      case 'solved': this.set(o.set, 0); break;
      case 'empty': this.push('solution', 0, { latex: '\\text{No solution}', text: 'No solution' }); break;
      case 'undecided': this.rows.push(textRow('message', 0, `Not decided: ${o.reason}`)); break;
      case 'incomplete': this.rows.push(textRow('message', 0, `Not solved yet: ${o.reason}`)); break;
      case 'unsupported': this.rows.push(textRow('message', 0, `Not supported: ${o.reason}`)); break;
      case 'stopped': this.rows.push(textRow('message', 0, STOPS[o.stop])); break;
    }
    this.definitions();
  }
}

function coreFor(doc: CanonicalResultDocumentV6, ctx: ExecutionContext): Core {
  const store = new ExpressionStore(ctx), binders = readRootBinders(store, doc);
  const values = new Map<string, ExprId>(), forms = new Map<string, ExprId>();
  for (const [s, v] of binders.algebraic) {
    const id = store.algebraic(v.root);
    values.set(s, id);
    // A closed form replaces the binder only when the core proves it equal to the root.
    const form = 'form' in v ? v.form : undefined;
    if (form !== undefined && provenEqual(store, form, id, doc.primary.domain)) forms.set(s, form);
  }
  return { store, binders, values, forms };
}

function present(doc: CanonicalResultDocumentV6, settings: EquationPresentationSettings, core: Core | undefined): EquationPresentation {
  const screen = new Layout(doc, core, settings, false);
  screen.build();
  const copy = new Layout(doc, core, settings, true);
  copy.build();
  const o = doc.primary.outcome;
  return {
    outcome: o.kind,
    rows: screen.rows,
    copyLatex: copy.rows.map(r => r.latex).join(' \\\\ '),
    plainText: screen.rows.map(r => `${'  '.repeat(r.depth)}${r.text}`).join('\n'),
    ...(o.kind === 'incomplete' ? { owner: o.owner } : {}),
    fallback: core === undefined,
  };
}

/**
 * Conditions on the problem's own expressions (no root binders), each laid out like a case condition, in reading
 * order. Each value must be in the V6 grammar with its canonical LaTeX (the caller projects them).
 */
export function presentConditionList(conditions: readonly CanonicalEquationConditionV6[]): { latex: string; text: string }[] {
  const op: Record<string, RelationOperator> = { nonzero: 'ne', positive: 'gt', nonnegative: 'ge', equal: 'eq', 'not-equal': 'ne' };
  return conditions.map(c => {
    if (c.kind === 'in-domain') { const e = printEquationMath(c.expr.mathJson); return e ? { latex: `${e.latex}\\text{ is defined}`, text: `${e.text} is defined` } : { latex: c.expr.canonicalLatex, text: c.expr.canonicalLatex }; }
    return printRelation(c.expr.mathJson, op[c.kind], 'other' in c ? c.other.mathJson : 0) ?? { latex: c.expr.canonicalLatex, text: c.expr.canonicalLatex };
  }).map(p => ({ latex: p.latex, text: p.text }));
}

/** Present a V6 Equation document. `ctx` budgets the core work (rewrites, decimals, order); a stop falls back. */
export function presentEquationV6(input: unknown, settings: EquationPresentationSettings, ctx: ExecutionContext): EquationPresentation {
  const checked = validateCanonicalResultDocumentV6(input);
  if (!checked.ok) throw new Error(`Not a valid V6 Equation document: ${checked.failure.message}`);
  const doc = checked.validated.value;
  try {
    return present(doc, settings, coreFor(doc, ctx));
  } catch (e) {
    if (e instanceof EquationAlgebraError && e.code === 'resource') return present(doc, settings, undefined);
    throw e;
  }
}
