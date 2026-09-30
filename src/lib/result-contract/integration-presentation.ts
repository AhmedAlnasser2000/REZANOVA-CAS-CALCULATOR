import type { CanonicalMathValueV2, CanonicalResultDocumentV2, CanonicalResultDocumentV5, SerializableMathJson } from '../../types/calculator';
import { integrationPrinter, presentIntegrationMath, type IntegrationMathPresentation } from '../display/printer/integration';
import type { MathJsonValidationLimits } from '../display/printer/math-json';
import { exactSymbolLatex } from './exact-arithmetic-latex';
import { validateCanonicalResultDocumentV5 } from './validation-v5';
import { resolveCanonicalResultForConsumer } from './consumer';

type Condition = {latex: string; origins: string[]};
type Term = {definition: string; modulus: string; argument: string};
export type IntegrationPresentation = {
  compact: string; terms: Term[]; conditions: Condition[]; originals: Condition[];
  expanded: () => string; copy: () => string;
};
const aligned = (parts: string[]) => parts.length === 1 ? parts[0]
  : `\\begin{aligned}&${parts[0]}${parts.slice(1).map(v => `\\\\&${v.startsWith('-') ? '' : '\\mathbin{\\large\\boldsymbol{+}}\\;'}${v}`).join('')}\\end{aligned}`;

/** A canonical-derived, optional display projection. Never used by proof checking or artifact export. */
export function readIntegrationPresentation(document: CanonicalResultDocumentV2 | CanonicalResultDocumentV5,
  limits: MathJsonValidationLimits = {}): IntegrationPresentation | undefined {
  // Authority/shape errors are not optional formatting errors.
  const checked = document.version === 5 ? validateCanonicalResultDocumentV5(document) : undefined;
  if (checked && !checked.ok) throw Error(checked.failure.message);
  const formal = checked?.ok ? {document: checked.validated.value} : undefined;
  const ordinary = document.version === 2 ? resolveCanonicalResultForConsumer(document.outcomeKind === 'success' ? {kind: 'success', canonicalResult: document} : {kind: 'error', canonicalResult: document}) : undefined;
  if (ordinary && !ordinary.ok) throw Error(ordinary.failure.message);
  if (document.outcomeKind !== 'success') return undefined;
  const originalConditions: Condition[] = [], conditions: Condition[] = [], seen = new Map<string, Condition>();
  const format = (value: CanonicalMathValueV2, variables: string[]): IntegrationMathPresentation => {
    try {
      const p = presentIntegrationMath(value.mathJson, variables, limits);
      const printed = integrationPrinter.print(p, {profile: 'pedagogical-v1', target: 'visible-latex'}, undefined);
      if (!printed.ok) throw Error(printed.message);
      return {...p, latex: printed.text};
    } catch {
      return {latex: value.canonicalLatex, key: JSON.stringify(value.mathJson), zero: false, one: false, nonzeroConstant: false};
    }
  };
  const addCondition = (value: CanonicalMathValueV2, origin: string, variables: string[], isRelation = false) => {
    const original = value.canonicalLatex + (isRelation ? '' : '\\ne0');
    originalConditions.push({latex: original, origins: [origin]});
    let operand = value;
    if (isRelation) {
      const t = value.mathJson;
      if (!Array.isArray(t) || t[0] !== 'NotEqual' || t.length !== 3 || !(t[2] === 0 || (typeof t[2] === 'object' && t[2] && 'num' in t[2] && t[2].num === '0'))) {
        conditions.push({latex: format(value, variables).latex, origins: [origin]}); return;
      }
      // Existing V2 supplements expose their polynomial as native MathJSON. No LaTeX readback.
      operand = {mathJson: t[1], canonicalLatex: ''};
    }
    const p = format(operand, variables);
    // A failed V2 operand format falls back to the entire original relation.
    const latex = p.latex ? p.latex + '\\ne0' : original;
    if (p.nonzeroConstant) return;
    const found = seen.get(p.key);
    if (found) {if (!found.origins.includes(origin)) found.origins.push(origin);}
    else {const c = {latex, origins: [origin]}; seen.set(p.key, c); conditions.push(c);}
  };
  const terms: Term[] = [];
  let compact: string;
  let expanded: () => string;
  if (formal) {
    const p = formal.document.primary, variable = exactSymbolLatex(p.variable), constant = exactSymbolLatex(p.integrationConstant);
    const rational = format(p.rationalPart, [p.variable]);
    const formatted = p.terms.map((t, i) => {
      const vars = [p.variable, t.rootVariable], root = exactSymbolLatex(t.rootVariable), j = i + 1;
      const modulus = format(t.modulus, [t.rootVariable]).latex, w = format(t.weight, [t.rootVariable]),
        argument = format(t.argument, vars).latex;
      const weight = w.one ? '' : `\\left(${w.latex}\\right)`;
      terms.push({definition: `L_{${j}}=\\sum_{${root}:\\,q_{${j}}(${root})=0}${weight}\\log\\left(G_{${j}}(${variable},${root})\\right)`,
        modulus: `q_{${j}}(${root})=${modulus}`, argument: `G_{${j}}(${variable},${root})=${argument}`});
      return {root, modulus, weight, argument};
    });
    const prefix = rational.zero ? [] : [rational.latex];
    compact = [...prefix, ...terms.map((_, i) => `L_{${i + 1}}`), constant].join('+');
    let cached: string | undefined;
    expanded = () => cached ??= aligned([...prefix, ...formatted.map(t =>
      `\\sum_{${t.root}:\\,${t.modulus}=0}${t.weight}\\log\\left(${t.argument}\\right)`), constant]);
    p.conditions.sourceExclusions.forEach(v => addCondition(v, 'Source exclusion', [p.variable]));
    addCondition(p.conditions.inputDenominator, 'Input denominator', [p.variable]);
    addCondition(p.conditions.rationalDenominator, 'Primitive denominator', [p.variable]);
    p.conditions.logNorms.forEach(v => addCondition(v, 'Log norm', [p.variable]));
  } else {
    if (document.version !== 2 || !ordinary?.ok) return undefined;
    const native = ordinary.rawDocument;
    if (native.version !== 2 || native.primary?.kind !== 'math') return undefined;
    const tree = native.primary.value.mathJson;
    // A V2 integration answer is rationalPart + fresh constant. Derive symbols from native data only.
    const symbols = new Set<string>();
    const collect = (t: SerializableMathJson) => {if (typeof t === 'string') symbols.add(t); else if (Array.isArray(t)) (t as SerializableMathJson[]).slice(1).forEach(collect);};
    if (Array.isArray(tree) && tree[0] === 'Add') (tree as SerializableMathJson[]).slice(1, -1).forEach(collect);
    const supplements = native.supplements ?? [];
    supplements.forEach(s => collect(s.math.mathJson));
    compact = format(native.primary.value, [...symbols]).latex;
    expanded = () => compact;
    supplements.forEach((s, i) => addCondition(s.math, i < supplements.length - 2 ? 'Source exclusion' : i === supplements.length - 2 ? 'Input denominator' : 'Primitive denominator', [...symbols], true));
  }
  return {compact, terms, conditions, originals: originalConditions, expanded,
    copy: () => `${expanded()}${conditions.length ? `\\qquad\\begin{gathered}${conditions.map(c => c.latex).join('\\\\')}\\end{gathered}` : ''}`};
}
