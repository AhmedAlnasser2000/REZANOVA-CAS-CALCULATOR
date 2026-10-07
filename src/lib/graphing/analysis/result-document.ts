import { buildCanonicalResultDocument } from '../../result-contract/current';
import {
  requireProvenCanonicalMathValueV2,
} from '../../result-contract';
import type {
  GraphAnalysisEvidenceV1,
  GraphAnalysisRequestV1,
  GraphFeatureValueV1,
} from '../contracts';

function exactValue(value: GraphFeatureValueV1 | undefined) {
  return value?.kind === 'exact' ? value.value : undefined;
}

function reproveExact(value: ReturnType<typeof exactValue>) {
  if (!value) return undefined;
  return requireProvenCanonicalMathValueV2({ canonicalLatex: value.canonicalLatex,
    mathJson: value.mathJson, owner: 'graphing', routeId: 'graphing.analysis',
    source: 'Graph analysis canonical result summary' });
}

export function graphAnalysisExactValue(value: number) {
  const canonicalLatex = Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(14)));
  return requireProvenCanonicalMathValueV2({
    canonicalLatex,
    mathJson: value,
    owner: 'graphing',
    routeId: 'graphing.analysis',
    source: 'Graph analysis exact numeric producer',
  });
}

/**
 * An exact value in closed form (√2, −1/2 + √13/2) when the producer has one;
 * the plain number otherwise, or if the closed form is not accepted.
 */
export function graphAnalysisExactForm(value: number, form?: { latex: string; mathJson: unknown }) {
  if (form) {
    try {
      return requireProvenCanonicalMathValueV2({
        canonicalLatex: form.latex, mathJson: form.mathJson, owner: 'graphing', routeId: 'graphing.analysis',
        source: 'Graph analysis exact closed-form producer',
      });
    } catch {
      // Fall through to the number, which is always accepted.
    }
  }
  return graphAnalysisExactValue(value);
}

/**
 * Evidence for a stretch (a root or intersection on a whole interval): no
 * coordinates, so it is never a dot or a trace snap, only its interval, with
 * ends at the window's edge marked open-ended.
 */
export function graphStretchEvidence(
  stretch: { minimum: number; maximum: number; minimumInclusive: boolean; maximumInclusive: boolean },
  window: { xMin: number; xMax: number },
  validator: string,
) {
  const edge = (window.xMax - window.xMin) * 1e-9;
  return {
    detail: { interval: { ...stretch,
      minimumOpenEnded: stretch.minimum <= window.xMin + edge, maximumOpenEnded: stretch.maximum >= window.xMax - edge } },
    basis: { source: 'numeric-validator' as const, validator },
  };
}

/** The number an exact value's MathJSON stands for (numbers, rationals, roots, sums and products). */
export function graphExactMathJsonNumber(node: unknown): number | undefined {
  if (typeof node === 'number') return node;
  if (!Array.isArray(node) || typeof node[0] !== 'string') return undefined;
  const args = node.slice(1).map(graphExactMathJsonNumber);
  if (args.some((value) => value === undefined)) return undefined;
  const values = args as number[];
  switch (node[0]) {
    case 'Rational': case 'Divide': return values.length === 2 && values[1] !== 0 ? values[0]! / values[1]! : undefined;
    case 'Sqrt': return values.length === 1 && values[0]! >= 0 ? Math.sqrt(values[0]!) : undefined;
    case 'Negate': return values.length === 1 ? -values[0]! : undefined;
    case 'Add': return values.reduce((sum, value) => sum + value, 0);
    case 'Multiply': return values.reduce((product, value) => product * value, 1);
    case 'Power': return values.length === 2 ? values[0]! ** values[1]! : undefined;
    default: return undefined;
  }
}

export function buildGraphAnalysisCanonicalResult(
  request: GraphAnalysisRequestV1,
  evidence: GraphAnalysisEvidenceV1[],
) {
  const firstExact = reproveExact(evidence.flatMap((entry) => [
    exactValue(entry.coordinates?.x),
    exactValue(entry.coordinates?.y),
    exactValue(entry.coordinates?.z),
    exactValue(entry.relationValue),
  ]).find((value) => value !== undefined));
  const validated = evidence.filter((entry) => entry.level === 'numeric-validated').length;
  const provisional = evidence.filter((entry) => ![
    'exact-proved', 'numeric-validated',
  ].includes(entry.level)).length;
  return buildCanonicalResultDocument({
    outcomeKind: 'success',
    title: 'Graph analysis',
    ...(firstExact ? { primary: { kind: 'math' as const, value: firstExact } } : {}),
    details: [{
      title: 'Evidence',
      lines: [[{
        kind: 'text' as const,
        text: `${evidence.length} findings across ${request.items.length} selected item(s); ${validated} numerically validated.`,
      }]],
    }],
    warnings: provisional > 0
      ? [`${provisional} finding(s) are provisional or unsupported and cannot be pinned.`]
      : [],
  });
}
