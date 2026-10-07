import type { CanonicalResultDocument } from '../../types/calculator/canonical-result-current';
import type { CanonicalMathValueV2, SerializableMathJson } from '../../types/calculator';
import { integrationPrinter, presentIntegrationMath, type IntegrationMathPresentation } from '../display/printer/integration';
import type { MathJsonValidationLimits } from '../display/printer/math-json';
import { exactSymbolLatex } from './exact-arithmetic-latex';
import { CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_NODES } from './validation';
import { requireCanonicalResultAuthority } from './current';

type Condition = {latex: string; origins: string[]};
type Term = {definition: string; modulus: string; argument: string};
export type IntegrationPresentation = {
  compact: string; generatorDefinition?: string; fallbackDefinition?: string; negative?: boolean; explanation?: string; expansionUnavailable: () => string | undefined; terms: Term[]; conditions: Condition[]; originals: Condition[];
  expanded: () => string; copy: () => string;
};
const aligned = (parts: string[]) => parts.length === 1 ? parts[0]
  : `\\begin{aligned}&${parts[0]}${parts.slice(1).map(v => `\\\\&${v.startsWith('-') ? '' : '\\mathbin{\\large\\boldsymbol{+}}\\;'}${v}`).join('')}\\end{aligned}`;

/** A canonical-derived, optional display projection. Never used by proof checking or artifact export. */
export function readIntegrationPresentation(document: CanonicalResultDocument,
  limits: MathJsonValidationLimits = {}): IntegrationPresentation | undefined {
  // Authority/shape errors are not optional formatting errors.
  const native = requireCanonicalResultAuthority(document);
  const primary = native.primary;
  const formal = primary?.kind === 'rational-antiderivative' || primary?.kind === 'exponential-antiderivative' ? primary : undefined;
  const negative = primary?.kind === 'non-elementary' ? primary : undefined;
  const construction = formal?.kind === 'exponential-antiderivative' ? formal.construction : negative?.construction;
  const bindings = new Map<string, SerializableMathJson>();
  let generatorDefinition: string | undefined, fallbackDefinition: string | undefined, expansionFailure: string | undefined;
  if (construction && construction.kind === 'rational-exponential') bindings.set(construction.generator, construction.argument.mathJson);
  const byteLimit = Math.min(limits.maxBytes ?? CANONICAL_RESULT_MAX_BYTES, CANONICAL_RESULT_MAX_BYTES);
  const nodeLimit = Math.min(limits.maxNodes ?? CANONICAL_RESULT_MAX_NODES, CANONICAL_RESULT_MAX_NODES);
  let expandedTraversalExceeded = false;
  const output = (text: string) => {if (text.length > byteLimit || new TextEncoder().encode(text).length > byteLimit) throw Error('Presentation output limit'); return text;};
  const cache = new Map<CanonicalMathValueV2, Map<string, IntegrationMathPresentation>>();
  if (document.outcomeKind !== 'success') return undefined;
  const originalConditions: Condition[] = [], conditions: Condition[] = [], seen = new Map<string, Condition>();
  const format = (value: CanonicalMathValueV2, variables: string[], expand = true): IntegrationMathPresentation => {
    const key = JSON.stringify([variables, expand]);
    let entry = cache.get(value); if (!entry) {entry = new Map(); cache.set(value, entry);}
    const known = entry.get(key); if (known) return known;
    const save = (p: IntegrationMathPresentation) => {entry!.set(key, p); return p;};
    try {
      if (expand && bindings.size && expandedTraversalExceeded) throw Error('Full expansion traversal limit');
      const p = presentIntegrationMath(value.mathJson, variables, limits, expand ? bindings : undefined);
      const printed = integrationPrinter.print(p, {profile: 'pedagogical-v1', target: 'visible-latex'}, undefined);
      if (!printed.ok) throw Error(printed.message);
      return save({...p, latex: printed.text});
    } catch {
      if (expand && bindings.size) expansionFailure = 'Full expansion is unavailable within presentation limits. The exact answer and generator definition remain available.';
      return save({latex: value.canonicalLatex, key: JSON.stringify(value.mathJson), zero: false, one: false, nonzeroConstant: false});
    }
  };
  const addCondition = (value: CanonicalMathValueV2, origin: string, variables: string[], isRelation = false) => {
    const original = format(value, variables).latex + (isRelation ? '' : '\\ne0');
    originalConditions.push({latex: original, origins: [origin]});
    let operand = value;
    if (isRelation) {
      const t = value.mathJson;
      if (!Array.isArray(t) || t[0] !== 'NotEqual' || t.length !== 3 || !(t[2] === 0 || (typeof t[2] === 'object' && t[2] && 'num' in t[2] && t[2].num === '0'))) {
        conditions.push({latex: format(value, variables).latex, origins: [origin]}); return;
      }
      // Existing Ordinary supplements expose their polynomial as native MathJSON. No LaTeX readback.
      operand = {mathJson: t[1], canonicalLatex: ''};
    }
    const p = format(operand, variables);
    // A failed ordinary operand format falls back to the entire original relation.
    const latex = p.latex ? p.latex + '\\ne0' : original;
    if (p.nonzeroConstant) return;
    const found = seen.get(p.key);
    if (found) {if (!found.origins.includes(origin)) found.origins.push(origin);}
    else {const c = {latex, origins: [origin]}; seen.set(p.key, c); conditions.push(c);}
  };
  const terms: Term[] = [];
  let compact: string;
  let expanded: () => string;
  if (formal || negative) {
    const p = (formal ?? negative)!;
    let extra = 0, argumentNodes = 0, displayNodes = 0;
    if (construction && construction.kind === 'rational-exponential') {
      const count = (t: SerializableMathJson) => {argumentNodes++; if (Array.isArray(t)) (t as SerializableMathJson[]).slice(1).forEach(count);};
      count(construction.argument.mathJson);
      const scan = (t: SerializableMathJson) => {displayNodes++; if (t === construction.generator) extra += argumentNodes; else if (Array.isArray(t)) (t as SerializableMathJson[]).slice(1).forEach(scan);};
      if ('fieldPart' in p) scan(p.fieldPart.mathJson); if ('subject' in p) scan(p.subject.mathJson);
      if ('terms' in p) p.terms.forEach(t => {scan(t.argument.mathJson); scan(t.norm.mathJson);});
      p.restrictions.forEach(r => scan(r.value.mathJson));
      expandedTraversalExceeded = displayNodes + extra > nodeLimit;
      generatorDefinition = `${exactSymbolLatex(construction.generator)}=e^{${format(construction.argument, [p.variable]).latex}}`;
    }
    const abbreviate = extra > 256;
    const render = (value: CanonicalMathValueV2, variables: string[], full = false) => format(value, variables, full || !abbreviate);
    if (negative) {
      compact = render(negative.subject, [negative.variable]).latex;
      expanded = () => render(negative.subject, [negative.variable], true).latex;
    } else {
    const p = formal!, variable = exactSymbolLatex(p.variable), constant = exactSymbolLatex(p.integrationConstant);
    const rational = render(p.kind === 'rational-antiderivative' ? p.rationalPart : p.fieldPart, [p.variable]);
    const formatted = p.terms.map((t, i) => {
      const vars = [p.variable, t.rootVariable], root = exactSymbolLatex(t.rootVariable), j = i + 1;
      const modulus = render(t.modulus, [t.rootVariable]).latex, w = render(t.weight, [t.rootVariable]),
        argument = render(t.argument, vars).latex;
      const weight = w.one ? '' : `\\left(${w.latex}\\right)`;
      terms.push({definition: `L_{${j}}=\\sum_{${root}:\\,q_{${j}}(${root})=0}${weight}\\log\\left(G_{${j}}(${variable},${root})\\right)`,
        modulus: `q_{${j}}(${root})=${modulus}`, argument: `G_{${j}}(${variable},${root})=${argument}`});
      return {root, modulus, weight, argument};
    });
    const prefix = rational.zero ? [] : [rational.latex];
    compact = [...prefix, ...terms.map((_, i) => `L_{${i + 1}}`), constant].join('+');
    let cached: string | undefined;
    expanded = () => {
      if (cached !== undefined) return cached;
      try {
        const part = render(p.kind === 'rational-antiderivative' ? p.rationalPart : p.fieldPart, [p.variable], true);
        cached = output(aligned([...(part.zero ? [] : [part.latex]), ...formatted.map((t, i) =>
          `\\sum_{${t.root}:\\,${t.modulus}=0}${t.weight}\\log\\left(${render(p.terms[i].argument, [p.variable, p.terms[i].rootVariable], true).latex}\\right)`), constant]));
      } catch {expansionFailure = 'Full expansion is unavailable within presentation limits. The exact answer and definitions remain available.'; cached = compact;}
      return cached;
    };
    }
    fallbackDefinition = generatorDefinition;
    if (!abbreviate) generatorDefinition = undefined;
    const labels = {'source': 'Source exclusion', 'argument-denominator': 'Argument denominator', 'input-denominator': 'Input denominator',
      'primitive-denominator': 'Primitive denominator', 'coefficient-denominator': 'Coefficient denominator', 'log-norm': 'Log norm'};
    p.restrictions.forEach(r => r.origins.forEach(o => addCondition(r.value, `${labels[o.category]} (${o.path})`, [p.variable])));
  } else {
    if (native.primary?.kind !== 'math') return undefined;
    const tree = native.primary.value.mathJson;
    // An ordinary integration answer is rationalPart + fresh constant. Derive symbols from native data only.
    const symbols = new Set<string>();
    const collect = (t: SerializableMathJson) => {if (typeof t === 'string') symbols.add(t); else if (Array.isArray(t)) (t as SerializableMathJson[]).slice(1).forEach(collect);};
    if (Array.isArray(tree) && tree[0] === 'Add') (tree as SerializableMathJson[]).slice(1, -1).forEach(collect);
    const supplements = native.supplements ?? [];
    supplements.forEach(s => collect(s.math.mathJson));
    compact = format(native.primary.value, [...symbols]).latex;
    expanded = () => compact;
    supplements.forEach((s, i) => addCondition(s.math, i < supplements.length - 2 ? 'Source exclusion' : i === supplements.length - 2 ? 'Input denominator' : 'Primitive denominator', [...symbols], true));
  }
  return {compact, terms, conditions, originals: originalConditions, expanded, generatorDefinition, fallbackDefinition, negative: Boolean(negative),
    explanation: negative ? negative.obstruction === 'nonconstant-residue'
      ? 'A checked normal residue is nonconstant. No elementary antiderivative exists for this expression.'
      : 'A complete rational differential-equation certificate obstructs a Laurent component. No elementary antiderivative exists for this expression.' : undefined,
    expansionUnavailable: () => expansionFailure,
    copy: () => {
      const answer = expanded();
      const subject = negative ? `\\text{No elementary antiderivative exists for }\\int ${answer}\\,d${exactSymbolLatex(negative.variable)}` : answer;
      const definitions = expansionFailure ? [fallbackDefinition, ...(answer === compact ? terms.flatMap(t => [t.definition, t.modulus, t.argument]) : [])].filter(Boolean).join('\\qquad ') : '';
      try {return output(`${subject}${definitions ? `\\qquad ${definitions}` : ''}${conditions.length ? `\\qquad\\begin{gathered}${conditions.map(c => c.latex).join('\\\\')}\\end{gathered}` : ''}`);}
      catch {throw Error('Copy is unavailable within presentation limits. The verified answer remains available.');}
    }};
}
