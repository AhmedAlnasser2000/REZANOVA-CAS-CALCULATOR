import { ComputeEngine } from '@cortex-js/compute-engine';
import { containsTarget, isArrayNode, latexForNode } from './math-json';
import type { MathJson } from './types';

export type ComplexLocusCarrierKind =
  | 'absolute-value'
  | 'conjugate'
  | 'real-part'
  | 'imaginary-part';

export type ComplexLocusCarrier = {
  kind: ComplexLocusCarrierKind;
  latex: string;
  label: string;
};

export type ComplexLocusPolicyReport = {
  hasLocusDeferredCarrier: boolean;
  carriers: ComplexLocusCarrier[];
  detailLines: string[];
};

const ce = new ComputeEngine();

const LOCUS_OPERATORS = new Map<string, { kind: ComplexLocusCarrierKind; label: string }>([
  ['Abs', { kind: 'absolute-value', label: 'absolute-value magnitude' }],
  ['Re', { kind: 'real-part', label: 'real-part projection' }],
  ['Im', { kind: 'imaginary-part', label: 'imaginary-part projection' }],
  ['OverBar', { kind: 'conjugate', label: 'complex conjugate' }],
  ['Conjugate', { kind: 'conjugate', label: 'complex conjugate' }],
  ['conjugate', { kind: 'conjugate', label: 'complex conjugate' }],
  ['Conj', { kind: 'conjugate', label: 'complex conjugate' }],
  ['conj', { kind: 'conjugate', label: 'complex conjugate' }],
]);

export function normalizeComplexLocusFunctionSyntax(latex: string) {
  return latex
    .replace(/\bconj\s*\(/giu, '\\operatorname{conj}(')
    .replace(/\bconjugate\s*\(/giu, '\\operatorname{conj}(')
    .replace(/\bRe\s*\(/gu, '\\operatorname{Re}(')
    .replace(/\bIm\s*\(/gu, '\\operatorname{Im}(')
    .replace(/\babs\s*\(/giu, '\\operatorname{abs}(');
}

function zeroFormNode(node: MathJson): MathJson {
  return isArrayNode(node) && node[0] === 'Equal' && node.length === 3
    ? ['Subtract', node[1] as MathJson, node[2] as MathJson]
    : node;
}

function carrierForNode(node: MathJson, target: string): ComplexLocusCarrier | null {
  if (!isArrayNode(node) || typeof node[0] !== 'string' || node.length < 2) {
    return null;
  }
  const operator = node[0];
  const policy = LOCUS_OPERATORS.get(operator);
  if (!policy || !containsTarget(node[1], target)) {
    return null;
  }
  return {
    ...policy,
    latex: latexForNode(node),
  };
}

function collectCarriers(node: MathJson, target: string, carriers: ComplexLocusCarrier[]) {
  const carrier = carrierForNode(node, target);
  if (carrier) {
    carriers.push(carrier);
  }
  if (!isArrayNode(node)) {
    return;
  }
  for (const child of node.slice(1)) {
    collectCarriers(child as MathJson, target, carriers);
  }
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function lexicalFallbackCarriers(expressionLatex: string, target: string): ComplexLocusCarrier[] {
  const compact = expressionLatex.replace(/\s+/gu, '');
  const escapedTarget = escapeRegExp(target);
  const carriers: ComplexLocusCarrier[] = [];
  const patterns: Array<{ kind: ComplexLocusCarrierKind; label: string; pattern: RegExp; latex: string }> = [
    {
      kind: 'conjugate',
      label: 'complex conjugate',
      pattern: new RegExp(`(?:^|[^A-Za-z\\\\])(?:conj|Conj|conjugate|Conjugate)\\(?${escapedTarget}`, 'u'),
      latex: `\\operatorname{conj}\\left(${target}\\right)`,
    },
    {
      kind: 'real-part',
      label: 'real-part projection',
      pattern: new RegExp(`(?:^|[^A-Za-z\\\\])Re\\(?${escapedTarget}`, 'u'),
      latex: `\\operatorname{Re}\\left(${target}\\right)`,
    },
    {
      kind: 'imaginary-part',
      label: 'imaginary-part projection',
      pattern: new RegExp(`(?:^|[^A-Za-z\\\\])Im\\(?${escapedTarget}`, 'u'),
      latex: `\\operatorname{Im}\\left(${target}\\right)`,
    },
  ];
  for (const entry of patterns) {
    if (entry.pattern.test(compact)) {
      carriers.push({
        kind: entry.kind,
        label: entry.label,
        latex: entry.latex,
      });
    }
  }
  return carriers;
}

function uniqueCarriers(carriers: readonly ComplexLocusCarrier[]) {
  const seen = new Set<string>();
  const unique: ComplexLocusCarrier[] = [];
  for (const carrier of carriers) {
    const key = `${carrier.kind}:${carrier.latex}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(carrier);
  }
  return unique;
}

export function diagnoseComplexLocusPolicyForLatex(
  expressionLatex: string,
  options: { target: string },
): ComplexLocusPolicyReport {
  const carriers: ComplexLocusCarrier[] = [];
  try {
    collectCarriers(zeroFormNode(ce.parse(normalizeComplexLocusFunctionSyntax(expressionLatex)).json as MathJson), options.target, carriers);
  } catch {
    // Lexical fallback below covers the user-facing typed forms that matter here.
  }
  carriers.push(...lexicalFallbackCarriers(expressionLatex, options.target));
  const unique = uniqueCarriers(carriers);
  if (unique.length === 0) {
    return {
      hasLocusDeferredCarrier: false,
      carriers: [],
      detailLines: ['No absolute-value, conjugate, real-part, or imaginary-part locus carrier was detected.'],
    };
  }
  return {
    hasLocusDeferredCarrier: true,
    carriers: unique,
    detailLines: [
      'Complex non-holomorphic or locus carriers are outside analytic contour solving.',
      `Detected locus carriers: ${unique.map((carrier) => `${carrier.latex} (${carrier.label})`).join('; ')}.`,
      'These equations can describe curves, regions, or two-real-variable conditions rather than isolated holomorphic zeros.',
      'A future locus engine must rewrite them into coupled real-variable conditions before solving or graphing.',
      'Ledger scope for this route is locus-deferred; it is not a bounded-region numeric result.',
    ],
  };
}
